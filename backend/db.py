"""
db.py — Connexion MongoDB et collections centralisées
"""
import logging
import queue
import threading

from pymongo import MongoClient, ASCENDING
from config import MONGO_URI, MONGO_DB

log = logging.getLogger("sumo_api")

try:
    _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    _client.admin.command("ping")
    _db = _client[MONGO_DB]

    # ── Collections de base ──────────────────────────────────
    col_runs = _db["simulation_runs"]
    col_trajectories = _db["trajectories"]
    col_vehicle_features = _db["vehicle_features"]

    # ── KMeans ───────────────────────────────────────────────
    col_kmeans_runs = _db["kmeans_runs"]
    col_kmeans_labels = _db["kmeans_labels"]

    # ── DBSCAN ───────────────────────────────────────────────
    col_dbscan_runs = _db["dbscan_runs"]
    col_dbscan_labels = _db["dbscan_labels"]

    # ── HDBSCAN ──────────────────────────────────────────────
    col_hdbscan_runs = _db["hdbscan_runs"]
    col_hdbscan_labels = _db["hdbscan_labels"]

    # ── Spectral ─────────────────────────────────────────────
    col_spectral_runs = _db["spectral_runs"]
    col_spectral_labels = _db["spectral_labels"]

    # ── ST-DBSCAN ────────────────────────────────────────────
    col_st_runs = _db["st_dbscan_runs"]
    col_st_labels = _db["st_dbscan_labels"]

    # ── TRACLUS ──────────────────────────────────────────────
    col_traclus_runs = _db["traclus_runs"]
    col_traclus_representatives = _db["traclus_representatives"]
    col_traclus_segments = _db["traclus_segments"]

    # Alias compatibilité ancien code
    col_traclus_repr = col_traclus_representatives

    # ── Index ────────────────────────────────────────────────
    col_trajectories.create_index(
        [("run_id", ASCENDING), ("vehicle_id", ASCENDING), ("time", ASCENDING)]
    )
    col_vehicle_features.create_index(
        [("run_id", ASCENDING), ("vehicle_id", ASCENDING)], unique=True
    )
    col_runs.create_index([("started_at", ASCENDING)])

    for col in (
        col_kmeans_runs,
        col_dbscan_runs,
        col_hdbscan_runs,
        col_spectral_runs,
        col_st_runs,
        col_traclus_runs,
    ):
        col.create_index([("run_id", ASCENDING)], unique=True)

    for col in (
        col_kmeans_labels,
        col_dbscan_labels,
        col_hdbscan_labels,
        col_spectral_labels,
        col_st_labels,
    ):
        col.create_index([("run_id", ASCENDING), ("vehicle_id", ASCENDING)], unique=True)

    col_traclus_representatives.create_index(
        [("run_id", ASCENDING), ("repr_id", ASCENDING)], unique=True
    )
    col_traclus_segments.create_index(
        [("run_id", ASCENDING), ("segment_index", ASCENDING)], unique=True
    )

    MONGO_AVAILABLE = True
    log.info(f"MongoDB connecté — base : {MONGO_DB}")

except Exception as e:
    MONGO_AVAILABLE = False
    log.warning(f"MongoDB non disponible : {e}")

    col_runs = col_trajectories = col_vehicle_features = None
    col_kmeans_runs = col_kmeans_labels = None
    col_dbscan_runs = col_dbscan_labels = None
    col_hdbscan_runs = col_hdbscan_labels = None
    col_spectral_runs = col_spectral_labels = None
    col_st_runs = col_st_labels = None
    col_traclus_runs = col_traclus_representatives = col_traclus_segments = col_traclus_repr = None


# ── Worker async MongoDB ──────────────────────────────────────
_mongo_q: queue.Queue = queue.Queue(maxsize=5000)


def _mongo_worker():
    while True:
        task = None
        try:
            task = _mongo_q.get(timeout=1)
            if task is None:
                break

            fn, args = task
            fn(*args)

        except queue.Empty:
            continue

        except Exception as e:
            log.error(f"[mongo-worker] {e}")

        finally:
            if task is not None:
                _mongo_q.task_done()


threading.Thread(target=_mongo_worker, daemon=True, name="mongo-worker").start()


def enqueue(fn, *args):
    try:
        _mongo_q.put_nowait((fn, args))
    except queue.Full:
        log.warning("MongoDB queue pleine — écriture ignorée")


def wait_for_queue(timeout: float = 60.0) -> bool:
    import time

    start = time.time()
    while _mongo_q.unfinished_tasks > 0:
        if time.time() - start > timeout:
            return False
        time.sleep(0.1)
    return True