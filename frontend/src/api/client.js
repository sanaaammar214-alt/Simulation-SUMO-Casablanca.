/**
 * api/client.js
 * Instance axios centralisée — tous les endpoints du nouveau backend pipeline.
 *
 * Nouveaux endpoints ajoutés :
 *   GET /analysis/status/{run_id}          → état d'avancement du pipeline
 *   GET /analysis/{algo}/{run_id}          → résultats d'un algo (kmeans|dbscan|hdbscan|spectral|st_dbscan)
 *   GET /analysis/traclus/{run_id}         → résultats TRACLUS
 *   GET /mongo/runs                        → liste des runs avec analysis_status
 */
import axios from "axios"

const client = axios.create({
  baseURL: "",
  timeout: 20000,
})

export const api = {
  // ── Simulation live ────────────────────────────────────────────────────────
  getState:      ()                     => client.get("/state"),
  getStats:      ()                     => client.get("/stats"),
  getClustering: ()                     => client.get("/clustering"),
  startSim:      (nVehicles, stepDelay) => client.post(`/start?n_vehicles=${nVehicles}&step_delay=${stepDelay}`),
  pauseSim:      ()                     => client.post("/pause"),
  stopSim:       ()                     => client.post("/stop"),

  // ── Pipeline analytics ─────────────────────────────────────────────────────
  /**
   * Retourne l'état complet du pipeline pour un run.
   * {
   *   run_id, analysis_status,
   *   analysis_steps: {
   *     compute_features: { status, started_at, finished_at, error },
   *     kmeans:           { status, ... },
   *     dbscan:           { status, ... },
   *     hdbscan:          { status, ... },
   *     spectral:         { status, ... },
   *     st_dbscan:        { status, ... },
   *     traclus:          { status, ... },
   *   }
   * }
   */
  getAnalysisStatus: (runId) =>
    client.get(`/analysis/status/${runId}`, { timeout: 5000 }),

  /**
   * Résultats d'un algo standard (kmeans|dbscan|hdbscan|spectral|st_dbscan).
   * {
   *   run_id, algo,
   *   summary: { n_clusters, n_noise?, n_vehicles, params, ... },
   *   labels:  [{ vehicle_id, label, ... }]
   * }
   */
  getAlgoResult: (algo, runId) =>
    client.get(`/analysis/${algo}/${runId}`, { timeout: 8000 }),

  /**
   * Résultats TRACLUS.
   * {
   *   run_id,
   *   summary: { n_clusters, n_segments, n_vehicle_trajectories,
   *               n_representative_trajectories, eps, min_samples, directional },
   *   representatives: [{ repr_id, cluster_id, trajectory: [[lat,lon],...] }],
   *   segments: [...]   // optionnel / paginé
   * }
   */
  getTraclusResult: (runId) =>
    client.get(`/analysis/traclus/${runId}`, { timeout: 8000 }),

  // ── Historique runs ────────────────────────────────────────────────────────
  /**
   * Liste des runs avec analysis_status inclus.
   * [{ run_id, started_at, ended_at, analysis_status, n_vehicles, ... }]
   */
  getRuns: () => client.get("/mongo/runs", { timeout: 5000 }),

  // ── Anciens endpoints conservés pour compatibilité ─────────────────────────
  getTraclusSummary: (runId) =>
    client.get(`/mongo/traclus/run/${runId}`, { timeout: 5000 }),
  getTraclusReps: (runId, limit = 50) =>
    client.get(`/mongo/traclus/representatives/${runId}`, {
      params: { limit },
      timeout: 5000,
    }),
}

export default client