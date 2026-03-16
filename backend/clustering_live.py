
import logging
import numpy as np
from sklearn.cluster import KMeans, DBSCAN, HDBSCAN, SpectralClustering
from sklearn.preprocessing import StandardScaler

log = logging.getLogger("sumo_api")

N_CLUSTERS = 4

def compute_live_clustering(vehicles: list) -> dict:
    """
    Calcule simultanément plusieurs algorithmes de clustering pour comparaison live.
    Se déclenche dès qu'il y a 2 véhicules.
    """
    if len(vehicles) < 2:
        return {"available": False, "message": "En attente de véhicules..."}

    try:
        ids = [v["id"] for v in vehicles]
        # Features: Latitude, Longitude, Vitesse, Angle
        X_raw = np.array([[v["lat"], v["lon"], v["speed"], v.get("angle", 0)] for v in vehicles])
        
        # Sécurité pour StandardScaler si un seul véhicule ou variance nulle
        if len(X_raw) > 1:
            X = StandardScaler().fit_transform(X_raw)
        else:
            X = X_raw

        results = {
            "available": True, 
            "n_vehicles": len(vehicles), 
            "algos": {}
        }

        # 1. K-MEANS
        k = min(N_CLUSTERS, len(ids))
        km = KMeans(n_clusters=k, n_init="auto", random_state=42)
        km_labels = km.fit_predict(X).tolist()
        results["algos"]["kmeans"] = {"labels": km_labels, "ids": ids}

        # 2. DBSCAN
        db = DBSCAN(eps=0.7, min_samples=2)
        db_labels = db.fit_predict(X).tolist()
        results["algos"]["dbscan"] = {"labels": db_labels, "ids": ids}

        # 3. HDBSCAN
        try:
            hdb = HDBSCAN(min_cluster_size=2)
            hdb_labels = hdb.fit_predict(X).tolist()
            results["algos"]["hdbscan"] = {"labels": hdb_labels, "ids": ids}
        except:
            results["algos"]["hdbscan"] = {"labels": [-1]*len(ids), "ids": ids}

        # 4. SPECTRAL
        try:
            spec = SpectralClustering(n_clusters=k, affinity='nearest_neighbors', random_state=42)
            spec_labels = spec.fit_predict(X).tolist()
            results["algos"]["spectral"] = {"labels": spec_labels, "ids": ids}
        except:
            results["algos"]["spectral"] = {"labels": [-1]*len(ids), "ids": ids}

        # 5. ST-DBSCAN (Spatio-Temporel simulé)
        X_st = np.column_stack([X, np.arange(len(ids)) / 10.0]) 
        st_db = DBSCAN(eps=1.0, min_samples=2)
        st_labels = st_db.fit_predict(X_st).tolist()
        results["algos"]["st_dbscan"] = {"labels": st_labels, "ids": ids}

        return results
    except Exception as e:
        log.error(f"LIVE CLUSTER ERROR: {e}")
        return {"available": False, "error": str(e)}
