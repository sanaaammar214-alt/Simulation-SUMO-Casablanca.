import React from "react"

const VARIANTS = {
  default: "badge-default",
  status: "badge-status",
  algo: "badge-algo",
  live: "badge-live",
  done: "badge-done",
  pending: "badge-pending",
}

/**
 * Small label/chip for status, algo, or generic text.
 * @param {string} variant - default | status | algo | live | done | pending
 * @param {string} color - override color (e.g. algo accent)
 */
export default function Badge({
  children,
  variant = "default",
  className = "",
  color,
  ...props
}) {
  const classes = [
    "ui-badge",
    VARIANTS[variant] || VARIANTS.default,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <span
      className={classes}
      style={color ? { "--badge-color": color, borderColor: `${color}40`, color } : undefined}
      {...props}
    >
      {children}
    </span>
  )
}
