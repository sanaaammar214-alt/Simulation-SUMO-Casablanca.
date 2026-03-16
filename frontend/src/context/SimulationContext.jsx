/**
 * context/SimulationContext.jsx
 * Contexte global — élimine le prop drilling profond de App.jsx
 */
import { createContext, useContext } from "react"

export const SimulationContext = createContext(null)

export function useSimCtx() {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error("useSimCtx must be used inside SimulationProvider")
  return ctx
}
