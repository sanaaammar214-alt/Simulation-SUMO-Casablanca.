import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "../api/client"

const STEP_ORDER = [
  "compute_features",
  "kmeans",
  "dbscan",
  "hdbscan",
  "spectral",
  "st_dbscan",
  "traclus",
]

const EMPTY_STATUS = {
  run_id: null,
  analysis_status: "pending",
  analysis_steps: {},
}

export function useAnalysisPipeline(runId) {
  const [pipelineStatus, setPipelineStatus] = useState(EMPTY_STATUS)
  
  const [allResults, setAllResults] = useState({
    kmeans: null, dbscan: null, hdbscan: null,
    spectral: null, stdbscan: null, traclus: null
  })

  const [stdbscanTrails, setStdbscanTrails] = useState([])
  const [loadingResults, setLoadingResults] = useState({})
  const [pipelineError, setPipelineError] = useState(null)

  const pollRef = useRef(null)

  // 1. Fetch Pipeline Status (Post-Simulation)
  const fetchStatus = useCallback(async () => {
    if (!runId) return null
    try {
      const { data } = await api.getAnalysisStatus(runId)
      setPipelineStatus(data)
      return data
    } catch (e) { return null }
  }, [runId])

  // 2. Fetch Specific Algo Result (Post-Simulation)
  const fetchAlgo = useCallback(async (algo) => {
    if (!runId) return
    // Map backend key → internal allResults key (matches ALGO_CONFIG ids)
    const internalKey = algo === "st_dbscan" ? "stdbscan" : algo
    try {
      const { data } = algo === "traclus"
        ? await api.getTraclusResult(runId)
        : await api.getAlgoResult(algo, runId)
      setAllResults((prev) => ({ ...prev, [internalKey]: data }))
    } catch (e) { /* error */ }
  }, [runId])

  const fetchAllDoneResults = useCallback(async (statusDoc) => {
    if (!statusDoc?.analysis_steps) return
    for (const algo of STEP_ORDER) {
      if (algo === "compute_features") continue
      // algo is the backend key (e.g. "st_dbscan") — use it directly
      if (statusDoc.analysis_steps[algo]?.status === "done") {
        await fetchAlgo(algo)
      }
    }
  }, [fetchAlgo])

  // Polling management
  useEffect(() => {
    // Pipeline polling
    if (runId) {
      const tick = async () => {
        const statusDoc = await fetchStatus()
        if (statusDoc?.analysis_status === "done" || statusDoc?.analysis_status === "failed") {
          clearInterval(pollRef.current)
          await fetchAllDoneResults(statusDoc)
        }
      }
      tick()
      pollRef.current = setInterval(tick, 3000)
    }

    return () => {
      clearInterval(pollRef.current)
    }
  }, [runId, fetchStatus, fetchAllDoneResults])

  return {
    pipelineStatus,
    allResults,
    stdbscanTrails,
    loadingResults,
    pipelineError,
    getResult: (algoId) => allResults[algoId],
    isReady:   (algoId) => !!allResults[algoId],
    retryAlgo: fetchAlgo
  }
}