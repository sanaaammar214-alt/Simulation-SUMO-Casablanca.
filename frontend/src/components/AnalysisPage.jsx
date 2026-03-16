import { useState, useEffect } from "react"
import { ALGO_CONFIG }       from "./Constants"
import StatsPanel            from "./panels/StatsPanel"
import AnalysisPipelinePanel from "./panels/AnalysisPipelinePanel"
import GraphePanel           from "./panels/GraphePanel"
import ComparisonPanel       from "./panels/ComparisonPanel"

// ────────────────────────────────────────────────────────────
//  MINI CHART COMPONENTS (Inlined for simplicity in this view)
// ────────────────────────────────────────────────────────────

function Sparkline({ data = [], color = "#00e5ff", height = 60 }) {
  if (!data || data.length < 2) return <div style={{ height, background: "rgba(0,0,0,0.1)" }} />;
  const w = 100, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const scaleY = (v) => h - ((v - min) / (max - min || 1)) * (h - 8) - 4;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${scaleY(v)}`).join(" ");
  const area = `M0,${h} L${data.map((v, i) => `${(i / (data.length - 1)) * w},${scaleY(v)}`).join(" L")} L${w},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle
        cx={w}
        cy={scaleY(data[data.length - 1])}
        r="2.5" fill={color}
      />
    </svg>
  );
}

