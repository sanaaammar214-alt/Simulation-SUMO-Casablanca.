import React from "react"
import { TabBar } from "../ui"
import StatsPanel from "../panels/StatsPanel"
import AnalysisPipelinePanel from "../panels/AnalysisPipelinePanel"
import GraphePanel from "../panels/GraphePanel"
import ComparisonPanel from "../panels/ComparisonPanel"

const BOTTOM_TABS = [
  { id: "analyse", label: "ANALYSE" },
  { id: "pipeline", label: "PIPELINE" },
  { id: "graphe", label: "GRAPHE" },
  { id: "bilan", label: "BILAN" },
]

/**
 * Bottom panel with tab bar and tab content. Used on main page.
 */
export default function BottomPanel({
  activeTab,
  onTabChange,
  viewMode,
  onToggleView,
  onOpenFullAnalysis,
  activeAlgo,
  stats,
  allResults,
  liveClustering,
  vehicles,
  selectedCluster,
  onSelectCluster,
  pipelineStatus,
}) {
  const handleTabClick = (t) => {
    onTabChange(t)
    if (viewMode === "maps") onToggleView()
  }

  const extra = (
    <>
      {onOpenFullAnalysis && (
        <button
          type="button"
          className="btab"
          style={{
            "--tc": activeAlgo.color,
            marginLeft: "auto",
            color: activeAlgo.color,
            borderLeft: "1px solid #1a2535",
            opacity: 0.8,
          }}
          onClick={onOpenFullAnalysis}
          title="Ouvrir la page analyse complète"
        >
          ⊞ ANALYSE COMPLÈTE
        </button>
      )}
      <button
        type="button"
        className="btab btab-toggle"
        onClick={onToggleView}
      >
        {viewMode === "maps" ? "▲ VOIR" : "▼ CACHER"}
      </button>
    </>
  )

  return (
    <div className="bottom-panel">
      <div className="bottom-tabs">
        {BOTTOM_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btab ${activeTab === t.id ? "btab-active" : ""}`}
            onClick={() => handleTabClick(t.id)}
            style={{ "--tc": activeAlgo.color }}
          >
            {t.label}
          </button>
        ))}
        {extra}
      </div>

      <div className="bottom-content">
        {activeTab === "analyse" && (
          <StatsPanel
            stats={stats}
            activeAlgo={activeAlgo}
            allResults={allResults}
            liveClustering={liveClustering}
            vehicles={vehicles}
            selectedCluster={selectedCluster}
            onSelectCluster={onSelectCluster}
          />
        )}
        {activeTab === "pipeline" && (
          <AnalysisPipelinePanel pipelineStatus={pipelineStatus} activeAlgo={activeAlgo} />
        )}
        {activeTab === "graphe" && (
          <GraphePanel activeAlgo={activeAlgo} allResults={allResults} />
        )}
        {activeTab === "bilan" && (
          <ComparisonPanel
            allResults={allResults}
            pipelineStatus={pipelineStatus}
            liveClustering={liveClustering}
          />
        )}
      </div>
    </div>
  )
}
