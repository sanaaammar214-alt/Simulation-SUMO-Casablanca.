"""
analytics/compute_features.py
Calcule les features par véhicule depuis MongoDB (trajectories → vehicle_features).
Compatible avec analytics_runner (main(run_id)) et appel direct CLI.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from math import sqrt
from typing import List, Dict, Optional
from db import MONGO_AVAILABLE, col_trajectories as traj, col_vehicle_features as feat

if not MONGO_AVAILABLE:
    print("MongoDB non disponible, arrêt.")
    sys.exit(1)

STOP_SPEED_THRESHOLD = 0.5


def compute(points: List[Dict]) -> Optional[Dict]:
    if len(points) < 2:
        return None
    speeds = [float(p["speed"]) for p in points]
    total_time = float(points[-1]["time"] - points[0]["time"])
    distance = sum(
        sqrt((float(points[i]["x"]) - float(points[i-1]["x"]))**2 +
             (float(points[i]["y"]) - float(points[i-1]["y"]))**2)
        for i in range(1, len(points))
    )
    result = {
        "start_x":    round(float(points[0]["x"]),  4),
        "start_y":    round(float(points[0]["y"]),  4),
        "end_x":      round(float(points[-1]["x"]), 4),
        "end_y":      round(float(points[-1]["y"]), 4),
        "distance":   round(distance, 4),
        "total_time": round(max(total_time, 0.0), 4),
        "avg_speed":  round(sum(speeds) / len(speeds), 4),
        "num_stops":  sum(1 for s in speeds if s < STOP_SPEED_THRESHOLD),
    }
    if "type" in points[0]:
        result["type"] = points[0]["type"]
    return result


def main(run_id: Optional[str] = None):
    q = {"run_id": run_id} if run_id else {}

    if traj.count_documents(q) == 0:
        print(f"Aucune trajectoire pour run_id={run_id}")
        return

    # Nettoie les features existantes pour éviter les doublons
    deleted = feat.delete_many(q)
    print(f"Features précédentes supprimées : {deleted.deleted_count}")

    vids = traj.distinct("vehicle_id", q)
    ok, skip = 0, 0

    for vid in vids:
        pts = list(
            traj.find({"vehicle_id": vid, **q}, {"_id": 0})
            .sort("time", 1)
        )
        pts = [p for p in pts if all(k in p for k in ("time", "x", "y", "speed"))]
        f = compute(pts)
        if f is None:
            skip += 1
            continue

        doc = {"vehicle_id": vid, **f}
        if run_id:
            doc["run_id"] = run_id

        filter_q = {"vehicle_id": vid}
        if run_id:
            filter_q["run_id"] = run_id

        feat.update_one(filter_q, {"$set": doc}, upsert=True)
        ok += 1

    print(f"[compute_features] run={run_id} | traités={ok} | ignorés={skip}")


# ── CLI ──────────────────────────────────────────────────────
if __name__ == "__main__":
    _run_id = sys.argv[1] if len(sys.argv) > 1 else None
    main(_run_id)