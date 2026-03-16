import React from "react"
import { Polyline, Polygon, Marker } from "react-leaflet"
import L from "leaflet"

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

const makeArrowIcon = (color, angle) => L.divIcon({
  html: `<div style="transform: rotate(${angle}deg); color: ${color}; font-size: 20px;">➤</div>`,
  iconAnchor: [10, 10],
  className: "arrow-icon"
});

export default function STDBSCANLayer({ result, vehicles, trails, palette }) {
  if (!result || !result.labels) return null;

  const groups = new Map();
  result.labels.forEach(l => {
    if (l.label === -1) return;
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
        const currentCentroid = [g.sumLat / g.pts.length, g.sumLon / g.pts.length];

        // Rendu des traces historiques (simulées via trails si disponible ou buffer passé par props)
        // Ici on utilise une version simplifiée : polygone + flèche direction
        return (
          <React.Fragment key={label}>
            {hull && (
              <Polygon positions={hull} pathOptions={{ fillColor: color, fillOpacity: 0.4, color: color, weight: 2 }} />
            )}
            <Marker position={currentCentroid} icon={makeArrowIcon(color, 0)} />
          </React.Fragment>
        );
      })}
    </>
  );
}