function BarChart({ data = [], labels = [], color = "#00e5ff", height = 90 }) {
  if (!data || data.length === 0) return <div style={{ height }} />;
  const max = Math.max(...data);
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: "100%", height, display: "block" }}>
      {data.map((v, i) => {
        const bh = (v / max) * (height - 16);
        const bw = 100 / data.length - 2;
        const x = i * (100 / data.length) + 1;
        return (
          <g key={i}>
            <rect
              x={x} y={height - bh - 14}
              width={bw} height={bh}
              fill={color} opacity="0.4" rx="1"
            />
            <rect
              x={x} y={height - bh - 14}
              width={bw} height={2}
              fill={color} opacity="0.9" rx="1"
            />
            {labels && i % 2 === 0 && (
              <text x={x + bw / 2} y={height - 2} textAnchor="middle"
                fill="rgba(255,255,255,0.3)" fontSize="5">{labels[i]}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DonutRing({ value, max = 100, color = "#00e5ff", size = 80 }) {
  const r = 34, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / max) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(26,37,53,0.8)" strokeWidth="6" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
//  ANALYSIS PAGE COMPONENT
// ────────────────────────────────────────────────────────────

export default function AnalysisPage({
  stats = {}, activeAlgo = {}, allResults = {}, liveClustering = null,
  vehicles = [], selectedCluster = null, onSelectCluster,
  pipelineStatus = { analysis_status: "pending" }, step = 0, currentRunId = "—", onBack
}) {
  const [activeAlgoId, setActiveAlgoId] = useState(activeAlgo?.id || "kmeans");

  const currentAlgo = ALGO_CONFIG[activeAlgoId] || activeAlgo || ALGO_CONFIG["kmeans"];

  // Fake data for charts
  const history = {
    traffic: [12, 18, 24, 31, 28, 35, 42, 38, 45, 52, 48, 55, 61, 58, 49],
    density: [8, 14, 19, 27, 23, 32, 38, 34, 41, 47, 43, 50, 55, 52, 44],
    throughput: [22, 31, 38, 44, 52, 49, 57, 63, 71, 68, 74, 81, 78, 85, 79]
  };

  const hourLabels = ["00","02","04","06","08","10","12","14","16","18","20","22"];
  const hourlyBars = [15, 22, 35, 48, 61, 72, 85, 91, 78, 65, 58, 71, 88, 92, 84, 76, 69, 79, 84, 71, 55, 42, 31, 22];

  return (
    <div className="analysis-page-v2 page-enter">
      {/* ── HEADER ── */}
      <div className="analysis-header-v2">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="analysis-title-row">
              <div className="analysis-title">
                Tableau de <span style={{ color: currentAlgo.color }}>Bord</span> Analytique
              </div>
              <div className="analysis-subtitle">CASABLANCA TRAFFIC INTELLIGENCE SYSTEM</div>
            </div>
            <div className="analysis-meta">
              <div className="meta-chip">ALGORITHME <span style={{ color: currentAlgo.color }}>{currentAlgo.label} · {currentAlgo.ref}</span></div>
              <div className="meta-chip">SESSION <span>#{String(currentRunId || 0).slice(-4)}</span></div>
              <div className="meta-chip">RÉSEAU <span>Casablanca OSM</span></div>
              <div className="meta-chip">STATUS <span style={{ color: pipelineStatus.analysis_status === 'done' ? 'var(--green)' : 'var(--amber)' }}>{pipelineStatus.analysis_status.toUpperCase()}</span></div>
            </div>
          </div>
          <button className="top-btn" onClick={onBack} style={{ color: currentAlgo.color, borderColor: currentAlgo.color + "44" }}>
            ← SIMULATION
          </button>
        </div>
      </div>

      {/* ── NAV (Simplified) ── */}
      <div className="analysis-nav-v2">
        <div style={{ display: "flex", gap: 4, marginRight: 20 }}>
          {Object.values(ALGO_CONFIG).map(cfg => (
            <div
              key={cfg.id}
              onClick={() => setActiveAlgoId(cfg.id)}
              style={{
                padding: "8px 12px", borderRadius: 4, cursor: "pointer",
                border: "1px solid",
                borderColor: activeAlgoId === cfg.id ? cfg.color : "transparent",
                background: activeAlgoId === cfg.id ? cfg.color + "11" : "transparent",
                color: activeAlgoId === cfg.id ? cfg.color : "var(--text-muted)",
                fontSize: 10, transition: "all 0.2s"
              }}
            >
              {cfg.abbr}
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="analysis-body-v2">
        {/* KPI Row */}
        <div className="metrics-row">
          {[
            { label: "Véhicules Actifs", val: vehicles.length, sub: "en circulation", delta: "+12%", deltaType: "up", color: "#00e5ff" },
            { label: "Congestion Moy.", val: stats.avg_congestion?.toFixed(2) || "0.00", sub: "indice global", delta: "-8%", deltaType: "down", color: "#ff3d57" },
            { label: "Vitesse Moyenne", val: (stats.avg_speed || 0).toFixed(1) + "km/h", sub: "réseau entier", delta: "+5%", deltaType: "up", color: "#00ff9d" },
            { label: "PAS SIM", val: step, sub: "progression", delta: "LIVE", deltaType: "neutral", color: currentAlgo.color },
          ].map((m) => (
            <div key={m.label} className="metric-card" style={{ "--accent-color": m.color }}>
              <div className="metric-label">{m.label}</div>
              <div className="metric-val" style={{ color: m.color }}>{m.val}</div>
              <div className="metric-sub">
                {m.sub}
                <span className={`metric-delta ${m.deltaType === "up" ? "delta-up" : m.deltaType === "down" ? "delta-down" : "delta-neutral"}`}>
                  {m.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Traffic Volume Chart */}
        <div>
          <div className="section-header">
            <div className="section-title">Flux de Trafic</div>
            <div className="section-line" />
            <div className="section-badge">24H</div>
          </div>
          <div className="grid-3-1">
            <div className="chart-card">
              <div className="chart-card-header">
                <div className="chart-card-title">Volume Horaire — Réseau Casablanca</div>
                <div className="chart-card-action">Exporter CSV →</div>
              </div>
              <BarChart data={hourlyBars} labels={hourLabels} color={currentAlgo.color} height={110} />
            </div>
            <div className="chart-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
               <div className="chart-card-title" style={{ marginBottom: 15 }}>Score Efficience</div>
               <DonutRing value={75} color={currentAlgo.color} size={100} />
               <div className="score-num" style={{ color: currentAlgo.color, marginTop: -65, marginBottom: 40 }}>75%</div>
            </div>
          </div>
        </div>

        {/* Tendances */}
        <div>
          <div className="section-header">
            <div className="section-title">Tendances en Temps Réel</div>
            <div className="section-line" />
            <div className="section-badge">LIVE</div>
          </div>
          <div className="grid-3">
            {[
              { title: "Densité Véhiculaire", data: history.density, color: "#00e5ff", val: vehicles.length + " veh" },
              { title: "Throughput Réseau", data: history.throughput, color: "#00ff9d", val: "3,240 veh/h" },
              { title: "Index Congestion", data: history.traffic, color: "#ffb300", val: (stats.avg_congestion || 0).toFixed(2) + " avg" },
            ].map((s) => (
              <div key={s.title} className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-card-title">{s.title}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                </div>
                <Sparkline data={s.data} color={s.color} height={56} />
              </div>
            ))}
          </div>
        </div>

        {/* Stats et Pipelines (Toutes les vues fusionnées en une seule page verticale) */}
        <StatsPanel 
            stats={stats} activeAlgo={currentAlgo} 
            allResults={allResults} liveClustering={liveClustering} 
            vehicles={vehicles} selectedCluster={selectedCluster} 
            onSelectCluster={onSelectCluster} 
        />
        
        <div className="section-header" style={{ marginTop: 20 }}>
            <div className="section-title">État de la Pipeline</div>
            <div className="section-line" />
        </div>
        <AnalysisPipelinePanel pipelineStatus={pipelineStatus} activeAlgo={currentAlgo} />
        
        <div className="section-header" style={{ marginTop: 20 }}>
            <div className="section-title">Graphe & Comparaison</div>
            <div className="section-line" />
        </div>
        <div className="grid-2">
            <GraphePanel activeAlgo={currentAlgo} allResults={allResults} />
            <ComparisonPanel allResults={allResults} pipelineStatus={pipelineStatus} liveClustering={liveClustering} />
        </div>
      </div>
    </div>
  );
}
