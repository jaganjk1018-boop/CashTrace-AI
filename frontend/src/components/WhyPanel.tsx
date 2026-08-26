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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
