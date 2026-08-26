// src/pages/CommandCenter.tsx
//
// Main control center view. Houses the map, alerts listing sidebar,
// and floating explainability panels. Integrates WebSocket listener
// state to pop up automatic dispatch notifications in real-time.

import { useState, useEffect } from "react";
import { usePredictions } from "../hooks/usePredictions";
import PredictionCard from "../components/PredictionCard";
import CommandCenterMap from "../components/CommandCenterMap";
import WhyPanel from "../components/WhyPanel";
import FreezeRequestModal from "../components/FreezeRequestModal";
import IngestionSimulator from "../components/IngestionSimulator";
import type { Prediction } from "../types";

interface Toast {
  id: string;
  prediction: Prediction;
}

export default function CommandCenter() {
  const { predictions, connected, latestPrediction } = usePredictions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freezeTargetId, setFreezeTargetId] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const selectedPrediction = predictions.find((p) => p.account_id === selectedId) ?? null;
  const freezeTarget = predictions.find((p) => p.account_id === freezeTargetId) ?? null;

  // Listen to new predictions and push warning notifications
  useEffect(() => {
    if (latestPrediction) {
      const id = Math.random().toString();
      setToasts((prev) => [
        { id, prediction: latestPrediction },
        ...prev.slice(0, 2), // Keep up to 3 notifications on screen
      ]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [latestPrediction]);

  return (
    <div className="h-screen w-screen flex bg-command-bg text-white relative overflow-hidden">
      {/* Sidebar */}
      <aside className="w-96 shrink-0 border-r border-command-border p-4 overflow-y-auto bg-command-panel/40 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold tracking-tight">CashTrace AI</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="text-[10px] bg-sky-600/10 hover:bg-sky-600/30 text-sky-400 border border-sky-500/20 px-2 py-1 rounded-md transition-colors font-medium"
            >
              Simulate Feed
            </button>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
              title={connected ? "Live" : "Disconnected"}
            />
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Top {predictions.length} active cash-out risk predictions, ranked by confidence.
        </p>

        {predictions.length === 0 && (
          <div className="text-slate-500 text-sm mt-10 text-center">
            No active predictions yet. Waiting for data...
          </div>
        )}

        {predictions.map((p) => (
          <PredictionCard
            key={p.account_id}
            prediction={p}
            isSelected={selectedId === p.account_id}
            onSelect={() => setSelectedId(p.account_id)}
            onGenerateFreeze={() => setFreezeTargetId(p.account_id)}
          />
        ))}
      </aside>

      {/* Map */}
      <main className="flex-1 relative h-full">
        <CommandCenterMap predictions={predictions} selectedId={selectedId} />
        <WhyPanel prediction={selectedPrediction} />
      </main>

      <FreezeRequestModal
        prediction={freezeTarget}
        complaintId={freezeTarget?.complaint_id ?? null}
        onClose={() => setFreezeTargetId(null)}
      />

      <IngestionSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      {/* Automatic SMS/Email Notification Banner Container */}
      <div className="fixed bottom-6 right-6 z-[3000] flex flex-col gap-3 w-[26rem] max-w-[90vw] pointer-events-none">
        {toasts.map((toast) => {
          const { prediction } = toast;
          const confidence = (prediction.probability * 100).toFixed(0);
          return (
            <div
              key={toast.id}
              className="bg-slate-900/95 border-l-4 border-l-emerald-500 border border-slate-800/80 rounded-lg p-4 shadow-2xl backdrop-blur-md flex flex-col gap-1 pointer-events-auto cursor-pointer transition-all duration-300 hover:scale-[1.01]"
              onClick={() => {
                setSelectedId(prediction.account_id);
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  🚨 AUTOMATIC ALERTS TRANSMITTED
                </span>
                <button
                  className="text-[11px] text-slate-500 hover:text-slate-300 font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                  }}
                >
                  ✕
                </button>
              </div>
              
              <h4 className="text-xs font-bold text-slate-100 mt-1.5">
                Target ATM: {prediction.withdrawal_point_name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Mule Account ****{prediction.account_number.slice(-4)} flag matches risk threshold (Conf: {confidence}%). 
                SMS and dispatch notices pushed to law enforcement.
              </p>
              
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-400">
                <span>
                  Dispatched Cell: <strong className="text-slate-300">{prediction.police_station_name}</strong>
                </span>
                <span className="text-emerald-400 font-bold">
                  {prediction.police_distance_km?.toFixed(2)} km away
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
