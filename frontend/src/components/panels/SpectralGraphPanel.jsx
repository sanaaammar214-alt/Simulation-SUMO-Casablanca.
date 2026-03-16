/**
 * components/panels/SpectralGraphPanel.jsx
 * Visualisation des relations (affinité) pour le clustering spectral.
 */
export default function SpectralGraphPanel({ data }) {
  if (!data || !data.labels) return <div className="no-data">Données spectrales non disponibles.</div>

  const vehicles = data.labels.slice(0, 15) // On limite pour la lisibilité du graphe
  const radius = 80
  const centerX = 110
  const centerY = 110

  return (
    <div className="spectral-graph">
      <h3 style={{ fontSize: 12, marginBottom: 12, color: 'var(--accent2)' }}>🕸️ Graphe d'Affinité (Top 15)</h3>
      
      <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg)', borderRadius: 12, padding: 10 }}>
        <svg width="220" height="220" viewBox="0 0 220 220">
          {/* Liens (Affinités simulées pour le visuel) */}
          {vehicles.map((v, i) => {
            const angle1 = (i / vehicles.length) * Math.PI * 2
            const x1 = centerX + radius * Math.cos(angle1)
            const y1 = centerY + radius * Math.sin(angle1)
            
            return vehicles.map((v2, j) => {
              if (i >= j || v.label !== v2.label) return null
              const angle2 = (j / vehicles.length) * Math.PI * 2
              const x2 = centerX + radius * Math.cos(angle2)
              const y2 = centerY + radius * Math.sin(angle2)
              
              return (
                <line 
                  key={`link-${i}-${j}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--accent)"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              )
            })
          })}

          {/* Noeuds (Véhicules) */}
          {vehicles.map((v, i) => {
            const angle = (i / vehicles.length) * Math.PI * 2
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)
            
            return (
              <g key={v.vehicle_id}>
                <circle 
                  cx={x} cy={y} r="5" 
                  fill={v.label === -1 ? 'var(--muted)' : `hsl(${(v.label * 137) % 360}, 70%, 50%)`}
                  stroke="white"
                  strokeWidth="1"
                />
                <text 
                  x={x} y={y + 12} 
                  fontSize="6" fill="var(--muted)" 
                  textAnchor="middle" fontFamily="monospace"
                >
                  {v.vehicle_id.split('_').pop()}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
        <p>Ce graphe montre les connexions entre véhicules appartenant au même cluster spectral. Plus ils sont proches dans l'espace des vecteurs propres, plus l'affinité est forte.</p>
      </div>
    </div>
  )
}
