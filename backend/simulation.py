"""
simulation.py — Gestion de l'état SUMO et du thread de simulation
Modifications :
  - attend la vidange de la queue Mongo avant de lancer analytics
  - initialise analysis_status/analysis_steps
  - déclenche la pipeline analytics en background seulement après flush Mongo
"""
import logging
import os
import random
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Optional, List

from config import (
    SUMO_HOME,
    SUMO_CFG,
    NET_FILE,
    TRIPS_FILE,
    ROUTES_FILE,
    DEFAULT_N_VEHICLES,
    DEFAULT_STEP_DELAY,
    CLUSTER_EVERY_N_STEPS,
    MAX_TRAIL_POINTS,
    ROUTE_DEPART_DURATION,
)
from db import (
    MONGO_AVAILABLE,
    enqueue,
    wait_for_queue,
    col_trajectories,
    col_vehicle_features,
    col_runs,
)

log = logging.getLogger("sumo_api")

# ─── TraCI ────────────────────────────────────────────────────
os.environ.setdefault("SUMO_HOME", SUMO_HOME)
try:
    tools_path = os.path.join(SUMO_HOME, "tools")
    if tools_path not in sys.path:
        sys.path.insert(0, tools_path)
    import traci
    import sumolib
    TRACI_AVAILABLE = True
    log.info("TraCI et sumolib importés avec succès")
except ImportError:
    TRACI_AVAILABLE = False
    log.warning("TraCI non disponible — mode simulation fictive activé")


# ─── SimulationState ──────────────────────────────────────────
class SimulationState:
    def __init__(self):
        self.running: bool = False
        self.paused: bool = False
        self.step: int = 0
        self.mode: str = "idle"
        self.run_id: Optional[str] = None
        self.vehicles: Dict[str, dict] = {}
        self.trails: Dict[str, List[dict]] = {}
        self.lock = threading.Lock()
        self.thread: Optional[threading.Thread] = None
        self.traci_active: bool = False
        self._last_clustering: Optional[dict] = None

    def reset(self):
        with self.lock:
            self.running = False
            self.paused = False
            self.step = 0
            self.mode = "idle"
            self.run_id = None
            self.vehicles = {}
            self.trails = {}
            self._last_clustering = None
            self.thread = None
            self.traci_active = False

    def snapshot(self) -> dict:
        with self.lock:
            return {
                "running": self.running,
                "paused": self.paused,
                "step": self.step,
                "mode": self.mode,
                "run_id": self.run_id,
                "vehicles": list(self.vehicles.values()),
                "trails": self.trails,
                "clustering": self._last_clustering,
            }


sim = SimulationState()


# ─── Helpers coords ───────────────────────────────────────────
def xy_to_latlon(x: float, y: float):
    if TRACI_AVAILABLE and sim.traci_active:
        lon, lat = traci.simulation.convertGeo(x, y)
        return float(lat), float(lon)
    return None, None


# ─── Génération de routes ─────────────────────────────────────
def _generate_routes(n_vehicles: int, run_id: str) -> bool:
    try:
        randomtrips = os.path.join(SUMO_HOME, "tools", "randomTrips.py")
        duarouter_bin = os.path.join(SUMO_HOME, "bin", "duarouter.exe" if os.name == "nt" else "duarouter")
        
        if not os.path.exists(randomtrips):
            log.error(f"randomTrips.py introuvable : {randomtrips}")
            return False

        depart_duration = max(10, ROUTE_DEPART_DURATION)
        period = max(0.2, depart_duration / max(1, n_vehicles))

        # 1. randomTrips
        log.info(f"Génération des trajets via {randomtrips}...")
        subprocess.run(
            [sys.executable, randomtrips,
             "-n", NET_FILE, "-o", TRIPS_FILE,
             "-b", "0", "-e", str(depart_duration),
             "--period", str(period), "--random-depart"],
            check=True, capture_output=True, text=True,
        )

        # 2. duarouter
        log.info(f"Génération des routes via {duarouter_bin}...")
        subprocess.run(
            [duarouter_bin, "-n", NET_FILE, "-t", TRIPS_FILE,
             "-o", ROUTES_FILE, "--ignore-errors"],
            check=True, capture_output=True, text=True,
        )
        log.info(f"Routes générées : {n_vehicles} véhicules | fichier={ROUTES_FILE}")
        return True
    except subprocess.CalledProcessError as e:
        log.error(f"Erreur génération routes (code {e.returncode}): {e.stderr or e}")
        return False
    except Exception as e:
        log.error(f"Erreur génération routes : {e}")
        return False


def _append_trail(vehicle_id: str, lat: float, lon: float):
    if lat is None or lon is None:
        return
    trail = sim.trails.setdefault(vehicle_id, [])
    trail.append({"lat": round(lat, 6), "lon": round(lon, 6)})
    if len(trail) > MAX_TRAIL_POINTS:
        del trail[:-MAX_TRAIL_POINTS]


