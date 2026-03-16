/**
 * hooks/useSimulation.js
 * Gère l'état de la simulation, le polling live et les commandes.
 *
 * Changements vs. version précédente :
 *   - Suppression de fetchClustering / fetchComparison / fetchTraclus
 *     (délégué à useAnalysisPipeline)
 *   - Suppression des states : liveClustering, comparison, traclusSummary, traclusReps
 *   - stopSim ne déclenche plus manuellement le chargement des analyses
 *     (c'est le pipeline backend qui s'en charge, polling côté useAnalysisPipeline)
 *   - Ajout de onRunFinished(runId) callback optionnel pour App.jsx
 */
import { useState, useEffect, useRef, useCallback } from "react"
import { api } from "../api/client"

const POLL_INTERVAL    = 1000
const MAX_TRAIL_POINTS = 500

const EMPTY_SIM_STATE = {
  running: false,
  paused:  false,
  step:    0,
  vehicles: [],
  mode:    "idle",
  run_id:  null,
}

function normalizeBackendTrails(raw) {
  if (!raw || typeof raw !== "object") return {}
  return Object.fromEntries(
    Object.entries(raw).map(([vid, pts]) => [
      vid,
      (pts || [])
        .map((p) => {
          if (Array.isArray(p) && p.length >= 2) return [Number(p[0]), Number(p[1])]
          if (p && typeof p === "object" && p.lat != null && p.lon != null)
            return [Number(p.lat), Number(p.lon)]
          return null
        })
        .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1])),
    ])
  )
}

export function useSimulation() {
  const [simState,    setSimState]    = useState(EMPTY_SIM_STATE)
  const [stats,       setStats]       = useState(null)
  const [currentRunId, setCurrentRunId] = useState(null)
  const [error,       setError]       = useState(null)
  const [loading,     setLoading]     = useState(false)

  const trailRef = useRef({})
  const [trails, setTrails] = useState({})
  const pollRef  = useRef(null)
  const fpsRef   = useRef({ step: 0, time: Date.now() })

  const [liveClustering, setLiveClustering] = useState(null)
  const [fps, setFps] = useState(0)

  // ── fetchState ─────────────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      // On récupère état + stats + clustering en parallèle pour cohérence
      const [stateRes, statsRes, clustRes] = await Promise.all([
        api.getState(),
        api.getStats().catch(() => null),
        api.getClustering().catch(() => ({ data: { available: false } }))
      ])

      const data = stateRes.data
      const vehicles  = Array.isArray(data.vehicles) ? data.vehicles : []
      const activeIds = new Set(vehicles.map((v) => v.id))
      const backendTrails = normalizeBackendTrails(data.trails)

      if (Object.keys(backendTrails).length > 0) {
        trailRef.current = backendTrails
      } else {
        vehicles.forEach((v) => {
          if (v.lat == null || v.lon == null) return
          if (!trailRef.current[v.id]) trailRef.current[v.id] = []
          const trail = trailRef.current[v.id]
          const pt    = [v.lat, v.lon]
          trail.push(pt)
          if (trail.length > MAX_TRAIL_POINTS)
            trailRef.current[v.id] = trail.slice(-MAX_TRAIL_POINTS)
        })
        Object.keys(trailRef.current).forEach((vid) => {
          if (!activeIds.has(vid)) delete trailRef.current[vid]
        })
      }

      setTrails({ ...trailRef.current })
      
      if (statsRes) {
        setStats(statsRes.data)
        if (statsRes.data.run_id) setCurrentRunId(statsRes.data.run_id)
      }

      if (clustRes.data && clustRes.data.available) {
        setLiveClustering(clustRes.data)
      }

      const newStep = data.step ?? 0
      const now = Date.now()
      const prev = fpsRef.current
      if (data.running && !data.paused && prev.time > 0) {
        const dt = (now - prev.time) / 1000
        if (dt >= 0.2) {
          const stepDelta = Math.max(0, newStep - prev.step)
          const computed = Math.round((stepDelta / dt) * 10) / 10
          setFps(Math.min(120, Math.max(0, computed)))
        }
      } else {
        setFps(0)
      }
      fpsRef.current = { step: newStep, time: now }

      setSimState({
        running: !!data.running,
        paused:  !!data.paused,
        step:    newStep,
        vehicles,
        mode:    data.mode ?? "idle",
        run_id:  data.run_id ?? null,
      })
      if (data.run_id) setCurrentRunId(data.run_id)
      setError(null)
    } catch (e) {
      setError("Serveur inaccessible")
    }
  }, [])

  // ── Polling live ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchState()
  }, [fetchState])

  useEffect(() => {
    if (simState.running && !simState.paused) {
      pollRef.current = setInterval(() => {
        fetchState()
      }, POLL_INTERVAL)
    } else {
      clearInterval(pollRef.current)
    }
    return () => clearInterval(pollRef.current)
  }, [simState.running, simState.paused, fetchState])

  // ── Commandes ──────────────────────────────────────────────────────────────
  const startSim = useCallback(async (nVehicles, stepDelay) => {
    setLoading(true)
    setError(null)
    trailRef.current = {}
    fpsRef.current = { step: 0, time: Date.now() }
    setTrails({})
    setFps(0)
    setSimState({ ...EMPTY_SIM_STATE, running: true, mode: "starting" })

    try {
      const { data } = await api.startSim(nVehicles, stepDelay)
      if (data?.run_id) setCurrentRunId(data.run_id)
      await fetchState()
      // Re-polls différés pour absorber le délai de démarrage SUMO
      setTimeout(() => { fetchState(); }, 3000)
      setTimeout(() => { fetchState(); }, 7000)
      setTimeout(() => { fetchState(); }, 12000)
    } catch (e) {
      setSimState(EMPTY_SIM_STATE)
      setError(e.response?.data?.detail || "Erreur de démarrage")
    }
    setLoading(false)
  }, [fetchState])

  const pauseSim = useCallback(async () => {
    try {
      await api.pauseSim()
      await fetchState()
    } catch { /* ignore */ }
  }, [fetchState])

  const stopSim = useCallback(async () => {
    try {
      const { data } = await api.stopSim()
      trailRef.current = {}
      fpsRef.current = { step: 0, time: 0 }
      setTrails({})
      setFps(0)
      setStats(null)
      setSimState({ ...EMPTY_SIM_STATE, run_id: data?.run_id ?? null })
      if (data?.run_id) setCurrentRunId(data.run_id)
      // NB : le pipeline analytics est lancé côté backend dans _finalize_run()
      // Le polling est géré par useAnalysisPipeline, rien à faire ici.
    } catch { /* ignore */ }
  }, [])

  return {
    simState,
    stats,
    currentRunId,
    error,
    loading,
    trails,
    liveClustering,
    vehicles: simState.vehicles || [],
    step:     simState.step     || 0,
    mode:     simState.mode     || "idle",
    fps,
    startSim,
    pauseSim,
    stopSim,
  }
}