import React, { useMemo } from "react"
import { CLUSTER_PALETTES } from "../Constants"
import ClusterPanels from "./ClusterPanels"

function MetricChip({ label, value, color }) {
  return (
    <div className="metric-chip-v2">
      <div className="label">{label}</div>
      <div className="value-row">
        <span className="val" style={{ color }}>{value ?? 0}</span>
      </div>
    </div>
  )
}

export default function StatsPanel({
  stats, activeAlgo, allResults, liveClustering,
  selectedCluster, onSelectCluster, vehicles
}) {
  const algoId    = activeAlgo.id
  const isTraclus = algoId === "traclus"
  const palette   = CLUSTER_PALETTES[algoId] || CLUSTER_PALETTES.kmeans

  // BUG FIX: correct st_dbscan key mapping
  const data = useMemo(() => {
    const backendKey = algoId === "stdbscan" ? "st_dbscan" : algoId
    const live = liveClustering?.algos?.[backendKey]

    if (live && live.ids) {
      const groups = {}
      live.ids.forEach((vid, idx) => {
        const label = live.labels[idx]
        if (!groups[label]) groups[label] = { cluster: label, count: 0, vehicles: [] }
        groups[label].count++
        groups[label].vehicles.push(vid)
      })
      const all = Object.values(groups).sort((a, b) => a.cluster - b.cluster)
      const real  = all.filter(c => c.cluster !== -1).map((c, i) => ({ ...c, color: palette[i % palette.length] }))
      const noise = all.filter(c => c.cluster === -1).map(c => ({ ...c, color: "#4a5568" }))
      return {
        isLive: true,
        summary: { n_clusters: real.length, n_noise: noise[0]?.count || 0 },
        clusters: [...real, ...noise]
      }
    }

    const res = allResults[algoId]
    if (res) {
      // Build cluster list from labels for display
      const groups = {}
      ;(res.labels || []).forEach(l => {
        const lbl = l.label ?? l.dominant_label
        if (!groups[lbl]) groups[lbl] = { cluster: lbl, count: 0 }
        groups[lbl].count++
      })
      const clusterList = Object.values(groups)
        .sort((a, b) => a.cluster - b.cluster)
        .map((c, i) => ({
          ...c,
          color: c.cluster === -1 ? "#4a5568" : palette[i % palette.length]
        }))
      return { isLive: false, summary: res.summary || {}, clusters: clusterList }
    }

    return { isLive: true, summary: {}, clusters: [] }
  }, [liveClustering, allResults, algoId, palette])

  return (
    <div className="stats-panel-v2">
      {/* Col 1 — algo info */}
      <div className="sp-info-col">
        <div>
          <div
            className="sp-algo-name"
            style={{ color: activeAlgo.color, borderBottom: `2px solid ${activeAlgo.color}40`, paddingBottom: 10, marginBottom: 8 }}
          >
            {activeAlgo.label}
          </div>
          <div className="sp-algo-desc">{activeAlgo.description}</div>
        </div>
        <span className="sp-algo-ref">{activeAlgo.ref}</span>

        {/* Live / Post-sim badge */}
        <div style={{ marginTop: "auto" }}>
          <span className={`stag ${data.isLive ? "stag-live" : "stag-done"}`}>
            {data.isLive ? "● LIVE" : "● POST-SIM"}
          </span>
        </div>
      </div>

      {/* Col 2 — metrics */}
      <div className="sp-metrics-col">
        {activeAlgo.metrics.map(m => {
          let val = data.summary?.[m] ?? 0
          if (isTraclus && data.isLive) val = "POST-SIM"
          return (
            <MetricChip
              key={m}
              label={m.toUpperCase().replace(/_/g, " ")}
              value={val}
              color={activeAlgo.color}
            />
          )
        })}
      </div>

      {/* Col 3 — clusters */}
      <div className="sp-clusters-col">
        <div className="sp-section-hdr">
          <span className="label">CLUSTERS DÉTECTÉS</span>
          <span className="big-count" style={{ color: activeAlgo.color }}>
            {data.summary?.n_clusters ?? 0}
          </span>
        </div>
        <ClusterPanels
          algoId={algoId}
          clusters={data.clusters}
          palette={palette}
          totalVehicles={vehicles.length}
          selectedCluster={selectedCluster}
          onSelectCluster={onSelectCluster}
        />
      </div>
    </div>
  )
}