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

  const getStepStatus = (step) => {
    const key = step === "stdbscan" ? "st_dbscan" : step
    return pipelineStatus?.analysis_steps?.[key]?.status || "pending"
  }

  return (
    <div className="mongo-bar-v2">
      <span className="mongo-badge-v2">MONGODB</span>
      
      <div className="run-indicator">
        <div className="run-dot" style={{ background: currentRunId ? "var(--cyan)" : "var(--text-dim)" }} />
        <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>RUN ACTUEL</span>
        <span className="run-dash">—</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          {currentRunId ? currentRunId.replace("run_", "").replace(/_/g, " ").toUpperCase() : "AUCUN"}
        </span>
      </div>

      <div className="bb-sep-v2" />
      
      <div className="stat-group">
        <span>TOTAL RUNS</span>
        <span className="stat-group-val">{mongoData?.total ?? "0"}</span>
      </div>

      <div className="bb-sep-v2" />
      
      <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>PIPELINE</span>
      <span className="pipeline-status-v2" style={{ 
        color: pipelineStatus?.analysis_status === 'done' ? 'var(--green)' : pipelineStatus?.analysis_status === 'running' ? 'var(--amber)' : 'var(--text-muted)',
        background: pipelineStatus?.analysis_status === 'done' ? 'rgba(0,255,157,0.1)' : pipelineStatus?.analysis_status === 'running' ? 'rgba(255,179,0,0.1)' : 'rgba(26,37,53,0.5)',
        borderColor: pipelineStatus?.analysis_status === 'done' ? 'rgba(0,255,157,0.25)' : pipelineStatus?.analysis_status === 'running' ? 'rgba(255,179,0,0.25)' : 'var(--border)'
      }}>
        {(pipelineStatus?.analysis_status || "IDLE").toUpperCase()}
      </span>

      <div className="bb-sep-v2" />

      <div style={{ display: "flex", gap: 12 }}>
        {ALGO_STEPS.map(step => {
          const status = getStepStatus(step)
          return (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              <div className="pipeline-dot-v2" style={{ 
                background: status === 'done' ? 'var(--green)' : status === 'running' ? 'var(--amber)' : status === 'failed' ? 'var(--red)' : 'var(--text-dim)',
                boxShadow: status === 'running' ? '0 0 4px var(--amber)' : 'none'
              }} />
              {ALGO_LABELS[step]}
            </div>
          )
        })}
      </div>

      <div className="mongo-right">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date().toLocaleDateString()}</div>
    </div>
  )
}
