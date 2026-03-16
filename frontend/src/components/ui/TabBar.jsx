import React from "react"

/**
 * Reusable tab bar. Tabs get accent color and active state.
 * @param {Array<{ id: string, label: string, icon?: string }>} tabs
 * @param {string} activeId
 * @param {(id: string) => void} onSelect
 * @param {string} accentColor - CSS color for active tab
 * @param {React.ReactNode} extra - optional node (e.g. "ANALYSE COMPLÈTE" button) after tabs
 */
export default function TabBar({
  tabs,
  activeId,
  onSelect,
  accentColor,
  extra,
  className = "",
}) {
  return (
    <div className={`ui-tab-bar ${className}`.trim()}>
      {tabs.map((t) => {
        const isActive = activeId === t.id
        return (
          <button
            key={t.id}
            type="button"
            className={`ui-tab ${isActive ? "active" : ""}`}
            style={accentColor ? { "--tab-accent": accentColor } : undefined}
            onClick={() => onSelect(t.id)}
          >
            {t.icon != null && <span className="tab-icon">{t.icon}</span>}
            {t.label}
          </button>
        )
      })}
      {extra}
    </div>
  )
}