def _inject_cluster_labels(vehicles: Dict[str, dict], clustering_result: Optional[dict]):
    if not clustering_result or not clustering_result.get("available"):
        return
    algos  = clustering_result.get("algos", {})
    kmeans = algos.get("kmeans", {})
    dbscan = algos.get("dbscan", {})
    km_map = dict(zip(kmeans.get("ids", []), kmeans.get("labels", [])))
    db_map = dict(zip(dbscan.get("ids",  []), dbscan.get("labels", [])))
    for vid, v in vehicles.items():
        v["cluster_kmeans_live"] = km_map.get(vid)
        v["cluster_dbscan_live"] = db_map.get(vid)


# ─── Finalisation + déclenchement analytics ───────────────────
def _finalize_run(run_id: str):
    """
    Appelé à la fin de chaque run (thread SUMO ou fake).
    1. Met à jour simulation_runs avec ended_at et total_steps.
    2. Initialise analysis_status = "queued".
    3. Attend que toutes les écritures Mongo trajectories soient terminées.
    4. Lance la pipeline analytics en background.
    """
    if not MONGO_AVAILABLE or not run_id:
        return

    col_runs.update_one(
        {"_id": run_id},
        {"$set": {
            "ended_at": datetime.now(timezone.utc),
            "total_steps": sim.step,
            "analysis_status": "queued",
            "analysis_error": None,
            "analysis_steps": {
                algo: {"status": "pending"}
                for algo in [
                    "compute_features",
                    "kmeans",
                    "dbscan",
                    "hdbscan",
                    "spectral",
                    "st_dbscan",
                    "traclus",
                ]
            },
        }},
    )

    ok = wait_for_queue(timeout=60.0)
    if not ok:
        col_runs.update_one(
            {"_id": run_id},
            {"$set": {
                "analysis_status": "failed",
                "analysis_error": "Timeout en attente des écritures MongoDB",
            }}
        )
        log.error(f"Run {run_id} — timeout en attente de la queue MongoDB")
        return

    log.info(f"Run {run_id} finalisé — lancement analytics")

    from analytics.runner import launch_in_background
    launch_in_background(run_id, col_runs)


# ─── Thread SUMO TraCI ────────────────────────────────────────
def _run_traci(n_vehicles: int, step_delay: float, run_id: str):
    try:
        sumo_bin = os.path.join(SUMO_HOME, "bin", "sumo.exe" if os.name == "nt" else "sumo")
        sumo_cmd = [sumo_bin, "-c", SUMO_CFG, "-r", ROUTES_FILE,
                    "--no-warnings", "--start"]
        traci.start(sumo_cmd)
        sim.traci_active = True

        with sim.lock:
            sim.mode = "traci"
            sim.running = True

        if MONGO_AVAILABLE:
            col_runs.update_one({"_id": run_id}, {"$set": {"mode": "traci"}})

        log.info(f"SUMO démarré ({n_vehicles} véhicules) : {SUMO_CFG}")
        cluster_counter = 0

        while True:
            with sim.lock:
                if not sim.running:
                    break
                paused = sim.paused

            if paused:
                time.sleep(0.1)
                continue

            traci.simulationStep()
            veh_ids = traci.vehicle.getIDList()
            vehicles = {}
            traj_docs = []

            for vid in veh_ids:
                x, y = traci.vehicle.getPosition(vid)
                speed = traci.vehicle.getSpeed(vid)
                angle = traci.vehicle.getAngle(vid)
                vtype = traci.vehicle.getTypeID(vid)
                lat, lon = xy_to_latlon(x, y)
                if lat is None or lon is None:
                    continue

                vehicles[vid] = {
                    "id": vid,
                    "lat": round(lat, 6), "lon": round(lon, 6),
                    "speed": round(float(speed), 2),
                    "angle": round(float(angle), 1),
                    "type": vtype,
                    "x": round(float(x), 2), "y": round(float(y), 2),
                }
                _append_trail(vid, lat, lon)
                vehicles[vid]["trail"] = sim.trails.get(vid, [])

                if MONGO_AVAILABLE:
                    traj_docs.append({
                        "run_id": run_id,
                        "vehicle_id": vid,
                        "time": sim.step,
                        "x": float(x),
                        "y": float(y),
                        "lat": float(lat),
                        "lon": float(lon),
                        "speed": float(speed),
                        "angle": float(angle),
                        "type": vtype,
                    })

            cluster_counter += 1
            clustering_result = None
            if cluster_counter >= 3 and len(vehicles) >= 2:
                cluster_counter = 0
                from clustering_live import compute_live_clustering
                clustering_result = compute_live_clustering(list(vehicles.values()))
            else:
                with sim.lock:
                    clustering_result = sim._last_clustering

            _inject_cluster_labels(vehicles, clustering_result)

            with sim.lock:
                sim.vehicles = vehicles
                sim.step += 1
                if clustering_result is not None:
                    sim._last_clustering = clustering_result

            if MONGO_AVAILABLE and traj_docs:
                enqueue(col_trajectories.insert_many, traj_docs)

            time.sleep(step_delay)

    except Exception as e:
        log.error(f"Erreur thread SUMO : {e}")

    finally:
        if sim.traci_active:
            try:
                traci.close()
            except Exception:
                pass
            sim.traci_active = False

        _finalize_run(run_id)
        log.info(f"Thread SUMO terminé — run {run_id}")


