"""
analytics/kmeans.py — Collections séparées : kmeans_runs + kmeans_labels
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from typing import Optional
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from db import (
    MONGO_AVAILABLE, 
    col_vehicle_features as feat, 
    col_kmeans_runs as runs_col, 
    col_kmeans_labels as labels_col
)

if not MONGO_AVAILABLE:
    print("MongoDB non disponible, arrêt.")
    sys.exit(1)

N_CLUSTERS = 3
FEATURES = [
    "start_x", "start_y", "end_x", "end_y",
    "distance", "total_time", "avg_speed", "num_stops"
]


def main(run_id: Optional[str] = None):
    q = {"run_id": run_id} if run_id else {}
    df = pd.DataFrame(list(feat.find(q, {"_id": 0})))

    if df.empty or any(c not in df.columns for c in FEATURES):
        print("[kmeans] Données insuffisantes")
        return
    if len(df) < N_CLUSTERS:
        print(f"[kmeans] Pas assez de véhicules ({len(df)})")
        return

    X = StandardScaler().fit_transform(df[FEATURES])
    km = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init="auto")
    df["label"] = km.fit_predict(X)

    counts = df.groupby("label").size().to_dict()

    centers = []
    for i in range(N_CLUSTERS):
        members = df[df["label"] == i]
        if not members.empty:
            centers.append({
                "cluster": i,
                "avg_speed": round(float(members["avg_speed"].mean()), 4),
                "lat": None,
                "lon": None,
                "count": int(len(members)),
            })

    runs_col.update_one(
        {"run_id": run_id},
        {"$set": {
            "run_id": run_id,
            "method": "KMeans",
            "n_clusters": N_CLUSTERS,
            "inertia": round(float(km.inertia_), 4),
            "counts": {str(k): int(v) for k, v in counts.items()},
            "n_vehicles": len(df),
            "centers": centers,
        }},
        upsert=True,
    )

    labels_col.delete_many({"run_id": run_id})
    labels_col.insert_many([
        {
            "run_id": run_id,
            "vehicle_id": row["vehicle_id"],
            "label": int(row["label"])
        }
        for _, row in df.iterrows()
    ])

    print(f"[kmeans] run={run_id} | clusters={N_CLUSTERS} | inertia={round(float(km.inertia_), 2)}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)