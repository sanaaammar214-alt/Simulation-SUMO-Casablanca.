import React from "react"
import { Polygon, Tooltip } from "react-leaflet"

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

export default function HDBSCANLayer({ result, vehicles, palette }) {
  if (!result || !result.labels) return null;

  const groups = new Map();
  result.labels.forEach(l => {
    if (l.label === -1) return;
    const v = vehicles.find(veh => veh.id === l.vehicle_id);
    if (!v) return;
    if (!groups.has(l.label)) groups.set(l.label, { pts: [], persistence: l.probability || 0.5 });
    groups.get(l.label).pts.push([v.lat, v.lon]);
  });

  return (
    <>
      {[...groups.entries()].map(([label, g]) => {
        const color = palette[label % palette.length];
        const hull = g.pts.length >= 3 ? convexHull(g.pts) : null;
        const opacity = Math.max(0.1, Math.min(0.8, g.persistence));

        return (
          hull && (
            <Polygon 
              key={label}
              positions={hull}
              pathOptions={{ 
                fillColor: color, 
                fillOpacity: opacity, 
                color: color, 
                weight: 2,
                dashArray: "4, 4"
              }}
            >
              <Tooltip>
                <strong>HDBSCAN {label}</strong><br/>
                Stabilité: {(g.persistence * 100).toFixed(1)}%
              </Tooltip>
            </Polygon>
          )
        );
      })}
    </>
  );
}