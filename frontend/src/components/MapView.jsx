import { MapContainer, TileLayer, CircleMarker, Polyline, Polygon, Marker, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { CLUSTER_PALETTES, NOISE_COLOR } from "./Constants"
import React, { useMemo } from "react"

import KMeansLayer   from "./layers/KMeansLayer"
import DBSCANLayer   from "./layers/DBSCANLayer"
import HDBSCANLayer  from "./layers/HDBSCANLayer"
import SpectralLayer from "./layers/SpectralLayer"
import STDBSCANLayer from "./layers/STDBSCANLayer"
import TRACLUSLayer  from "./layers/TRACLUSLayer"

const CASABLANCA = [33.5883, -7.6114]

function cross(O, A, B) {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0])
}
function convexHull(pts) {
  if (!pts || pts.length < 3) return pts
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const lower = []
  for (const x of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], x) <= 0) lower.pop()
    lower.push(x)
  }
  const upper = []
  for (let i = p.length - 1; i >= 0; i--) {
    const x = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], x) <= 0) upper.pop()
    upper.push(x)
  }
  upper.pop(); lower.pop()
  return [...lower, ...upper]
}

// BUG FIX: correct key mapping frontend → backend /clustering response
// Backend returns: algos.kmeans, algos.dbscan, algos.hdbscan, algos.spectral, algos.st_dbscan
const toBackendClusteringKey = (algoId) => {
  if (algoId === "stdbscan") return "st_dbscan"
  return algoId
}

export default function MapView({
  isLive = false, vehicles = [], trails = {},
  activeAlgoId = "kmeans", analysisResult = null, liveClustering = null,
  selectedCluster = null, step = 0
}) {
  const palette = CLUSTER_PALETTES[activeAlgoId] || CLUSTER_PALETTES.kmeans

  // BUG FIX: use corrected backend key for live clustering
  const labelMap = useMemo(() => {
    const map = new Map()
    const backendKey = toBackendClusteringKey(activeAlgoId)
    const live = liveClustering?.algos?.[backendKey]
    if (live && live.ids) {
      live.ids.forEach((id, i) => map.set(id, live.labels[i]))
    } else if (analysisResult?.labels) {
      analysisResult.labels.forEach(l =>
        map.set(l.vehicle_id, l.label ?? l.dominant_label)
      )
    }
    return map
  }, [liveClustering, analysisResult, activeAlgoId])

  // Live hull clusters (only used when no post-sim result)
  const liveClusters = useMemo(() => {
    if (isLive || analysisResult) return []
    const groups = {}
    vehicles.forEach(v => {
      const label = labelMap.get(v.id)
      if (label === undefined || label === -1) return
      if (!groups[label]) groups[label] = []
      groups[label].push([v.lat, v.lon])
    })
    return Object.entries(groups).map(([label, pts]) => ({
      label: parseInt(label),
      pts,
      hull: pts.length >= 3 ? convexHull(pts) : null,
      color: palette[parseInt(label) % palette.length]
    }))
  }, [vehicles, labelMap, isLive, analysisResult, palette])

  return (
    <div className="map-wrapper-v2">
      <MapContainer
        center={CASABLANCA}
        zoom={14}
        zoomControl={false}
        className="leaflet-v2"
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; CARTO"
          maxZoom={19}
        />

        {/* ── LIVE MAP (left) ── */}
        {isLive && (
          <>
            {Object.entries(trails).map(([vid, pts]) => (
              <Polyline
                key={`t-${vid}`}
                positions={pts}
                pathOptions={{ color: "#ff4060", weight: 2, opacity: 0.45, lineCap: "round" }}
              />
            ))}
            {vehicles.map(v => (
              <CircleMarker
                key={v.id}
                center={[v.lat, v.lon]}
                radius={5}
                pathOptions={{
                  color: "#fff", weight: 1,
                  fillColor: v.speed < 2 ? "#ff4060" : v.speed < 5 ? "#ff8040" : "#00e5ff",
                  fillOpacity: 1
                }}
              />
            ))}
          </>
        )}

        {/* ── ANALYSIS MAP (right) ── */}
        {!isLive && (
          <>
            {/* Generic colored dots */}
            {vehicles.map(v => {
              const label    = labelMap.get(v.id)
              const isNoise  = label === -1
              const hasLabel = label !== undefined
              const color    = isNoise    ? NOISE_COLOR
                             : hasLabel   ? palette[label % palette.length]
                             : "#3b82f6"
              return (
                <CircleMarker
                  key={v.id}
                  center={[v.lat, v.lon]}
                  radius={isNoise ? 3 : 5}
                  pathOptions={{
                    fillColor: color, fillOpacity: 0.92,
                    color: isNoise ? NOISE_COLOR : "#fff", weight: 1
                  }}
                />
              )
            })}

            {/* Specialized layers — post-sim only */}
            {activeAlgoId === "kmeans"   && analysisResult && <KMeansLayer   result={analysisResult} vehicles={vehicles} palette={palette} />}
            {activeAlgoId === "dbscan"   && analysisResult && <DBSCANLayer   result={analysisResult} vehicles={vehicles} palette={palette} />}
            {activeAlgoId === "hdbscan"  && analysisResult && <HDBSCANLayer  result={analysisResult} vehicles={vehicles} palette={palette} />}
            {activeAlgoId === "spectral" && analysisResult && <SpectralLayer result={analysisResult} vehicles={vehicles} palette={palette} />}
            {activeAlgoId === "stdbscan" && analysisResult && <STDBSCANLayer result={analysisResult} vehicles={vehicles} palette={palette} />}
            {activeAlgoId === "traclus"  && analysisResult && <TRACLUSLayer  result={analysisResult} palette={palette} />}

            {/* Live hull polygons (no post-sim result yet) */}
            {liveClusters.map(c =>
              c.hull && (
                <Polygon
                  key={c.label}
                  positions={c.hull}
                  pathOptions={{ fillColor: c.color, fillOpacity: 0.13, color: c.color, weight: 1.5 }}
                />
              )
            )}
          </>
        )}
      </MapContainer>
      <div className="map-scanline" />
    </div>
  )
}