import React from "react"
import { ALGO_CONFIG } from "./Constants"

export default function AlgoSidebar({ activeAlgoId, onSelect }) {
  return (
    <nav className="algo-sidebar-v2">
      <div className="sidebar-label">ALGOS</div>

      {Object.entries(ALGO_CONFIG).map(([id, cfg]) => {
        const isActive = activeAlgoId === id
        return (
          <button
            key={id}
            className={`algo-item-btn ${isActive ? "active" : ""}`}
            onClick={() => onSelect(id)}
            style={{ "--algo-color": cfg.color }}
            title={`${cfg.label} — ${cfg.ref}`}
          >
            <span className="icon">{cfg.icon}</span>
            <span className="abbr">{cfg.abbr}</span>
          </button>
        )
      })}

      <div className="sidebar-footer">
        <div className="footer-line" />
      </div>
    </nav>
  )
}