"""
analytics/dbscan.py — Collections séparées : dbscan_runs + dbscan_labels
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from typing import Optional
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
from db import (
    MONGO_AVAILABLE, 
    col_vehicle_features as feat, 
    col_dbscan_runs as runs_col, 
    col_dbscan_labels as labels_col
)

if not MONGO_AVAILABLE:
    print("MongoDB non disponible, arrêt.")
    sys.exit(1)

EPS         = 1.5
MIN_SAMPLES = 2
FEATURES = ["start_x", "start_y", "end_x", "end_y",
            "distance", "total_time", "avg_speed", "num_stops"]


def main(run_id: Optional[str] = None):
    q = {"run_id": run_id} if run_id else {}
    df = pd.DataFrame(list(feat.find(q, {"_id": 0})))

    if df.empty or any(c not in df.columns for c in FEATURES):
        print("[dbscan] Données insuffisantes"); return

    X = StandardScaler().fit_transform(df[FEATURES])
    db_model = DBSCAN(eps=EPS, min_samples=MIN_SAMPLES)
    df["label"] = db_model.fit_predict(X)

    n_clusters = len(set(df["label"]) - {-1})
    n_noise    = int((df["label"] == -1).sum())

    runs_col.update_one(
        {"run_id": run_id},
        {"$set": {
            "run_id":     run_id,
            "method":     "DBSCAN",
            "eps":        EPS,
            "min_samples": MIN_SAMPLES,
            "n_clusters": n_clusters,
            "n_noise":    n_noise,
            "n_vehicles": len(df),
        }},
        upsert=True,
    )

    labels_col.delete_many({"run_id": run_id})
    labels_col.insert_many([
        {"run_id": run_id, "vehicle_id": row["vehicle_id"],
         "label": int(row["label"]), "is_noise": int(row["label"]) == -1}
        for _, row in df.iterrows()
    ])

    print(f"[dbscan] run={run_id} | clusters={n_clusters} | bruit={n_noise}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)