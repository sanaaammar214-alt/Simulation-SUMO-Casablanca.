"""
analytics/st_dbscan.py — Collections séparées : st_dbscan_runs + st_dbscan_labels
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from typing import Optional
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import euclidean_distances
from db import (
    MONGO_AVAILABLE, 
    col_trajectories as traj, 
    col_st_runs as runs_col, 
    col_st_labels as labels_col
)

if not MONGO_AVAILABLE:
    print("MongoDB non disponible, arrêt.")
    sys.exit(1)

EPS_SPACE = 120.0
EPS_TIME = 8.0
MIN_SAMPLES = 5
MAX_PTS = 15_000

def main(run_id: Optional[str] = None):
    q = {"run_id": run_id} if run_id else {}
    # On utilise 'time' qui est le champ stocké dans MongoDB (simulation.py:207)
    df = pd.DataFrame(list(
        traj.find(q, {"_id": 0, "vehicle_id": 1, "time": 1, "x": 1, "y": 1})
    ))

    if df.empty or len(df) < MIN_SAMPLES:
        print("[st_dbscan] Données insuffisantes")
        return
    if len(df) > MAX_PTS:
        print(f"[st_dbscan] ⚠️  {len(df)} points — RAM importante requise")

    # Normalisation pour utiliser la distance de Chebyshev (L-infinity)
    # distance = max(|x1-x2|/eps_s, |y1-y2|/eps_s, |t1-t2|/eps_t)
    # C'est équivalent à max(spatial_dist/eps_s, temporal_dist/eps_t)
    X_normalized = df[["x", "y"]].to_numpy(float) / EPS_SPACE
    T_normalized = df["time"].to_numpy(float).reshape(-1, 1) / EPS_TIME
    ST_features = np.hstack([X_normalized, T_normalized])

    # Utilisation de Chebyshev avec un index spatial (BallTree par défaut dans sklearn)
    # ce qui est O(N log N) en mémoire et temps au lieu de O(N^2)
    df["label"] = DBSCAN(
        eps=1.0, min_samples=MIN_SAMPLES, metric="chebyshev"
    ).fit_predict(ST_features)

    n_clusters = len(set(df["label"]) - {-1})
    n_noise = int((df["label"] == -1).sum())

    runs_col.update_one(
        {"run_id": run_id},
        {"$set": {
            "run_id": run_id,
            "method": "ST-DBSCAN",
            "eps_space": EPS_SPACE,
            "eps_time": EPS_TIME,
            "min_samples": MIN_SAMPLES,
            "n_points": len(df),
            "n_clusters": n_clusters,
            "n_noise": n_noise,
        }},
        upsert=True,
    )

    labels_col.delete_many({"run_id": run_id})
    veh_docs = []
    for vid, grp in df.groupby("vehicle_id"):
        labels = grp["label"].tolist()
        non_noise = [x for x in labels if x != -1]
        dominant = int(pd.Series(non_noise).mode().iloc[0]) if non_noise else -1
        noise_r = round(float((grp["label"] == -1).mean()), 4)

        veh_docs.append({
            "run_id": run_id,
            "vehicle_id": str(vid),
            "label": dominant,
            "dominant_label": dominant,
            "noise_ratio": noise_r,
            "n_points": len(grp),
            "is_noise": dominant == -1,
        })

    if veh_docs:
        labels_col.insert_many(veh_docs)

    print(f"[st_dbscan] run={run_id} | clusters={n_clusters} | bruit={n_noise}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)