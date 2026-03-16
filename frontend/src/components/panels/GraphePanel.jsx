import React, { useMemo } from "react"
import { CLUSTER_PALETTES } from "../Constants"

// Stable pseudo-random sparkline generator (seeded by cluster id)
function seedRand(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export default function GraphePanel({ activeAlgo, allResults }) {
  // activeAlgo is now the full config object (not just id string)
  const algoId  = activeAlgo?.id || activeAlgo
  const algoCfg = activeAlgo?.label ? activeAlgo : null
  const result  = allResults[algoId]
  const palette = CLUSTER_PALETTES[algoId] || CLUSTER_PALETTES.kmeans

  const clusters = useMemo(() => {
    if (!result?.labels) return []
    const counts = {}
    result.labels.forEach(l => {
      const lbl = l.label ?? l.dominant_label
      if (lbl === -1) return
      counts[lbl] = (counts[lbl] || 0) + 1
    })
    return Object.entries(counts).map(([id, count]) => ({ id: parseInt(id), count }))
  }, [result])

  if (!result?.labels) {
    return (
      <div className="graphe-panel">
        <div className="graphe-title" style={{ color: algoCfg?.color || "var(--t2)" }}>
          {algoCfg?.icon} GRAPHE — {algoCfg?.label || algoId}
        </div>
        <div className="no-data-v2">
          EN ATTENTE DES RÉSULTATS POST-SIMULATION
        </div>
      </div>
    )
  }

  return (
    <div className="graphe-panel">
      <div className="graphe-title" style={{ color: algoCfg?.color }}>
        📈 Répartition des Clusters — {algoCfg?.label}
      </div>

      {clusters.map(c => {
        const color = palette[c.id % palette.length]
        const rand  = seedRand(c.id * 137 + 42)
        const pts   = Array.from({ length: 12 }, (_, j) => {
          const y = 35 - rand() * 28
          return `${j * 18},${y}`
        }).join(" ")

        return (
          <div key={c.id} className="sparkline-item">
            <div className="sparkline-hdr">
              <span style={{ color, fontWeight: 700, fontSize: 13 }}>
                Cluster {c.id}
              </span>
              <span style={{ color: "var(--t3)", fontSize: 12 }}>
                {c.count} véhicules
              </span>
            </div>
            <svg
              width="100%" height="44"
              viewBox={`0 0 198 44`}
              preserveAspectRatio="none"
              style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, display: "block" }}
            >
              {/* fill */}
              <polyline
                fill="none"
                stroke={`${color}40`}
                strokeWidth="6"
                points={pts}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* line */}
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={pts}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )
      })}

      <div className="spark-note">
        * Visualisation basée sur la densité relative au dernier pas d'analyse
      </div>
    </div>
  )
}