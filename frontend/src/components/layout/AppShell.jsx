import React from "react"

/**
 * Root layout wrapper: full viewport, flex column, optional algo accent CSS vars.
 */
export default function AppShell({
  children,
  accentColor,
  glowColor,
  className = "",
}) {
  const style =
    accentColor || glowColor
      ? {
          "--algo-accent": accentColor || "var(--cyan)",
          "--algo-glow": glowColor || "var(--cyan)33",
        }
      : undefined

  return (
    <div className={`app-shell ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}
