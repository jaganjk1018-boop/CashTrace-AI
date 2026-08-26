// src/components/PredictionCard.tsx
import { motion } from "framer-motion";
import type { Prediction } from "../types";
import { useCountdown, type Urgency } from "../hooks/useCountdown";

const urgencyStyles: Record<Urgency, string> = {
  safe: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  warning: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  critical: "border-red-500/60 bg-red-500/10 text-red-400",
  expired: "border-slate-600/50 bg-slate-600/10 text-slate-500",
};

interface Props {
  prediction: Prediction;
  isSelected: boolean;
  onSelect: () => void;
  onGenerateFreeze: () => void;
}

export default function PredictionCard({ prediction, isSelected, onSelect, onGenerateFreeze }: Props) {
  const { label, urgency } = useCountdown(prediction.predicted_window_end);

  return (
    <motion.div
      onClick={onSelect}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`w-full text-left rounded-xl border p-4 mb-3 transition-colors cursor-pointer
        bg-command-panel border-command-border
        ${isSelected ? "ring-2 ring-sky-500" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {prediction.victim_bank} → {prediction.mule_bank_name}
        </span>
        <motion.span
          key={urgency}
          initial={{ scale: 0.9 }}
          animate={{ scale: urgency === "critical" ? [1, 1.08, 1] : 1 }}
          transition={{ repeat: urgency === "critical" ? Infinity : 0, duration: 1 }}
          className={`text-xs font-semibold px-2 py-1 rounded-full border ${urgencyStyles[urgency]}`}
        >
          {label}
        </motion.span>
      </div>

      <div className="text-white font-semibold text-sm mb-1">
        ₹{prediction.last_amount.toLocaleString("en-IN")} at risk
      </div>

      <div className="text-slate-300 text-sm">
        Likely cash-out: <span className="text-white">{prediction.withdrawal_point_name}</span>
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
        <span>{prediction.distance_km.toFixed(1)} km away</span>
        <span>Confidence: {(prediction.probability * 100).toFixed(0)}%</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onGenerateFreeze();
        }}
        className="w-full mt-3 bg-red-600/80 hover:bg-red-500 text-white text-xs font-medium py-1.5 rounded-lg transition-colors text-center"
      >
        Generate Freeze Request
      </button>
    </motion.div>
  );
}
