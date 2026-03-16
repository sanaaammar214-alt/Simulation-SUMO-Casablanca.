import React from "react"
import { Button } from "./ui"

export default function Header({
  simState,
  fps,
  loading,
  startConfig,
  setStartConfig,
  showSplit,
  onToggleSplit,
  onStart,
  onPause,
  onStop,
  activeAlgo,
  viewMode,
  onToggleView,
  onGoAnalysis,
  step,
  nVehicles,
}) {
  const running = simState?.running ?? false
  const statusLabel = running
    ? simState.paused
      ? "PAUSE"
      : "EN COURS"
    : "IDLE"

  return (
    <header className="header-v2">
      <div className="brand-section">
        <div className="logo-box">⬡</div>
        <div className="brand-text">
          <div className="brand-main">
            <span className="sumo">SUMO</span>
            <span className="casa">Casa</span>
          </div>
          <div className="brand-sub">TRAFFIC SIMULATION · CASABLANCA</div>
        </div>
      </div>

      <div className="center-display">
        <div
          className="active-algo-chip"
          style={{
            background: `${activeAlgo.color}0e`,
            border: `1px solid ${activeAlgo.color}35`,
          }}
        >
          <span className="algo-icon" style={{ color: activeAlgo.color }}>
            {activeAlgo.icon}
          </span>
          <div className="algo-info">
            <div className="algo-name" style={{ color: activeAlgo.color }}>
              {activeAlgo.label}
            </div>
            <div className="algo-ref">{activeAlgo.ref}</div>
          </div>
          <div className="chip-divider" style={{ background: `${activeAlgo.color}30` }} />
          <div className="live-counters">
            <div className="lc-row">
              PAS&nbsp;<span className="lc-val">{simState.step}</span>
            </div>
            <div className="lc-row">
              VEH&nbsp;<span className="lc-val">{simState.vehicles?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="controls-section">
        <Button
          variant="ghost"
          size="sm"
          className={`control-btn ${showSplit ? "active" : ""}`}
          onClick={onToggleSplit}
          title="Afficher / masquer la carte brute"
        >
          ⊞ SPLIT
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`view-mode-btn ${viewMode === "panel" ? "vm-panel" : "vm-maps"}`}
          onClick={onToggleView}
          title={
            viewMode === "maps"
              ? "Afficher le panneau d'analyse"
              : "Agrandir les cartes"
          }
        >
          {viewMode === "maps" ? (
            <>
              <span className="vm-icon">⬛</span> MAPS
            </>
          ) : (
            <>
              <span className="vm-icon">⊟</span> PANEL
            </>
          )}
        </Button>

        <div className="traci-badge">TraCI</div>

        {typeof fps === "number" && (
          <span className="fps-lbl" title="Pas/s (simulation)">
            {fps.toFixed(1)} fps
          </span>
        )}

        <div className={`status-badge ${running ? "online" : "offline"}`}>
          <div className="dot" />
          <span>{statusLabel}</span>
        </div>

        {onGoAnalysis && (
          <Button
            variant="ghost"
            size="sm"
            className="tbtn tbtn-analyse"
            onClick={onGoAnalysis}
            title="Ouvrir la page analyse complète"
          >
            ⊞ ANALYSE
          </Button>
        )}

        <div className="action-btns">
          {!running ? (
            <>
              <input
                type="number"
                className="n-veh-input"
                value={startConfig.nVehicles}
                min={10}
                max={500}
                onChange={(e) =>
                  setStartConfig({
                    ...startConfig,
                    nVehicles: parseInt(e.target.value, 10) || 50,
                  })
                }
              />
              <Button
                variant="primary"
                size="icon"
                accentColor={activeAlgo.color}
                onClick={onStart}
                disabled={loading}
                className="btn-start"
              >
                {loading ? <span style={{ fontSize: 10 }}>…</span> : "▶"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="btn-pause" onClick={onPause}>
                {simState.paused ? "▶" : "⏸"}
              </Button>
              <Button variant="danger" size="icon" className="btn-stop" onClick={onStop}>
                ■
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}