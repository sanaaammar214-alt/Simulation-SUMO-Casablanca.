import React from "react"
import { Polygon, CircleMarker, Tooltip, Marker } from "react-leaflet"
import L from "leaflet"
import { NOISE_COLOR } from "../Constants"

function cross(O, A, B) { return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]); }
function convexHull(pts) {
  if (pts.length < 3) return pts;
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower = [];
  for (const x of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], x) <= 0) lower.pop();
    lower.push(x);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const x = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], x) <= 0) upper.pop();
    upper.push(x);
  }
  upper.pop(); lower.pop();
  return [...lower, ...upper];
}

const noiseIcon = L.divIcon({
  className: "noise-div-icon",
  html: `<div style="color: ${NOISE_COLOR}; font-size: 14px; font-weight: bold;">⚠</div>`,
  iconAnchor: [7, 7]
});

export default function DBSCANLayer({ result, vehicles, palette }) {
  if (!result || !result.labels) return null;

  const groups = new Map();
  const noise = [];

  result.labels.forEach(l => {
    const v = vehicles.find(veh => veh.id === l.vehicle_id);
    if (!v) return;
    if (l.label === -1) {
      noise.push([v.lat, v.lon, v.id]);
    } else {
      if (!groups.has(l.label)) groups.set(l.label, { pts: [] });
      groups.get(l.label).pts.push([v.lat, v.lon]);
    }
  });

  return (
    <>
      {/* 1. BRUIT (NOISE) */}
      {noise.map(([lat, lon, id]) => (
        <React.Fragment key={id}>
          <CircleMarker center={[lat, lon]} radius={4} pathOptions={{ color: NOISE_COLOR, fillColor: NOISE_COLOR, fillOpacity: 0.5 }} />
          <Marker position={[lat, lon]} icon={noiseIcon} />
        </React.Fragment>
      ))}

      {/* 2. CLUSTERS + CORE POINTS */}
      {[...groups.entries()].map(([label, g]) => {
        const color = palette[label % palette.length];
        const hull = g.pts.length >= 3 ? convexHull(g.pts) : null;

        return (
          <React.Fragment key={label}>
            {hull && (
              <Polygon 
                positions={hull}
                pathOptions={{ fillColor: color, fillOpacity: 0.15, color: color, weight: 2 }}
              />
            )}
            {/* Core points rings */}
            {g.pts.map((p, pi) => (
              <React.Fragment key={pi}>
                <CircleMarker center={p} radius={5} pathOptions={{ color: color, weight: 1, fill: false }} />
                <CircleMarker center={p} radius={2} pathOptions={{ color: color, fillColor: color, fillOpacity: 1 }} />
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
}