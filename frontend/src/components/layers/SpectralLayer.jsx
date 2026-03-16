import React from "react"
import { Polyline, CircleMarker } from "react-leaflet"

export default function SpectralLayer({ result, vehicles, palette }) {
  if (!result || !result.labels) return null;

  const groups = new Map();
  result.labels.forEach(l => {
    const v = vehicles.find(veh => veh.id === l.vehicle_id);
    if (!v) return;
    if (!groups.has(l.label)) groups.set(l.label, { pts: [] });
    groups.get(l.label).pts.push([v.lat, v.lon]);
  });

  return (
    <>
      {[...groups.entries()].map(([label, g]) => {
        const color = palette[label % palette.length];
        
        // On crée des liens entre les points consécutifs du cluster pour montrer la structure
        const links = [];
        for (let i = 0; i < g.pts.length - 1; i++) {
          links.push([g.pts[i], g.pts[i+1]]);
        }

        return (
          <React.Fragment key={label}>
            {links.map((link, li) => (
              <Polyline 
                key={li} 
                positions={link} 
                pathOptions={{ color: color, weight: 1, opacity: 0.6 }} 
              />
            ))}
            {g.pts.map((p, pi) => (
              <CircleMarker key={pi} center={p} radius={3} pathOptions={{ color: color, fillColor: color, fillOpacity: 1 }} />
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
}