import React from "react"

export default function Header({
  simState, loading, startConfig, setStartConfig,
  showSplit, onToggleSplit, onStart, onPause, onStop,
  activeAlgo, viewMode, onToggleView
}) {
  const running = simState.running

  return (
    <header className="header-v2">
      {/* ── Brand ── */}
      <div className="brand-section">
        <div className="logo-box">⬡</div>
        <div className="brand-text">
          <div className="brand-main">
            <span className="sumo">SUMO</span><span className="casa">Casa</span>
          </div>
          <div className="brand-sub">TRAFFIC SIMULATION · CASABLANCA</div>
        </div>
      </div>

      {/* ── Active algo chip ── */}
      <div className="center-display">
        <div
          className="active-algo-chip"
          style={{
            background: `${activeAlgo.color}0e`,
            border: `1px solid ${activeAlgo.color}35`
          }}
        >
          <span className="algo-icon" style={{ color: activeAlgo.color }}>{activeAlgo.icon}</span>
          <div className="algo-info">
            <div className="algo-name" style={{ color: activeAlgo.color }}>{activeAlgo.label}</div>
            <div className="algo-ref">{activeAlgo.ref}</div>
          </div>
          <div className="chip-divider" style={{ background: `${activeAlgo.color}30` }} />
          <div className="live-counters">
            <div className="lc-row">PAS&nbsp;<span className="lc-val">{simState.step}</span></div>
            <div className="lc-row">VEH&nbsp;<span className="lc-val">{simState.vehicles?.length ?? 0}</span></div>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="controls-section">

        {/* SPLIT toggle */}
        <button
          className={`control-btn ${showSplit ? "active" : ""}`}
          onClick={onToggleSplit}
          title="Afficher / masquer la carte brute"
        >
          ⊞ SPLIT
        </button>

        {/* VIEW MODE toggle — bouton principal */}
        <button
          className={`control-btn view-mode-btn ${viewMode === "panel" ? "vm-panel" : "vm-maps"}`}
          onClick={onToggleView}
          title={viewMode === "maps" ? "Afficher le panneau d'analyse" : "Agrandir les cartes"}
        >
          {viewMode === "maps"
            ? <><span className="vm-icon">⬛</span> MAPS</>
            : <><span className="vm-icon">⊟</span> PANEL</>
          }
        </button>

        <div className="traci-badge">TraCI</div>

        <div className={`status-badge ${running ? "online" : "offline"}`}>
          <div className="dot" />
          <span>{running ? (simState.paused ? "PAUSE" : "EN COURS") : "IDLE"}</span>
        </div>

        <div className="action-btns">
          {!running ? (
            <>
              <input
                type="number"
                className="n-veh-input"
                value={startConfig.nVehicles}
                min={10} max={500}
                onChange={e => setStartConfig({ ...startConfig, nVehicles: parseInt(e.target.value) || 50 })}
              />
              <button
                className="btn-start"
                onClick={onStart}
                disabled={loading}
                style={{ color: activeAlgo.color, borderColor: `${activeAlgo.color}55` }}
              >
                {loading ? <span style={{ fontSize: 10 }}>…</span> : "▶"}
              </button>
            </>
          ) : (
            <>
              <button className="btn-pause" onClick={onPause}>
                {simState.paused ? "▶" : "⏸"}
              </button>
              <button className="btn-stop" onClick={onStop}>■</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}