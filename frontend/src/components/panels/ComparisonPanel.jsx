import React from "react"

const ALGOS = [
  { id: "kmeans",   backendKey: "kmeans",    name: "K-Means",   ref: "Lloyd, 1982",      color: "#00e5ff" },
  { id: "dbscan",   backendKey: "dbscan",    name: "DBSCAN",    ref: "Ester, 1996",      color: "#ff8040" },
  { id: "hdbscan",  backendKey: "hdbscan",   name: "HDBSCAN",   ref: "Campello, 2013",   color: "#b47cf4" },
  { id: "spectral", backendKey: "spectral",  name: "Spectral",  ref: "Ng, 2002",         color: "#4d9fff" },
  { id: "stdbscan", backendKey: "st_dbscan", name: "ST-DBSCAN", ref: "Birant, 2007",     color: "#00d4b4" },
  { id: "traclus",  backendKey: "traclus",   name: "TRACLUS",   ref: "Lee, 2007",        color: "#ffd020" },
]

export default function ComparisonPanel({ allResults, pipelineStatus, liveClustering }) {
  const pipelineDone = pipelineStatus?.analysis_status === "done"

  const getRow = (algo) => {
    // Post-sim result
    const res = allResults[algo.id]
    if (res) {
      return {
        status: "done",
        source: "POST-SIM",
        n_clusters: res.summary?.n_clusters ?? "—",
        n_vehicles: res.summary?.n_vehicles ?? "—",
        n_noise:    res.summary?.n_noise ?? res.summary?.n_noise_points ?? null,
        silhouette: res.summary?.silhouette?.toFixed ? res.summary.silhouette.toFixed(3) : null,
      }
    }
    // Live clustering
    const live = liveClustering?.algos?.[algo.backendKey]
    if (live) {
      const labels   = live.labels || []
      const n_cls    = new Set(labels.filter(l => l !== -1)).size
      const n_noise  = labels.filter(l => l === -1).length
      return {
        status: "live",
        source: "LIVE",
        n_clusters: n_cls,
        n_vehicles: labels.length,
        n_noise:    n_noise > 0 ? n_noise : null,
        silhouette: null,
      }
    }
    if (algo.id === "traclus") {
      return { status: "pending", source: "POST-SIM", n_clusters: "—", n_vehicles: "—", n_noise: null, silhouette: null }
    }
    return { status: "pending", source: "—", n_clusters: "—", n_vehicles: "—", n_noise: null, silhouette: null }
  }

  return (
    <div className="comparison-panel">
      <div className="comp-hdr">
        <span className="comp-title">COMPARAISON DES MODÈLES</span>
        <span className="comp-sub">
          {pipelineDone ? "● ANALYSE COMPLÈTE" : "● FLUX TEMPS RÉEL"}
        </span>
      </div>

      <table className="comparison-table">
        <thead>
          <tr>
            <th>ALGORITHME</th>
            <th>CLUSTERS</th>
            <th>VÉHICULES</th>
            <th>BRUIT</th>
            <th>SILHOUETTE</th>
            <th>SOURCE</th>
          </tr>
        </thead>
        <tbody>
          {ALGOS.map(algo => {
            const d = getRow(algo)
            const noisePct = d.n_noise != null && d.n_vehicles > 0
              ? Math.round((d.n_noise / Number(d.n_vehicles)) * 100)
              : null

            return (
              <tr key={algo.id}>
                <td>
                  <div className="algo-badge">
                    <div className="algo-dot" style={{ background: algo.color }} />
                    <div>
                      <div className="algo-name-cell" style={{ color: algo.color }}>{algo.name}</div>
                      <div className="algo-ref-cell">{algo.ref}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="metric-val" style={{ color: algo.color }}>{d.n_clusters}</span>
                </td>
                <td>
                  <span className="metric-val">{d.n_vehicles}</span>
                </td>
                <td>
                  {noisePct != null
                    ? <span className="noise-val">{noisePct}%&nbsp;<span style={{ opacity: .6, fontSize: 11 }}>({d.n_noise})</span></span>
                    : <span style={{ color: "var(--t3)" }}>—</span>}
                </td>
                <td>
                  {d.silhouette != null
                    ? <span className="metric-val" style={{ fontSize: 14 }}>{d.silhouette}</span>
                    : <span style={{ color: "var(--t3)" }}>—</span>}
                </td>
                <td>
                  <span className={`stag stag-${d.status}`}>{d.source}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}