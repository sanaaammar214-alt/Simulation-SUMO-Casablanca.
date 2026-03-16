import React from "react"
import { Polyline, CircleMarker, Marker } from "react-leaflet"
import L from "leaflet"

const arrowIcon = (color) => L.divIcon({
  html: `<div style="color: ${color}; font-size: 12px;">➤</div>`,
  iconAnchor: [6, 6],
  className: "traclus-arrow"
});

export default function TRACLUSLayer({ result, palette }) {
  if (!result || !result.representatives) return null;

  return (
    <>
      {result.segments?.map((seg, i) => (
        <Polyline 
          key={`seg-${i}`} 
          positions={seg.segment} 
          pathOptions={{ color: "#ffffff", weight: 1, opacity: 0.1 }} 
        />
      ))}

      {result.representatives.map((rep, i) => {
        const color = palette[i % palette.length];
        const points = rep.trajectory;

        // Guard: skip representatives with no renderable points
        if (!points || points.length < 2) return null;

        return (
          <React.Fragment key={i}>
            <Polyline 
              positions={points} 
              pathOptions={{ color: color, weight: 3, opacity: 0.9 }} 
            />
            {/* Flèches de direction */}
            {points.map((p, pi) => (
              pi % 3 === 0 && <Marker key={pi} position={p} icon={arrowIcon(color)} />
            ))}
            {/* Breakpoints */}
            <CircleMarker center={points[0]} radius={4} pathOptions={{ color: color, fillColor: "white", fillOpacity: 1 }} />
            <CircleMarker center={points[points.length - 1]} radius={4} pathOptions={{ color: color, fillColor: "white", fillOpacity: 1 }} />
          </React.Fragment>
        );
      })}
    </>
  );
}