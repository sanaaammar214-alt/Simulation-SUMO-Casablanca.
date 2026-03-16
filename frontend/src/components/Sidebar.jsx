import React from "react"
import AnalysisPipelinePanel from "./panels/AnalysisPipelinePanel"
import StatsPanel from "./panels/StatsPanel"
import ComparisonPanel from "./panels/ComparisonPanel"
import GraphePanel from "./panels/GraphePanel"

export default function Sidebar({ 
  activeAlgo, stats, vehicles, pipelineStatus, 
  allResults, activeTab, setActiveTab,
  selectedCluster, onSelectCluster,
  liveClustering
}) {
  const TABS = ["analyse", "pipeline", "graphe", "bilan"];

  return (
    <aside className="sidebar-v2">
      <div className="sidebar-tabs">
        {TABS.map(t => (
          <button 
            key={t} 
            className={`tab-btn ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
            style={{
              '--active-color': activeAlgo.color
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="sidebar-content">
        {activeTab === 'analyse' && (
          <StatsPanel 
            stats={stats} 
            activeAlgo={activeAlgo} 
            allResults={allResults}
            liveClustering={liveClustering}
            selectedCluster={selectedCluster}
            onSelectCluster={onSelectCluster}
            vehicles={vehicles}
          />
        )}
        {activeTab === 'pipeline' && (
          <AnalysisPipelinePanel 
            pipelineStatus={pipelineStatus} 
            activeAlgo={activeAlgo} 
            allResults={allResults}
            vehicles={vehicles}
          />
        )}
        {activeTab === 'graphe' && (
          <GraphePanel activeAlgo={activeAlgo} allResults={allResults} />
        )}
        {activeTab === 'bilan' && (
          <ComparisonPanel 
            allResults={allResults} 
            pipelineStatus={pipelineStatus} 
            activeAlgo={activeAlgo} 
            liveClustering={liveClustering}
          />
        )}
      </div>
    </aside>
  );
}
