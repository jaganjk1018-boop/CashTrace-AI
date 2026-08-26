// src/components/CommandCenterMap.tsx
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from "react-leaflet";
import type { Prediction } from "../types";

interface Props {
  predictions: Prediction[];
  selectedId: string | null;
}

const INDIA_CENTER: [number, number] = [20.5937, 78.9629]; // India center

function riskColor(probability: number): string {
  if (probability > 0.80) return "#ef4444"; // critical red
  if (probability > 0.65) return "#f59e0b"; // warning amber
  return "#10b981"; // safe green
}

// Helper component to center and zoom map dynamically when prediction is selected
function MapController({ selectedPrediction }: { selectedPrediction: Prediction | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedPrediction) {
      map.setView([selectedPrediction.location.lat, selectedPrediction.location.lng], 13, {
        animate: true,
        duration: 1.2
      });
    }
  }, [selectedPrediction, map]);

  return null;
}

export default function CommandCenterMap({ predictions, selectedId }: Props) {
  const selectedPrediction = predictions.find((p) => p.account_id === selectedId) || null;

  return (
    <MapContainer center={INDIA_CENTER} zoom={5} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Recenter triggers */}
      <MapController selectedPrediction={selectedPrediction} />

      {predictions.map((p) => {
        const isSelected = p.account_id === selectedId;
        const color = riskColor(p.probability);
        
        return (
          <CircleMarker
            key={p.account_id}
            center={[p.location.lat, p.location.lng]}
            radius={isSelected ? 14 : 9}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: isSelected ? 0.75 : 0.5,
              weight: isSelected ? 3 : 1,
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <strong className="text-sm block mb-1 text-white">{p.withdrawal_point_name}</strong>
                <span className="text-slate-400 block mb-0.5">Target: {p.mule_bank_name} (****{p.account_number.slice(-4)})</span>
                <span className="text-slate-300 block font-semibold mb-1">₹{p.last_amount.toLocaleString("en-IN")} at risk</span>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-700/50">
                  <span className="text-sky-400 font-bold">{(p.probability * 100).toFixed(0)}% Confidence</span>
                  <span className="text-slate-400">{p.distance_km.toFixed(1)} km radius</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Render the victim source and the funnel polyline connection for the selected threat */}
      {selectedPrediction && selectedPrediction.victim_location && (
        <>
          {/* Victim Location Origin Node */}
          <CircleMarker
            center={[selectedPrediction.victim_location.lat, selectedPrediction.victim_location.lng]}
            radius={7}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.9,
              weight: 2
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <strong className="text-blue-400">Victim Origin</strong>
                <br />
                Bank: {selectedPrediction.victim_bank}
              </div>
            </Popup>
          </CircleMarker>

          {/* Dotted Intercept Funnel Polyline */}
          <Polyline
            positions={[
              [selectedPrediction.victim_location.lat, selectedPrediction.victim_location.lng],
              [selectedPrediction.location.lat, selectedPrediction.location.lng]
            ]}
            pathOptions={{
              color: "#3b82f6",
              weight: 2,
              dashArray: "5, 10",
              opacity: 0.8
            }}
          />
        </>
      )}

      {/* Render the nearest Police Intercept Station and Interception vector when a threat is selected */}
      {selectedPrediction && selectedPrediction.police_location && (
        <>
          {/* Police Station Marker */}
          <CircleMarker
            center={[selectedPrediction.police_location.lat, selectedPrediction.police_location.lng]}
            radius={9}
            pathOptions={{
              color: "#10b981", // emerald-500
              fillColor: "#10b981",
              fillOpacity: 0.95,
              weight: 2
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <strong className="text-emerald-400 font-bold block mb-0.5">👮 Intercept Station Unit</strong>
                <span className="text-slate-200 block mb-0.5">{selectedPrediction.police_station_name}</span>
                <span className="text-slate-400 block mb-1">ATM Distance: {selectedPrediction.police_distance_km?.toFixed(2)} km</span>
                <div className="pt-1.5 border-t border-slate-700/50">
                  <span className="text-slate-300 block font-mono">Hotline: {selectedPrediction.police_station_contact}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>

          {/* Intercept Line (ATM <-> Police Station) */}
          <Polyline
            positions={[
              [selectedPrediction.location.lat, selectedPrediction.location.lng],
              [selectedPrediction.police_location.lat, selectedPrediction.police_location.lng]
            ]}
            pathOptions={{
              color: "#10b981",
              weight: 2,
              dashArray: "3, 6",
              opacity: 0.85
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
