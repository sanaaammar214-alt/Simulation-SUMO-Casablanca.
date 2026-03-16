import React from "react"
import { ALGO_CONFIG } from "../Constants"

// BUG FIX: use "st_dbscan" (underscore) — matches backend analysis_steps keys
const STEPS = ["compute_features", "kmeans", "dbscan", "hdbscan", "spectral", "st_dbscan", "traclus"]

const STEP_LABELS = {
  compute_features: "FEAT",
  kmeans: "KM",
  dbscan: "DB",
  hdbscan: "HDB",
  spectral: "SP",
  st_dbscan: "STD",
  traclus: "TR"
}

function getStepCfg(step) {
  // map backend step key → ALGO_CONFIG id
  const id = step === "st_dbscan" ? "stdbscan"
           : step === "compute_features" ? null
           : step
  return id ? ALGO_CONFIG[id] : null
}

export default function AnalysisPipelinePanel({ pipelineStatus, activeAlgo }) {
  const steps = pipelineStatus?.analysis_steps || {}
  // map frontend active algo id to backend step key
  const activeStepKey = activeAlgo.id === "stdbscan" ? "st_dbscan" : activeAlgo.id

  return (
    <div className="pipeline-panel-v2">
      <div className="header-row">
        <span className="title">PIPELINE ANALYTICS</span>
        <span className="live-dot">
          {pipelineStatus?.analysis_status === "done" ? "✓ TERMINÉ"
         : pipelineStatus?.analysis_status === "running" ? "● EN COURS"
         : "○ EN ATTENTE"}
        </span>
      </div>

      {/* Step track */}
      <div className="pipeline-track-v2">
        <div className="track-line" />
        {STEPS.map((step, i) => {
          const status    = steps[step]?.status || "pending"
          const isDone    = status === "done"
          const isRunning = status === "running"
          const isCurrent = step === activeStepKey
          return (
            <div
              key={step}
              className={`step-node ${isDone ? "done" : ""} ${isCurrent ? "active" : ""}`}
              style={isCurrent ? { "--active-color": activeAlgo.color } : {}}
              title={step}
            >
              <div className="node-circle">
                {isDone ? "✓" : isRunning ? "…" : i + 1}
              </div>
              <div className="node-label">{STEP_LABELS[step]}</div>
            </div>
          )
        })}
      </div>

      {/* Active step detail */}
      <div className="active-step-detail" style={{ border: `1px solid ${activeAlgo.color}22` }}>
        <div className="step-header" style={{ color: activeAlgo.color }}>
          {activeAlgo.icon} ÉTAPE: {activeAlgo.label.toUpperCase()}
        </div>
        <div className="params-list">
          {activeAlgo.metrics.slice(0, 3).map(m => (
            <div key={m} className="param-item">
              <span className="label">{m.replace(/_/g, " ").toUpperCase()}</span>
              <span className="val" style={{ color: activeAlgo.color }}>
                {steps[activeStepKey]?.status === "done" ? "✓ DONE"
               : steps[activeStepKey]?.status === "running" ? "⟳ RUNNING"
               : "PENDING"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="queue-section">
        <div className="queue-title">STATUT DES ÉTAPES</div>
        {STEPS.map(step => {
          const cfg    = getStepCfg(step)
          const status = steps[step]?.status || "pending"
          const label  = cfg ? cfg.label : "Features"
          const icon   = cfg ? cfg.icon : "◆"
          return (
            <div
              key={step}
              className={`queue-item ${status === "done" ? "qdone" : status === "running" ? "qrunning" : ""}`}
            >
              <span className="icon">{icon}</span>
              <span className="name">{label}</span>
              <span className="status">
                {status === "done" ? "✓ DONE"
               : status === "running" ? "⟳ RUNNING"
               : status === "failed" ? "✗ FAILED"
               : "PENDING"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}