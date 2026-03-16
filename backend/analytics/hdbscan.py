"""
analytics/hdbscan.py — Collections séparées : hdbscan_runs + hdbscan_labels
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from typing import Optional
import pandas as pd
from sklearn.preprocessing import StandardScaler
from db import (
    MONGO_AVAILABLE, 
    col_vehicle_features as feat, 
    col_hdbscan_runs as runs_col, 
    col_hdbscan_labels as labels_col
)

if not MONGO_AVAILABLE:
    print("MongoDB non disponible, arrêt.")
    sys.exit(1)

MIN_CLUSTER_SIZE = 2
MIN_SAMPLES      = 1
FEATURES = ["start_x", "start_y", "end_x", "end_y",
            "distance", "total_time", "avg_speed", "num_stops"]

try:
    from sklearn.cluster import HDBSCAN
    def _make(mcs, ms): return HDBSCAN(min_cluster_size=mcs, min_samples=ms, metric="euclidean")
except ImportError:
    import hdbscan as _h
    def _make(mcs, ms): return _h.HDBSCAN(min_cluster_size=mcs, min_samples=ms, metric="euclidean")


def main(run_id: Optional[str] = None):
    q = {"run_id": run_id} if run_id else {}
    df = pd.DataFrame(list(feat.find(q, {"_id": 0})))

    if df.empty or any(c not in df.columns for c in FEATURES):
        print("[hdbscan] Données insuffisantes"); return

    X  = StandardScaler().fit_transform(df[FEATURES])
    cl = _make(MIN_CLUSTER_SIZE, MIN_SAMPLES)
    df["label"] = cl.fit_predict(X)

    has_prob = hasattr(cl, "probabilities_")
    if has_prob:
        df["probability"] = cl.probabilities_

    n_clusters = len(set(df["label"]) - {-1})
    n_noise    = int((df["label"] == -1).sum())
    avg_prob   = round(float(df["probability"].mean()), 4) if has_prob else None

    runs_col.update_one(
        {"run_id": run_id},
        {"$set": {
            "run_id":          run_id,
            "method":          "HDBSCAN",
            "min_cluster_size": MIN_CLUSTER_SIZE,
            "min_samples":     MIN_SAMPLES,
            "n_clusters":      n_clusters,
            "n_noise":         n_noise,
            "avg_probability": avg_prob,
            "n_vehicles":      len(df),
        }},
        upsert=True,
    )

    labels_col.delete_many({"run_id": run_id})
    docs = []
    for _, row in df.iterrows():
        doc = {
            "run_id": run_id,
            "vehicle_id": row["vehicle_id"],
            "label": int(row["label"]),
            "is_noise": int(row["label"]) == -1,
        }
        if has_prob:
            doc["probability"] = round(float(row["probability"]), 4)
        docs.append(doc)
    labels_col.insert_many(docs)

    print(f"[hdbscan] run={run_id} | clusters={n_clusters} | bruit={n_noise}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)