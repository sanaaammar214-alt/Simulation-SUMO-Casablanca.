import { useState, useEffect } from "react"
import { useSimulation } from "./hooks/useSimulation"
import { useAnalysisPipeline } from "./hooks/useAnalysis"
import { SimulationContext } from "./context/SimulationContext"
import { ALGO_CONFIG } from "./constants"
import Header from "./components/Header"
import { AppShell } from "./components/layout"
import { MainPage, AnalysisPage } from "./pages"
import "./index.css"

export default function App() {
  const sim = useSimulation()
  const {
    simState,
    stats,
    currentRunId,
    error,
    loading,
    trails,
    vehicles,
    step,
    fps,
    startSim,
    pauseSim,
    stopSim,
    liveClustering,
  } = sim

  const { pipelineStatus, allResults } = useAnalysisPipeline(currentRunId)

  const [activeAlgoId, setActiveAlgoId] = useState("kmeans")
  const [startConfig, setStartConfig] = useState({ nVehicles: 50, stepDelay: 0.5 })
  const [showSplit, setShowSplit] = useState(true)
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [activeTab, setActiveTab] = useState("analyse")
  const [viewMode, setViewMode] = useState("maps")
  const [page, setPage] = useState("main")

  const activeAlgo = ALGO_CONFIG[activeAlgoId]

  useEffect(() => {
    if (pipelineStatus.analysis_status === "done") {
      setViewMode("panel")
      setActiveTab("pipeline")
    }
  }, [pipelineStatus.analysis_status])

  useEffect(() => {
    setSelectedCluster(null)
  }, [activeAlgoId])

  const handleTabChange = (t) => {
    setActiveTab(t)
    if (viewMode === "maps") setViewMode("panel")
  }

  const toggleView = () => setViewMode((v) => (v === "maps" ? "panel" : "maps"))

  const sharedProps = {
    stats,
    activeAlgo,
    allResults,
    liveClustering,
    vehicles,
    selectedCluster,
    onSelectCluster: setSelectedCluster,
    pipelineStatus,
    step,
    currentRunId,
  }

  const nVehicles = startConfig.nVehicles

  return (
    <SimulationContext.Provider value={sim}>
      <AppShell accentColor={activeAlgo.color} glowColor={activeAlgo.glow}>
        {error && (
          <div className="error-overlay">
            <div className="error-card">
              <div className="error-icon">⚠️</div>
              <div className="error-title">Backend inaccessible</div>
              <div className="error-msg">{error}</div>
              <div className="error-hint">Vérifiez que le serveur FastAPI est démarré.</div>
            </div>
          </div>
        )}
        <Header
          simState={simState}
          fps={fps}
          loading={loading}
          startConfig={startConfig}
          setStartConfig={setStartConfig}
          showSplit={showSplit}
          onToggleSplit={() => setShowSplit((s) => !s)}
          onStart={() => startSim(startConfig.nVehicles, startConfig.stepDelay)}
          onPause={pauseSim}
          onStop={stopSim}
          activeAlgo={activeAlgo}
          viewMode={viewMode}
          onToggleView={toggleView}
          onGoAnalysis={() => setPage("analysis")}
          step={step}
          nVehicles={nVehicles}
        />

        {page === "analysis" ? (
        <AnalysisPage {...sharedProps} onBack={() => setPage("main")} />
      ) : (
        <MainPage
          activeAlgoId={activeAlgoId}
          onSelectAlgo={setActiveAlgoId}
          showSplit={showSplit}
          viewMode={viewMode}
          onToggleView={toggleView}
          vehicles={vehicles}
          trails={trails}
          allResults={allResults}
          liveClustering={liveClustering}
          selectedCluster={selectedCluster}
          onSelectCluster={setSelectedCluster}
          step={step}
          currentRunId={currentRunId}
          pipelineStatus={pipelineStatus}
          stats={stats}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenFullAnalysis={() => setPage("analysis")}
          activeAlgo={activeAlgo}
        />
        )}
      </AppShell>
    </SimulationContext.Provider>
  )
}
