import { useState } from "react"
import StatsPanel            from "./panels/StatsPanel"
import AnalysisPipelinePanel from "./panels/AnalysisPipelinePanel"
import GraphePanel           from "./panels/GraphePanel"
import ComparisonPanel       from "./panels/ComparisonPanel"
import { ALGO_CONFIG }       from "./Constants"

const TABS = [
  { id: "analyse",  label: "ANALYSE",  icon: "◎" },
  { id: "pipeline", label: "PIPELINE", icon: "⟶" },
  { id: "graphe",   label: "GRAPHE",   icon: "∿" },
  { id: "bilan",    label: "BILAN",    icon: "⊞" },
]

export default function AnalysisPage({
  stats, activeAlgo, allResults, liveClustering,
  vehicles, selectedCluster, onSelectCluster,
  pipelineStatus, step, currentRunId, onBack
}) {
  const [activeTab,    setActiveTab]    = useState("analyse")
  const [activeAlgoId, setActiveAlgoId] = useState(activeAlgo?.id || "kmeans")

  const currentAlgo  = ALGO_CONFIG[activeAlgoId] || activeAlgo
  const pipelineSteps = pipelineStatus?.analysis_steps || {}
  const globalStatus  = pipelineStatus?.analysis_status || "pending"

  const statusColor = globalStatus === "done"    ? "#00ff9d"
                    : globalStatus === "running" ? (currentAlgo?.color || "#00e5ff")
                    :                              "#ffb300"

  return (
    <div style={s.page}>

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div style={s.header}>
        <div style={s.hLeft}>
          <div style={s.titleRow}>
            <span style={{ ...s.titleIcon, color: currentAlgo?.color || "#00e5ff" }}>
              {currentAlgo?.icon}
            </span>
            <div>
              <div style={s.title}>
                Tableau de{" "}
                <span style={{ color: currentAlgo?.color || "#00e5ff" }}>Bord</span>{" "}
                Analytique
              </div>
              <div style={s.titleSub}>
                SUMOCasa v2 &middot; Casablanca OSM &middot; {currentAlgo?.ref || "—"}
              </div>
            </div>
          </div>

          <div style={s.metaRow}>
            {[
              ["ALGORITHME", currentAlgo?.label || "—", null],
              ["VÉHICULES",  vehicles?.length ?? 0,     null],
              ["PAS SIM",    step ?? 0,                 null],
              ["RUN ID",     currentRunId ? `#${String(currentRunId).slice(-6)}` : "—", null],
              ["PIPELINE",   globalStatus.toUpperCase(), statusColor],
            ].map(([k, v, col]) => (
              <div key={k} style={s.chip}>
                <span style={s.chipKey}>{k}</span>
                <span style={{ ...s.chipVal, color: col || "#e8f4fd" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          style={s.backBtn}
          onMouseEnter={e => { e.currentTarget.style.background = `${currentAlgo?.color || "#00e5ff"}14`; e.currentTarget.style.borderColor = currentAlgo?.color || "#00e5ff" }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#1e3048" }}
          onClick={onBack}
        >
          ← SIMULATION
        </button>
      </div>

      {/* ══ NAVBAR : algo pills + tabs + pipeline dots ══════ */}
      <div style={s.navBar}>

        {/* Algo selector */}
        <div style={s.algoPills}>
          {Object.values(ALGO_CONFIG).map(cfg => {
            const isActive = activeAlgoId === cfg.id
            return (
              <button
                key={cfg.id}
                title={`${cfg.label} — ${cfg.ref}`}
                style={{
                  ...s.algoPill,
                  borderColor: isActive ? cfg.color : "transparent",
                  color:        isActive ? cfg.color : "rgba(61,90,115,0.8)",
                  background:   isActive ? `${cfg.color}12` : "transparent",
                  boxShadow:    isActive ? `0 0 10px ${cfg.color}22` : "none",
                }}
                onClick={() => setActiveAlgoId(cfg.id)}
              >
                <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                <span>{cfg.abbr}</span>
              </button>
            )
          })}
        </div>

        <div style={s.navSep} />

        {/* Tabs */}
        <div style={s.tabs}>
          {TABS.map(t => {
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                style={{
                  ...s.tab,
                  color:        isActive ? currentAlgo?.color : "rgba(61,90,115,0.9)",
                  borderBottom: isActive ? `2px solid ${currentAlgo?.color}` : "2px solid transparent",
                  background:   isActive ? `${currentAlgo?.color}08` : "transparent",
                }}
                onClick={() => setActiveTab(t.id)}
              >
                <span style={{ marginRight: 7, opacity: 0.6, fontSize: 11 }}>{t.icon}</span>
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Pipeline mini-dots */}
        <div style={s.pipeRow}>
          {[
            ["kmeans",  "KM"],
            ["dbscan",  "DB"],
            ["hdbscan", "HDB"],
            ["spectral","SP"],
            ["st_dbscan","STD"],
            ["traclus", "TR"],
          ].map(([key, lbl]) => {
            const st = pipelineSteps[key]?.status || "pending"
            const dotColor = st === "done"    ? "#00ff9d"
                           : st === "running" ? "#ffb300"
                           : st === "failed"  ? "#ff3d57"
                           : "#1a2535"
            return (
              <div key={key} style={s.pipeDotWrap} title={`${key}: ${st}`}>
                <div style={{
                  ...s.pipeDot,
                  background: dotColor,
                  boxShadow:  st === "running" ? `0 0 6px #ffb300` : "none",
                }} />
                <span style={{
                  fontSize: 9, letterSpacing: "0.1em",
                  color: st === "done" ? "#00ff9d" : "#1e3348",
                }}>
                  {lbl}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ CONTENT ═════════════════════════════════════════ */}
      <div style={s.body}>
        {activeTab === "analyse"  && (
          <StatsPanel
            stats={stats}
            activeAlgo={currentAlgo}
            allResults={allResults}
            liveClustering={liveClustering}
            vehicles={vehicles}
            selectedCluster={selectedCluster}
            onSelectCluster={onSelectCluster}
          />
        )}
        {activeTab === "pipeline" && (
          <AnalysisPipelinePanel
            pipelineStatus={pipelineStatus}
            activeAlgo={currentAlgo}
          />
        )}
        {activeTab === "graphe" && (
          <GraphePanel
            activeAlgo={currentAlgo}
            allResults={allResults}
          />
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

/* ─────────────────────────────────────────────────────
   Styles inline — zéro conflit avec index.css existant
───────────────────────────────────────────────────── */
const s = {
  page: {
    display: "flex", flexDirection: "column",
    height: "calc(100vh - 56px)",
    background: "#030508",
    fontFamily: "'DM Mono','Space Mono',monospace",
    overflow: "hidden",
  },

  /* Header */
  header: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    padding: "18px 28px 14px",
    background: "#070c12", borderBottom: "1px solid #1a2535",
    flexShrink: 0,
  },
  hLeft: { display: "flex", flexDirection: "column", gap: 10 },
  titleRow: { display: "flex", alignItems: "center", gap: 14 },
  titleIcon: { fontSize: 28, textShadow: "0 0 16px currentColor", lineHeight: 1 },
  title: {
    fontFamily: "Syne, 'DM Mono', monospace",
    fontSize: 22, fontWeight: 800,
    color: "#e8f4fd", letterSpacing: "0.02em", lineHeight: 1,
  },
  titleSub: {
    fontSize: 9, letterSpacing: "0.2em",
    color: "#1e3348", marginTop: 4, textTransform: "uppercase",
  },
  metaRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#0d1520", border: "1px solid #1a2535",
    borderRadius: 4, padding: "4px 11px",
  },
  chipKey: {
    fontSize: 9, letterSpacing: "0.18em",
    color: "#1e3348", textTransform: "uppercase",
  },
  chipVal: { fontSize: 11, fontWeight: 700, letterSpacing: "0.07em" },
  backBtn: {
    padding: "8px 16px",
    background: "transparent", border: "1px solid #1e3048",
    borderRadius: 5, color: "#00e5ff",
    fontSize: 10, letterSpacing: "0.18em",
    cursor: "pointer", fontFamily: "inherit",
    transition: "background .2s, border-color .2s",
    flexShrink: 0, marginTop: 4,
  },

  /* Navbar */
  navBar: {
    display: "flex", alignItems: "stretch",
    background: "#070c12", borderBottom: "1px solid #1a2535",
    flexShrink: 0, padding: "0 16px",
    overflowX: "auto",
    gap: 0,
  },
  algoPills: {
    display: "flex", alignItems: "center", gap: 2, padding: "6px 0",
  },
  algoPill: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "5px 10px", border: "1px solid transparent",
    borderRadius: 5, background: "transparent",
    cursor: "pointer", fontFamily: "inherit",
    fontSize: 9, letterSpacing: "0.12em",
    transition: "all .18s", minWidth: 40,
  },
  navSep: { width: 1, background: "#1a2535", margin: "8px 10px", flexShrink: 0 },
  tabs: { display: "flex", alignItems: "stretch", flex: 1 },
  tab: {
    padding: "0 20px", fontSize: 10, letterSpacing: "0.18em",
    fontFamily: "inherit", cursor: "pointer",
    border: "none", borderBottom: "2px solid transparent",
    transition: "all .18s",
    display: "flex", alignItems: "center", whiteSpace: "nowrap",
  },

  /* Pipeline dots */
  pipeRow: {
    display: "flex", alignItems: "center", gap: 2,
    marginLeft: "auto", padding: "0 4px", flexShrink: 0,
  },
  pipeDotWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 3, padding: "6px 5px", cursor: "default",
  },
  pipeDot: {
    width: 7, height: 7, borderRadius: "50%",
    transition: "background .3s, box-shadow .3s",
  },

  /* Body */
  body: {
    flex: 1, overflowY: "auto", padding: "20px 24px",
    scrollbarWidth: "thin", scrollbarColor: "#1a2535 transparent",
  },
}