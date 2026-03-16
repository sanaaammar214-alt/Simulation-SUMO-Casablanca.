"""
main.py — API FastAPI SUMO Casa v3
Nouveautés :
  - GET /analysis/status/{run_id}  : état de la pipeline analytics
  - GET /analysis/{algo}/{run_id}  : résultats d'un algo précis
  - Lecture depuis les collections séparées par algo
"""
import logging
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("sumo_api")

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import API_HOST, API_PORT
from db import (
    MONGO_AVAILABLE,
    col_runs,
    col_trajectories,
    col_vehicle_features,
    col_kmeans_runs, col_kmeans_labels,
    col_dbscan_runs, col_dbscan_labels,
    col_hdbscan_runs, col_hdbscan_labels,
    col_spectral_runs, col_spectral_labels,
    col_st_runs, col_st_labels,
    col_traclus_runs, col_traclus_representatives, col_traclus_segments,
)
from simulation import sim, start_simulation, pause_simulation, stop_simulation

app = FastAPI(
    title="SUMO Casa API",
    description="Simulation trafic Casablanca — TraCI + clustering pipeline",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Algo → (runs_col, labels_col) mapping ────────────────────
_ALGO_COLS = {
    "kmeans":   (col_kmeans_runs,   col_kmeans_labels),
    "dbscan":   (col_dbscan_runs,   col_dbscan_labels),
    "hdbscan":  (col_hdbscan_runs,  col_hdbscan_labels),
    "spectral": (col_spectral_runs, col_spectral_labels),
    "st_dbscan":(col_st_runs,       col_st_labels),
}


# ─── Health ───────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "mongo": MONGO_AVAILABLE,
        "simulation_running": sim.running,
    }


# ─── Simulation ───────────────────────────────────────────────
@app.post("/start")
def route_start(
    n_vehicles: int = Query(default=50, ge=1, le=500),
    step_delay: float = Query(default=0.5, ge=0.05, le=10.0),
):
    if sim.running:
        raise HTTPException(status_code=400, detail="Simulation déjà en cours")
    try:
        run_id = start_simulation(n_vehicles, step_delay)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "started", "run_id": run_id,
            "n_vehicles": n_vehicles, "step_delay": step_delay}


@app.post("/pause")
def route_pause():
    paused = pause_simulation()
    return {"status": "paused" if paused else "resumed", "paused": paused}


@app.post("/stop")
def route_stop():
    run_id = stop_simulation()
    return {
        "status": "stopped",
        "run_id": run_id,
        "message": "Analytics pipeline démarrée en arrière-plan",
    }


# ─── État live ────────────────────────────────────────────────
@app.get("/state")
def route_state():
    return sim.snapshot()


@app.get("/stats")
def route_stats():
    snap = sim.snapshot()
    vehicles = snap["vehicles"]
    speeds = [v["speed"] for v in vehicles if v.get("speed") is not None]
    avg_speed  = round(sum(speeds) / len(speeds), 2) if speeds else 0
    max_speed  = round(max(speeds), 2) if speeds else 0
    min_speed  = round(min(speeds), 2) if speeds else 0
    congestion = round(len([s for s in speeds if s < 2]) / max(len(speeds), 1) * 100, 1)
    return {
        "running": snap["running"], "paused": snap["paused"],
        "mode": snap["mode"], "run_id": snap["run_id"],
        "step": snap["step"], "total_vehicles": len(vehicles),
        "avg_speed": avg_speed, "max_speed": max_speed,
        "min_speed": min_speed, "congestion_index": congestion,
    }


@app.get("/clustering")
def route_clustering():
    with sim.lock:
        result = sim._last_clustering
    if result is None:
        return {"available": False, "message": "Pas encore de clustering calculé"}
    return result


# ─── Analytics — status ───────────────────────────────────────
@app.get("/analysis/status/{run_id}")
def get_analysis_status(run_id: str):
    """
    Retourne l'état complet de la pipeline analytics pour un run.
    Champ analysis_status : pending | queued | running | done | failed
    Champ analysis_steps.<algo>.status : pending | running | done | failed
    """
    if not MONGO_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB non disponible")

    doc = col_runs.find_one(
        {"_id": run_id},
        {"_id": 0, "analysis_status": 1, "analysis_steps": 1,
         "started_at": 1, "ended_at": 1}
    )
    if not doc:
        raise HTTPException(status_code=404, detail=f"Run {run_id} introuvable")

    # Sérialisation des datetimes
    for k in ("started_at", "ended_at"):
        if doc.get(k):
            doc[k] = doc[k].isoformat()

    steps = doc.get("analysis_steps", {})
    for step in steps.values():
        for ts_field in ("started_at", "finished_at"):
            if step.get(ts_field):
                step[ts_field] = step[ts_field].isoformat()

    return {"run_id": run_id, **doc}


