import React from "react"
import { Polygon, CircleMarker, Tooltip } from "react-leaflet"
import L from "leaflet"

// Helper pour convex hull (déjà défini précédemment, je le réutilise)
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

export default function KMeansLayer({ result, vehicles, palette }) {
  if (!result || !result.labels) return null;

  const groups = new Map();
  result.labels.forEach(l => {
    const v = vehicles.find(veh => veh.id === l.vehicle_id);
    if (!v) return;
    if (!groups.has(l.label)) groups.set(l.label, { pts: [], sumLat: 0, sumLon: 0 });
    const g = groups.get(l.label);
    g.pts.push([v.lat, v.lon]);
    g.sumLat += v.lat; g.sumLon += v.lon;
  });

  return (
    <>
      {[...groups.entries()].map(([label, g]) => {
        const color = palette[label % palette.length];
        const hull = g.pts.length >= 3 ? convexHull(g.pts) : null;
        const centroid = [g.sumLat / g.pts.length, g.sumLon / g.pts.length];

        return (
          <React.Fragment key={label}>
            {hull && (
              <Polygon 
                positions={hull}
                pathOptions={{ fillColor: color, fillOpacity: 0.15, color: color, weight: 2 }}
              />
            )}
            <CircleMarker 
              center={centroid} 
              radius={8} 
              pathOptions={{ fillColor: color, fillOpacity: 0.8, color: "white", weight: 2 }}
              className="pulse-marker"
            >
              <Tooltip permanent={false}>
                <strong>Cluster {label}</strong><br/>
                {g.pts.length} véhicules
              </Tooltip>
            </CircleMarker>
          </React.Fragment>
        );
      })}
    </>
  );
}