// src/components/WhyPanel.tsx
//
// The "Why this ATM?" explainability panel. Shown for the currently
// selected prediction. Renders a plain-English summary plus a simple
// bar breakdown of the contributing factors — deliberately transparent
// so an officer can see and question the reasoning behind a flag.

import { motion, AnimatePresence } from "framer-motion";
import type { Prediction } from "../types";

interface Props {
  prediction: Prediction | null;
}

export default function WhyPanel({ prediction }: Props) {
  return (
    <AnimatePresence>
      {prediction && (
        <motion.div
          key={prediction.account_id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute top-4 right-4 w-80 bg-command-panel border border-command-border
                     rounded-xl p-4 shadow-2xl backdrop-blur-sm z-[999]"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sky-400 text-lg">?</span>
            <h3 className="text-sm font-semibold text-white">Why this ATM?</h3>
          </div>

          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            {prediction.explanation.summary}
          </p>

          <div className="space-y-3">
            {prediction.explanation.factors.map((factor) => (
              <div key={factor.label}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{factor.label}</span>
                  <span className="text-slate-300">{factor.weight_pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${factor.weight_pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-sky-500"
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{factor.detail}</div>
              </div>
            ))}
          </div>

          {prediction.police_station_name && (
            <div className="mt-4 pt-3.5 border-t border-command-border/50">
              <h4 className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span>👮</span> NEAREST INTERCEPT CELL
              </h4>
              <div className="bg-command-bg/30 border border-command-border/30 rounded-lg p-2.5 space-y-1">
                <div className="text-xs font-semibold text-slate-100">
                  {prediction.police_station_name}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Distance to ATM:</span>
                  <span className="text-emerald-400 font-semibold">
                    {prediction.police_distance_km?.toFixed(2)} km
                  </span>
                </div>
                {prediction.police_station_contact && (
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Direct Hotline:</span>
                    <span className="text-slate-300 font-mono select-all">
                      {prediction.police_station_contact}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {prediction.patrol_vehicle_name && (
            <div className="mt-3 pt-3 border-t border-command-border/50">
              <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span>🚔</span> TACTICAL DISPATCH PROTOCOL
              </h4>
              <div className="bg-command-bg/30 border border-command-border/30 rounded-lg p-2.5 space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Patrol Unit:</span>
                  <span className="text-white font-semibold">{prediction.patrol_vehicle_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unit Distance:</span>
                  <span className="text-slate-200">{prediction.patrol_distance_km?.toFixed(2)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Response ETA:</span>
                  <span className="text-amber-400 font-bold animate-pulse">{prediction.patrol_eta_mins} mins</span>
                </div>
                <div className="mt-2 pt-2 border-t border-command-border/20">
                  <span className="text-[10px] text-slate-400 block font-semibold">🚧 RECOMMENDED ROADBLOCK</span>
                  <span className="text-slate-100 block text-[11px] font-medium mt-0.5">{prediction.roadblock_name}</span>
                  <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">Deploying barriers along the {prediction.escape_corridor_name}.</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
