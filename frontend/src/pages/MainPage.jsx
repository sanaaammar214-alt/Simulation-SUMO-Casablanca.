import React from "react"
import AlgoSidebar from "../components/AlgoSidebar"
import { MapSection } from "../components/layout"
import BottomPanel from "../components/layout/BottomPanel"

/**
 * Main simulation view: algo sidebar + map section + bottom analysis panel.
 * State is owned by App and passed down.
 */
export default function MainPage({
  activeAlgoId,
  onSelectAlgo,
  showSplit,
  viewMode,
  onToggleView,
  vehicles,
  trails,
  allResults,
  liveClustering,
  selectedCluster,
  onSelectCluster,
  step,
  currentRunId,
  pipelineStatus,
  stats,
  activeTab,
  onTabChange,
  onOpenFullAnalysis,
  activeAlgo,
}) {
  return (
    <div className={`main-content mode-${viewMode}`}>
      <div className="top-region">
        <AlgoSidebar activeAlgoId={activeAlgoId} onSelect={onSelectAlgo} />

        <MapSection
          showSplit={showSplit}
          activeAlgo={activeAlgo}
          viewMode={viewMode}
          onToggleView={onToggleView}
          vehicles={vehicles}
          trails={trails}
          activeAlgoId={activeAlgoId}
          allResults={allResults}
          liveClustering={liveClustering}
          selectedCluster={selectedCluster}
          onSelectCluster={onSelectCluster}
          step={step}
          currentRunId={currentRunId}
          pipelineStatus={pipelineStatus}
        />
      </div>

      <BottomPanel
        activeTab={activeTab}
        onTabChange={onTabChange}
        viewMode={viewMode}
        onToggleView={onToggleView}
        onOpenFullAnalysis={onOpenFullAnalysis}
        activeAlgo={activeAlgo}
        stats={stats}
        allResults={allResults}
        liveClustering={liveClustering}
        vehicles={vehicles}
        selectedCluster={selectedCluster}
        onSelectCluster={onSelectCluster}
        pipelineStatus={pipelineStatus}
      />
    </div>
  )
}
