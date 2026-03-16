import React from "react"
import MapView from "../MapView"
import MongoSummaryBar from "../MongoSummaryBar"

/**
 * Map area: toolbar, optional split (live + analysis maps), status bar, Mongo summary.
 */
export default function MapSection({
  showSplit,
  activeAlgo,
  viewMode,
  onToggleView,
  vehicles,
  trails,
  activeAlgoId,
  allResults,
  liveClustering,
  selectedCluster,
  onSelectCluster,
  step,
  currentRunId,
  pipelineStatus,
}) {
  return (
    <section className="map-section">
      <div className="map-toolbar-top">
        <span className="live-pill">● SIMULATION LIVE</span>
        <span className="toolbar-sep" />
        <span className="algo-breadcrumb" style={{ color: activeAlgo.color }}>
          {activeAlgo.icon}&nbsp;&nbsp;{activeAlgo.label.toUpperCase()}
          <span className="algo-desc-inline"> — {activeAlgo.description}</span>
        </span>
        <button
          type="button"
          className={`view-toggle-btn ${viewMode === "panel" ? "vt-panel" : "vt-maps"}`}
          onClick={onToggleView}
          title={viewMode === "maps" ? "Ouvrir panneau analyse" : "Agrandir les cartes"}
        >
          {viewMode === "maps" ? "▼ ANALYSE" : "▲ MAPS"}
        </button>
      </div>

      <div className="map-container-wrapper">
        {showSplit && (
          <div className="map-instance-container">
            <div className="map-badge">
              <span className="badge-dot badge-green" />
              SIMULATION BRUTE
            </div>
            <MapView isLive vehicles={vehicles} trails={trails} />
          </div>
        )}
        <div className="map-instance-container">
          <div
            className="map-badge"
            style={{
              color: activeAlgo.color,
              borderColor: `${activeAlgo.color}44`,
            }}
          >
            {activeAlgo.icon}&nbsp;ANALYSE {activeAlgo.label.toUpperCase()}
          </div>
          <MapView
            activeAlgoId={activeAlgoId}
            vehicles={vehicles}
            trails={trails}
            analysisResult={allResults[activeAlgoId]}
            liveClustering={liveClustering}
            selectedCluster={selectedCluster}
            step={step}
          />
        </div>
      </div>

      <div className="map-footer">
        <div className="map-status-bar">
          <div className="si">
            <span className="si-l">PAS</span>
            <span className="si-v">{step}</span>
          </div>
          <div className="si">
            <span className="si-l">VEH</span>
            <span className="si-v">{vehicles.length}</span>
          </div>
          <div className="si">
            <span className="si-l">MODE</span>
            <span className="si-v" style={{ color: activeAlgo.color }}>
              {activeAlgo.label}
            </span>
          </div>
          <div className="si si-right">
            <span className="si-l">SUMOCasa v2 · Casablanca OSM</span>
          </div>
        </div>
        <MongoSummaryBar currentRunId={currentRunId} pipelineStatus={pipelineStatus} />
      </div>
    </section>
  )
}
