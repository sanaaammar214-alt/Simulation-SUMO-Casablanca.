import React from "react"

/**
 * Simple card container. Optional left border accent.
 */
export default function Card({
  children,
  className = "",
  accentColor,
  selected,
  clickable,
  ...props
}) {
  const classes = [
    "ui-card",
    selected ? "selected" : "",
    clickable ? "clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      className={classes}
      style={accentColor ? { borderLeftColor: accentColor, "--card-accent": accentColor } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}
