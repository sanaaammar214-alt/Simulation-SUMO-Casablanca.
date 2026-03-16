import React, { useState, useEffect, useCallback } from "react"
import { api } from "../api/client"

const ALGO_STEPS = ["kmeans", "dbscan", "hdbscan", "spectral", "st_dbscan", "traclus"]
const ALGO_LABELS = {
  kmeans: "KM", dbscan: "DB", hdbscan: "HDB",
  spectral: "SP", st_dbscan: "STD", traclus: "TR"
}

export default function MongoSummaryBar({ currentRunId, pipelineStatus }) {
  const [mongoData, setMongoData] = useState(null)
  const [loading, setLoading]     = useState(false)

  const fetchMongo = useCallback(async () => {
    try {
      const { data } = await api.getRuns()
      const runs = Array.isArray(data) ? data : []
      const total = runs.length
      const current = runs.find(r => r.run_id === currentRunId) || null
      setMongoData({ total, current, runs })
    } catch {
      setMongoData(null)
    }
  }, [currentRunId])

  useEffect(() => {
    setLoading(true)
    fetchMongo().finally(() => setLoading(false))
    const t = setInterval(fetchMongo, 5000)
    return () => clearInterval(t)
  }, [fetchMongo])

  // get step status from pipelineStatus prop (already polled by useAnalysis)
  const getStepStatus = (step) => {
    // map frontend key to backend key
    const key = step === "stdbscan" ? "st_dbscan" : step
    return pipelineStatus?.analysis_steps?.[key]?.status || "pending"
  }

  return (
    <div className="mongo-summary-bar">
      <div className="mongo-label">
        {loading && <div className="mongo-spinner" />}
        MONGODB
      </div>

      <div className="mongo-scroll">
        {/* Run actuel */}
        <div className="mchip">
          <span className="mchip-ico">🔵</span>
          <div className="mchip-body">
            <span className="mchip-lbl">RUN ACTUEL</span>
            <span className="mchip-val" style={{ fontSize: 11 }}>
              {currentRunId
                ? `#${String(currentRunId).replace(/^run_/, "").slice(-6)}`
                : "—"}
            </span>
          </div>
        </div>

        <div className="mongo-sep" />

        {/* Total runs */}
        <div className="mchip">
          <span className="mchip-ico">📊</span>
          <div className="mchip-body">
            <span className="mchip-lbl">TOTAL RUNS</span>
            <span className="mchip-val">{mongoData?.total ?? "—"}</span>
          </div>
        </div>

        {/* Pipeline global status */}
        <div className="mchip">
          <span className="mchip-ico">⚙️</span>
          <div className="mchip-body">
            <span className="mchip-lbl">PIPELINE</span>
            <span className="mchip-val" style={{
              color: pipelineStatus?.analysis_status === "done" ? "var(--green)"
                   : pipelineStatus?.analysis_status === "running" ? "var(--yellow)"
                   : "var(--t3)"
            }}>
              {(pipelineStatus?.analysis_status || "IDLE").toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mongo-sep" />

        {/* Per-algo status chips */}
        {ALGO_STEPS.map(step => {
          const status = getStepStatus(step)
          return (
            <div key={step} className={`mchip-algo-status ${status}`}>
              <div className="sdot" />
              {ALGO_LABELS[step]}
            </div>
          )
        })}
      </div>
    </div>
  )
}