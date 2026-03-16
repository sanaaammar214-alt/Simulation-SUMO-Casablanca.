import React from "react"

const STATUS_COLORS = {
  online: "var(--green)",
  offline: "var(--t4)",
  done: "var(--green)",
  running: "var(--yellow)",
  failed: "var(--red)",
  pending: "var(--border2)",
}

/**
 * Small status indicator dot. Optional label beside it.
 */
export default function StatusDot({
  status = "pending",
  color,
  label,
  size = "sm",
  className = "",
}) {
  const dotColor = color || STATUS_COLORS[status] || STATUS_COLORS.pending
  const isRunning = status === "running"

  return (
    <span className={`ui-status-dot ${size} ${className}`.trim()}>
      <span
        className={`dot ${isRunning ? "pulse" : ""}`}
        style={{
          background: dotColor,
          boxShadow: isRunning ? `0 0 6px ${dotColor}` : "none",
        }}
      />
      {label != null && <span className="label">{label}</span>}
    </span>
  )
}