# ─── Analytics — TRACLUS ─────────────────────────────────────
@app.get("/analysis/traclus/{run_id}")
def get_traclus_results(
    run_id: str,
    limit_repr: int = Query(default=100, ge=1, le=1000),
    limit_seg:  int = Query(default=500, ge=1, le=5000),
):
    if not MONGO_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB non disponible")

    run_doc = col_traclus_runs.find_one({"run_id": run_id}, {"_id": 0})
    reprs   = list(col_traclus_representatives.find(
        {"run_id": run_id}, {"_id": 0}).sort("repr_id", 1).limit(limit_repr))
    segs    = list(col_traclus_segments.find(
        {"run_id": run_id}, {"_id": 0}).sort("segment_index", 1).limit(limit_seg))

    if not run_doc:
        raise HTTPException(status_code=404,
                            detail=f"Aucun résultat TRACLUS pour le run {run_id}")

    return {
        "run_id":          run_id,
        "algo":            "traclus",
        "summary":         run_doc,
        "representatives": reprs,
        "segments":        segs,
    }


# ─── Analytics — résultats par algo ──────────────────────────
@app.get("/analysis/{algo}/{run_id}")
def get_algo_results(algo: str, run_id: str,
                     limit: int = Query(default=500, ge=1, le=5000)):
    """
    Retourne les résultats d'un algo pour un run.
    algo : kmeans | dbscan | hdbscan | spectral | st_dbscan
    """
    if not MONGO_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB non disponible")
    if algo not in _ALGO_COLS:
        raise HTTPException(status_code=400,
                            detail=f"Algo inconnu. Choix : {list(_ALGO_COLS)}")

    runs_col, labels_col = _ALGO_COLS[algo]
    run_doc    = runs_col.find_one({"run_id": run_id}, {"_id": 0})
    label_docs = list(labels_col.find({"run_id": run_id}, {"_id": 0}).limit(limit))

    if not run_doc and not label_docs:
        raise HTTPException(status_code=404,
                            detail=f"Aucun résultat {algo} pour le run {run_id}")

    return {
        "run_id":  run_id,
        "algo":    algo,
        "summary": run_doc,
        "labels":  label_docs,
        "count":   len(label_docs),
    }


# ─── MongoDB — runs ───────────────────────────────────────────
@app.get("/mongo/runs")
def get_runs(limit: int = Query(default=10, ge=1, le=100)):
    if not MONGO_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB non disponible")

    runs = list(
        col_runs.find(
            {},
            {"_id": 1, "started_at": 1, "ended_at": 1, "mode": 1,
             "n_vehicles": 1, "total_steps": 1, "analysis_status": 1}
        ).sort("started_at", -1).limit(limit)
    )
    for r in runs:
        r["run_id"] = r.pop("_id")
        for k in ("started_at", "ended_at"):
            if r.get(k):
                r[k] = r[k].isoformat()

    return {"runs": runs, "count": len(runs)}


# ─── MongoDB — trajectoires ───────────────────────────────────
@app.get("/mongo/trajectories/{vehicle_id}")
def get_trajectory(
    vehicle_id: str,
    run_id: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=2000),
):
    if not MONGO_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB non disponible")
    q = {"vehicle_id": vehicle_id}
    if run_id:
        q["run_id"] = run_id
    docs = list(col_trajectories.find(q, {"_id": 0}).sort("time", 1).limit(limit))
    return {"vehicle_id": vehicle_id, "points": docs, "count": len(docs)}


# ─── MongoDB — features ───────────────────────────────────────
@app.get("/mongo/vehicle_features")
def get_all_features(
    run_id: Optional[str] = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
):
    if not MONGO_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB non disponible")
    q = {"run_id": run_id} if run_id else {}
    docs = list(col_vehicle_features.find(q, {"_id": 0}).limit(limit))
    return {"vehicle_features": docs, "count": len(docs)}


if __name__ == "__main__":
    import uvicorn
    try:
        log.info(f"Démarrage du serveur sur {API_HOST}:{API_PORT}...")
        uvicorn.run(app, host=API_HOST, port=API_PORT, reload=False)
    except Exception as e:
        log.error(f"Erreur fatale lors du lancement de uvicorn : {e}")
        import traceback
        log.error(traceback.format_exc())
    finally:
        log.info("Serveur arrêté.")