import React from "react"

export default function ClusterPanels({
  clusters, palette, totalVehicles, algoId,
  selectedCluster, onSelectCluster
}) {
  if (!clusters || clusters.length === 0) {
    return <div className="no-data-v2">AUCUN CLUSTER DÉTECTÉ</div>
  }

  return (
    <div className="cluster-list-v2">
      {clusters.map((c, i) => {
        const clusterId  = c.cluster ?? i
        const isSelected = selectedCluster === clusterId
        const isNoise    = clusterId === -1
        const color      = c.color || (isNoise ? "#4a5568" : palette[i % palette.length])
        const pct        = totalVehicles > 0
          ? Math.round((c.count / totalVehicles) * 100)
          : 0

        return (
          <div
            key={clusterId}
            className={`cluster-card-v2 ${isSelected ? "selected" : ""}`}
            style={{
              borderLeftColor: isNoise ? "#4a5568" : color,
              "--algo-color": color
            }}
            onClick={() => onSelectCluster(isSelected ? null : clusterId)}
          >
            <div className="cluster-header-v2">
              <div className="label-group">
                <div className="dot" style={{ background: isNoise ? "#4a5568" : color }} />
                <div className="name-box">
                  <div className="name">
                    {isNoise ? "ANOMALIES" : `CLUSTER ${clusterId}`}
                  </div>
                  {c.persistence != null && (
                    <div className="sub">
                      stabilité: <span style={{ color }}>{c.persistence.toFixed(2)}</span>
                    </div>
                  )}
                  {c.avg_speed != null && (
                    <div className="sub">
                      vitesse: <span style={{ color }}>{c.avg_speed.toFixed(1)} m/s</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="count-box">
                <div className="num" style={{ color: isNoise ? "#4a5568" : color }}>{c.count}</div>
                <div className="unit">veh</div>
              </div>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${pct}%`, background: isNoise ? "#4a5568" : color }}
              />
            </div>
            <div className="footer-pct">{pct}% DU TOTAL</div>
          </div>
        )
      })}
    </div>
  )
}