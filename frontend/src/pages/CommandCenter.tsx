// src/pages/CommandCenter.tsx
import { useState } from "react";
import { usePredictions } from "../hooks/usePredictions";
import PredictionCard from "../components/PredictionCard";
import CommandCenterMap from "../components/CommandCenterMap";
import WhyPanel from "../components/WhyPanel";
import FreezeRequestModal from "../components/FreezeRequestModal";
import IngestionSimulator from "../components/IngestionSimulator";

export default function CommandCenter() {
  const { predictions, connected } = usePredictions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freezeTargetId, setFreezeTargetId] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  
  const selectedPrediction = predictions.find((p) => p.account_id === selectedId) ?? null;
  const freezeTarget = predictions.find((p) => p.account_id === freezeTargetId) ?? null;

  return (
    <div className="h-screen w-screen flex bg-command-bg text-white">
      {/* Sidebar */}
      <aside className="w-96 shrink-0 border-r border-command-border p-4 overflow-y-auto bg-command-panel/40">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold tracking-tight">CashTrace AI</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="text-[10px] bg-sky-600/10 hover:bg-sky-600/30 text-sky-400 border border-sky-500/20 px-2 py-1 rounded-md transition-colors"
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
    </div>
  );
}
