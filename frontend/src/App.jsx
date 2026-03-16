import { useState, useEffect } from "react"
import { useSimulation }       from "./hooks/useSimulation"
import { useAnalysisPipeline } from "./hooks/useAnalysis"
import { ALGO_CONFIG }         from "./components/Constants"
import MapView                 from "./components/MapView"
import MongoSummaryBar         from "./components/MongoSummaryBar"
import StatsPanel              from "./components/panels/StatsPanel"
import AnalysisPipelinePanel  from "./components/panels/AnalysisPipelinePanel"
import ComparisonPanel         from "./components/panels/ComparisonPanel"
import GraphePanel             from "./components/panels/GraphePanel"
import AnalysisPage            from "./components/AnalysisPage"
import "./index.css"

export default function App() {
  // Sécurisation des retours de hooks
  const sim = useSimulation() || {}
  const {
    mode: simState = "stopped", stats = {}, currentRunId = null, trails = {},
    vehicles = [], step = 0, startSim = () => {}, pauseSim = () => {}, stopSim = () => {}, 
    liveClustering = null, error = null
  } = sim

  const analysis = useAnalysisPipeline(currentRunId) || {}
  const { 
    pipelineStatus = { analysis_status: "pending", analysis_steps: {} }, 
    allResults = {} 
  } = analysis

  const [activeAlgoId, setActiveAlgoId]       = useState("kmeans")
  const [startConfig, setStartConfig]         = useState({ nVehicles: 50, stepDelay: 0.5 })
  const [showSplit, setShowSplit]             = useState(true)
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [viewMode, setViewMode]               = useState("maps") 
  const [page, setPage]                       = useState("main") 

  const activeAlgo = ALGO_CONFIG[activeAlgoId] || ALGO_CONFIG["kmeans"]

  useEffect(() => {
    if (pipelineStatus?.analysis_status === "done") {
      setViewMode("panel")
    }
  }, [pipelineStatus?.analysis_status])

  useEffect(() => { setSelectedCluster(null) }, [activeAlgoId])

  // Si on est sur la page d'analyse dédiée
  if (page === "analysis") {
    return (
      <AnalysisPage
        stats={stats}
        activeAlgo={activeAlgo}
        allResults={allResults}
        liveClustering={liveClustering}
        vehicles={vehicles}
        selectedCluster={selectedCluster}
        onSelectCluster={setSelectedCluster}
        pipelineStatus={pipelineStatus}
        step={step}
        currentRunId={currentRunId}
        onBack={() => setPage("main")}
      />
    )
  }

  return (
    <div className={`app-shell mode-${viewMode}`}>
      {/* ── ERROR OVERLAY ── */}
      {error && (
        <div className="error-overlay">
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-title">Backend Inaccessible</div>
            <div className="error-msg">{error}</div>
            <div className="error-hint">Assurez-vous que le serveur FastAPI est lancé sur le port 8000.</div>
          </div>
        </div>
      )}

      {/* ── TOPBAR ── */}
      <div className="topbar-v2">
        <div className="logo-block">
          <div className="logo-title"><span>SUMO</span>Casa</div>
          <div className="logo-sub">Traffic Simulation · Casablanca</div>
        </div>

        <div className="algo-badge-v2">
          <div style={{ color: activeAlgo?.color || "#00e5ff", fontSize: 18 }}>{activeAlgo?.icon || "⬡"}</div>
          <div>
            <div className="algo-name" style={{ color: activeAlgo?.color || "#00e5ff" }}>{activeAlgo?.label || "K-Means"}</div>
            <div className="algo-sub-v2">{(activeAlgo?.description || "").substring(0, 30)}...</div>
          </div>
          <div className="divider-v" />
          <div className="stat-pill">
            <span className="stat-label">PAS</span>
            <span className="stat-val">{step}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">VEH</span>
            <span className="stat-val">{vehicles?.length || 0}</span>
          </div>
        </div>

        <div className="top-spacer" />

        <button className="top-btn" onClick={() => setShowSplit(!showSplit)}>
          {showSplit ? "⊞" : "▢"}
        </button>
        
        <button className={`top-btn ${viewMode === "maps" ? "active" : ""}`} onClick={() => setViewMode("maps")}>
          ◫ MAPS
        </button>

        <button className="top-btn analyse-btn" onClick={() => setPage("analysis")}>
          ▲ ANALYSE
        </button>

        <div className="divider-v" />
        <div className="status-dot-v2" style={{ background: simState === "running" ? "var(--green)" : simState === "paused" ? "var(--amber)" : "var(--text-dim)" }} />
        <span className="idle-tag">{simState.toUpperCase()}</span>
        <div className="fps-display">50</div>
        
        {simState === "running" ? (
          <button className="run-btn-v2" onClick={pauseSim} style={{ background: "var(--amber)" }}>▮▮</button>
        ) : (
          <button className="run-btn-v2" onClick={() => startSim(startConfig.nVehicles, startConfig.stepDelay)}>▶</button>
        )}
      </div>

      <div className="main-layout-v2">
        {/* ── SIDEBAR ── */}
        <div className="sidebar-v2">
          {Object.keys(ALGO_CONFIG).map((id) => (
            <div 
              key={id} 
              className={`sidebar-item-v2 ${activeAlgoId === id ? "active" : ""}`}
              onClick={() => setActiveAlgoId(id)}
              style={activeAlgoId === id ? { color: ALGO_CONFIG[id].color, borderColor: ALGO_CONFIG[id].color + "44", background: ALGO_CONFIG[id].color + "11" } : {}}
            >
              <span className="sidebar-icon-v2">{ALGO_CONFIG[id].icon}</span>
              <span>{id.toUpperCase().substring(0, 2)}</span>
            </div>
          ))}
        </div>

        <div className="content-v2">
          {/* ── SUBBREADCRUMB ── */}
          <div className="subbreadcrumb-v2">
            <div className="sim-live-badge-v2">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9d", boxShadow: "0 0 6px #00ff9d", display: "inline-block" }} />
              SIMULATION LIVE
            </div>
            <span className="breadcrumb-sep-v2">○</span>
            <span className="breadcrumb-algo-v2" style={{ color: activeAlgo?.color || "#00e5ff" }}>{(activeAlgo?.label || "").toUpperCase()}</span>
            <span className="breadcrumb-sep-v2">—</span>
            <span className="breadcrumb-desc-v2">{activeAlgo?.description || ""}</span>
            <span className="breadcrumb-spacer" />
            <div className="analyse-toggle-v2" onClick={() => setViewMode(viewMode === "maps" ? "panel" : "maps")}>
              {viewMode === "maps" ? "▼ ANALYSE" : "▲ MAPS"}
            </div>
          </div>

          {/* ── MAP AREA ── */}
          <div className="map-container-v2">
            {showSplit && (
              <div className="map-pane-v2">
                <div className="map-label-v2"><div className="map-dot-v2 green" />SIMULATION BRUTE</div>
                <MapView isLive vehicles={vehicles} trails={trails} />
              </div>
            )}
            <div className="map-pane-v2">
              <div className="map-label-v2" style={{ color: activeAlgo?.color || "#00e5ff", borderColor: (activeAlgo?.color || "#00e5ff") + "44" }}>
                <div className="map-dot-v2 white" style={{ background: activeAlgo?.color || "#00e5ff" }} />
                ANALYSE {(activeAlgo?.label || "").toUpperCase()}
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

          {/* ── BOTTOM STATUS BAR ── */}
          <div className="bottom-bar-v2">
            <div className="bb-stat-v2">PAS <span className="bb-val-v2">{step}</span></div>
            <div className="bb-sep-v2" />
            <div className="bb-stat-v2">VEH <span className="bb-val-v2">{vehicles?.length || 0}</span></div>
            <div className="bb-sep-v2" />
            <div className="bb-stat-v2">MODE <span className="bb-mode-v2" style={{ color: activeAlgo?.color || "#00e5ff" }}>{activeAlgo?.label || ""}</span></div>
            <div className="bb-right-v2">SUMOCasa v2 · Casablanca OSM</div>
          </div>

          {/* ── BOTTOM PANEL ── */}
          <div className="bottom-panel-v2">
            <div className="bp-content-v2">
              <StatsPanel
                stats={stats} activeAlgo={activeAlgo}
                allResults={allResults} liveClustering={liveClustering}
                vehicles={vehicles} selectedCluster={selectedCluster}
                onSelectCluster={setSelectedCluster}
              />
            </div>
          </div>

          {/* ── MONGODB BAR ── */}
          <MongoSummaryBar currentRunId={currentRunId} pipelineStatus={pipelineStatus} />
        </div>
      </div>
    </div>
  )
}
