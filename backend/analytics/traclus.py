"""analytics/traclus.py"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from typing import Optional, Any
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from config import SUMO_HOME, NET_FILE, CASA_LAT, CASA_LON
from db import (
    MONGO_AVAILABLE,
    col_trajectories as traj,
    col_traclus_runs as tr_runs,
    col_traclus_representatives as tr_repr,
    col_traclus_segments as tr_segments
)

if not MONGO_AVAILABLE:
    print("MongoDB non disponible, arrêt.")
    sys.exit(1)

# ── Import TRACLUS ────────────────────────────────────────────
try:
    import traclus_python as tr
except ImportError:
    try:
        import traclus as tr
    except ImportError:
        tr = None

# ── Constantes TRACLUS ────────────────────────────────────────
RUN_ID       = None          # Override par runner.py via mod.RUN_ID = run_id
MIN_PTS      = 3             # Minimum de points par trajectoire
SUB_SAMPLE   = 50            # Sous-échantillonnage pour les longues trajectoires
DIRECTIONAL  = True
WEIGHTS      = (1.0, 1.0, 1.0)  # (perpendicular, parallel, angle)
EPS          = 25.0
MIN_SAMPLES  = 2


def sub_sample_trajectory(pts, sample_n=50):
    """Sous-échantillonne uniformément une trajectoire à sample_n points."""
    n = len(pts)
    if n <= sample_n:
        return pts.tolist() if hasattr(pts, "tolist") else list(pts)
    indices = [int(i * (n - 1) / (sample_n - 1)) for i in range(sample_n)]
    return [pts[i].tolist() if hasattr(pts[i], "tolist") else list(pts[i]) for i in indices]


# ── Conversion XY -> lat/lon via sumolib si disponible ───────
os.environ.setdefault("SUMO_HOME", SUMO_HOME)
_NET = None
try:
    sys.path.append(os.path.join(SUMO_HOME, "tools"))
    import sumolib  # type: ignore
    _NET = sumolib.net.readNet(NET_FILE)
except Exception:
    _NET = None


def xy_to_latlon(x: float, y: float):
    if _NET is not None:
        try:
            lon, lat = _NET.convertXY2LonLat(x, y)
            return [float(lat), float(lon)]
        except Exception:
            pass
    
    # ── Fallback approximatif pour Casablanca ───────────────────
    # Estimation locale des degrés par mètre (Casablanca lat ~33.5)
    # 1 deg lat ~ 110900 m | 1 deg lon ~ 111300 * cos(lat) ~ 92600 m
    lat_offset = (y - 5000) / 110900.0
    lon_offset = (x - 5000) / 92600.0
    return [33.5883 + lat_offset, -7.6114 + lon_offset]


def trajectory_xy_to_latlon(points):
    return [xy_to_latlon(float(p[0]), float(p[1])) for p in points]


def to_json(obj: Any) -> Any:
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, (list, tuple)):
        return [to_json(x) for x in obj]
    if isinstance(obj, dict):
        return {str(k): to_json(v) for k, v in obj.items()}
    if hasattr(obj, "tolist"):
        try:
            return obj.tolist()
        except Exception:
            pass
    if hasattr(obj, "__dict__"):
        try:
            return to_json(vars(obj))
        except Exception:
            pass
    return str(obj)


def main(run_id: Optional[str] = None):
    global RUN_ID
    RUN_ID = run_id or RUN_ID

    if tr is None:
        raise ImportError(
            "La bibliothèque TRACLUS n'est pas installée. "
            "Exécutez : pip install traclus-python --break-system-packages"
        )

    q = {"run_id": RUN_ID} if RUN_ID else {}
    df = pd.DataFrame(list(
        traj.find(q, {"_id": 0, "vehicle_id": 1, "time": 1, "x": 1, "y": 1})
        .sort([("vehicle_id", 1), ("time", 1)])
    ))

    if df.empty:
        print("Aucune trajectoire")
        return

    trajectories = []
    vids = []

    for vid, grp in df.groupby("vehicle_id"):
        pts = grp[["x", "y"]].dropna().to_numpy(float)
        if len(pts) < MIN_PTS:
            continue

        if len(pts) > SUB_SAMPLE:
            pts = np.array(sub_sample_trajectory(pts, sample_n=SUB_SAMPLE), dtype=float)

        if len(pts) >= MIN_PTS:
            trajectories.append(pts)
            vids.append(str(vid))

    if len(trajectories) < 2:
        print("Pas assez de trajectoires")
        return

    # ── Appel TRACLUS robuste selon version installée ─────────
    try:
        result = tr.traclus(
            trajectories,
            directional=DIRECTIONAL,
            weights=WEIGHTS,
            eps=EPS,
            min_samples=MIN_SAMPLES,
        )
    except TypeError:
        try:
            result = tr.traclus(
                trajectories,
                directional=DIRECTIONAL,
                weights=WEIGHTS,
                clustering_algorithm=DBSCAN(eps=EPS, min_samples=MIN_SAMPLES),
            )
        except TypeError:
            result = tr.traclus(trajectories, directional=DIRECTIONAL)

    partitions, segments, _, clusters, assignments, representatives = result

    tr_runs.update_one(
        {"run_id": RUN_ID},
        {"$set": {
            "run_id": RUN_ID,
            "method": "TRACLUS",
            "eps": EPS,
            "min_samples": MIN_SAMPLES,
            "directional": DIRECTIONAL,
            "weights": WEIGHTS,
            "n_vehicle_trajectories": len(vids),
            "n_segments": len(segments) if hasattr(segments, "__len__") else None,
            "n_clusters": len(clusters) if hasattr(clusters, "__len__") else None,
            "n_representative_trajectories": (
                len(representatives) if hasattr(representatives, "__len__") else None
            ),
        }},
        upsert=True,
    )

    tr_repr.delete_many({"run_id": RUN_ID})
    repr_docs = []
    for i, t in enumerate(representatives):
        xy_points = to_json(t)
        latlon_points = trajectory_xy_to_latlon(t)
        repr_docs.append({
            "run_id": RUN_ID,
            "repr_id": i,
            "trajectory": latlon_points,
            "trajectory_latlon": latlon_points,
            "trajectory_xy": xy_points,
        })
    if repr_docs:
        tr_repr.insert_many(repr_docs)

    tr_segments.delete_many({"run_id": RUN_ID})
    seg_list = list(segments)
    asgn = list(assignments)
    seg_docs = []
    for i, seg in enumerate(seg_list):
        xy_seg = to_json(seg)
        latlon_seg = trajectory_xy_to_latlon(seg)
        seg_docs.append({
            "run_id": RUN_ID,
            "segment_index": i,
            "segment": latlon_seg,
            "segment_latlon": latlon_seg,
            "segment_xy": xy_seg,
            "cluster_assignment": to_json(asgn[i]) if i < len(asgn) else None,
        })
    if seg_docs:
        tr_segments.insert_many(seg_docs)

    print(
        f"TRACLUS terminé | trajectoires={len(vids)} | "
        f"segments={len(seg_list)} | repr={len(representatives)}"
    )


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)