# ─── Thread simulation fictive ────────────────────────────────
def _run_fake(n_vehicles: int, step_delay: float, run_id: str):
    vehicles = {}
    for i in range(n_vehicles):
        lat = 33.5883 + random.uniform(-0.03, 0.03)
        lon = -7.6114 + random.uniform(-0.03, 0.03)
        vtype = random.choice(["car", "bus", "truck", "motorbike"])
        vehicles[f"veh_{i}"] = {
            "id": f"veh_{i}",
            "lat": round(lat, 6), "lon": round(lon, 6),
            "speed": round(random.uniform(0, 20), 2),
            "angle": round(random.uniform(0, 360), 1),
            "type": vtype, "x": 1000.0, "y": 1000.0,
        }
        sim.trails[f"veh_{i}"] = [{"lat": round(lat, 6), "lon": round(lon, 6)}]

    with sim.lock:
        sim.mode = "simulation"
        sim.running = True

    cluster_counter = 0
    while True:
        with sim.lock:
            if not sim.running:
                break
            paused = sim.paused

        if paused:
            time.sleep(0.1)
            continue

        for vid, v in vehicles.items():
            v["lat"] = round(v["lat"] + random.uniform(-0.0003, 0.0003), 6)
            v["lon"] = round(v["lon"] + random.uniform(-0.0003, 0.0003), 6)
            v["speed"] = round(max(0, v["speed"] + random.uniform(-1, 1)), 2)
            v["angle"] = round((v["angle"] + random.uniform(-10, 10)) % 360, 1)
            _append_trail(vid, v["lat"], v["lon"])
            v["trail"] = sim.trails.get(vid, [])

        cluster_counter += 1
        clustering_result = None
        if cluster_counter >= CLUSTER_EVERY_N_STEPS and len(vehicles) >= 3:
            cluster_counter = 0
            from clustering_live import compute_live_clustering
            clustering_result = compute_live_clustering(list(vehicles.values()))
        else:
            with sim.lock:
                clustering_result = sim._last_clustering

        _inject_cluster_labels(vehicles, clustering_result)

        with sim.lock:
            sim.vehicles = dict(vehicles)
            sim.step += 1
            if clustering_result is not None:
                sim._last_clustering = clustering_result

        time.sleep(step_delay)

    _finalize_run(run_id)


# ─── API publique ─────────────────────────────────────────────
def start_simulation(
    n_vehicles: int = DEFAULT_N_VEHICLES,
    step_delay: float = DEFAULT_STEP_DELAY
) -> str:
    if sim.running:
        raise RuntimeError("Simulation déjà en cours")

    run_id = datetime.now().strftime("run_%Y%m%d_%H%M%S")

    with sim.lock:
        sim.run_id = run_id
        sim.step = 0
        sim.vehicles = {}
        sim.trails = {}
        sim.paused = False
        sim._last_clustering = None

    if MONGO_AVAILABLE:
        col_trajectories.delete_many({"run_id": run_id})
        col_vehicle_features.delete_many({"run_id": run_id})
        col_runs.insert_one({
            "_id": run_id,
            "started_at": datetime.now(timezone.utc),
            "mode": "pending",
            "n_vehicles": n_vehicles,
            "step_delay": step_delay,
            "analysis_status": "pending",
            "analysis_error": None,
            "analysis_steps": {},
        })

    if TRACI_AVAILABLE and os.path.exists(SUMO_CFG):
        ok = _generate_routes(n_vehicles, run_id)
        target = _run_traci if ok else _run_fake
    else:
        target = _run_fake

    sim.thread = threading.Thread(
        target=target,
        args=(n_vehicles, step_delay, run_id),
        daemon=True,
        name="sim-thread",
    )
    sim.thread.start()
    log.info(f"Simulation lancée : {run_id} ({n_vehicles} véhicules)")
    return run_id


def pause_simulation():
    with sim.lock:
        sim.paused = not sim.paused
        return sim.paused


def stop_simulation() -> Optional[str]:
    with sim.lock:
        run_id = sim.run_id
        sim.running = False
        thread = sim.thread

    if thread:
        thread.join(timeout=5)

    sim.reset()
    log.info(f"Simulation arrêtée : {run_id}")
    return run_id