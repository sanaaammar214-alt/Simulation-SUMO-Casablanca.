import React from "react"

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
}

const SIZES = {
  sm: "btn-sm",
  md: "btn-md",
  icon: "btn-icon",
}

/**
 * Reusable button with consistent styling.
 * @param {string} variant - primary | secondary | ghost | danger
 * @param {string} size - sm | md | icon
 * @param {string} accentColor - CSS color for primary/active state
 */
export default function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  accentColor,
  active,
  ...props
}) {
  const classes = [
    "ui-btn",
    VARIANTS[variant] || VARIANTS.secondary,
    SIZES[size] || SIZES.md,
    active ? "active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button
      type="button"
      className={classes}
      style={accentColor ? { "--btn-accent": accentColor } : undefined}
      {...props}
    >
      {children}
    </button>
  )
}
