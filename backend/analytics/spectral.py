"""
analytics/spectral.py — Collections séparées : spectral_runs + spectral_labels
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from typing import Optional
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import SpectralClustering
from db import (
    MONGO_AVAILABLE, 
    col_vehicle_features as feat, 
    col_spectral_runs as runs_col, 
    col_spectral_labels as labels_col
)

if not MONGO_AVAILABLE:
    print("MongoDB non disponible, arrêt.")
    sys.exit(1)

N_CLUSTERS  = 4
N_NEIGHBORS = 8
FEATURES = ["start_x", "start_y", "end_x", "end_y",
            "distance", "total_time", "avg_speed", "num_stops"]


def main(run_id: Optional[str] = None):
    q = {"run_id": run_id} if run_id else {}
    df = pd.DataFrame(list(feat.find(q, {"_id": 0})))

    if df.empty or len(df) < N_CLUSTERS:
        print("[spectral] Données insuffisantes"); return

    X  = StandardScaler().fit_transform(df[FEATURES])
    nn = min(N_NEIGHBORS, max(1, len(df) - 1))
    sc = SpectralClustering(
        n_clusters=N_CLUSTERS, affinity="nearest_neighbors",
        n_neighbors=nn, assign_labels="kmeans", random_state=42
    )
    df["label"] = sc.fit_predict(X)
    counts = df.groupby("label").size().to_dict()

    runs_col.update_one(
        {"run_id": run_id},
        {"$set": {
            "run_id":     run_id,
            "method":     "SpectralClustering",
            "n_clusters": N_CLUSTERS,
            "n_neighbors": nn,
            "counts":     {str(k): int(v) for k, v in counts.items()},
            "n_vehicles": len(df),
        }},
        upsert=True,
    )

    labels_col.delete_many({"run_id": run_id})
    labels_col.insert_many([
        {"run_id": run_id, "vehicle_id": row["vehicle_id"], "label": int(row["label"])}
        for _, row in df.iterrows()
    ])

    print(f"[spectral] run={run_id} | clusters={N_CLUSTERS}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)