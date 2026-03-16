import React from "react"

/**
 * Panel section title with optional right-side content (e.g. count).
 */
export default function SectionHeader({
  label,
  right,
  className = "",
}) {
  return (
    <div className={`ui-section-header ${className}`.trim()}>
      <span className="label">{label}</span>
      {right != null && <span className="right">{right}</span>}
    </div>
  )
}
