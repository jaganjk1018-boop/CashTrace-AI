// src/pages/ChainOfCustody.tsx
//
// Shows the hash-chained action log for a case, with a "Verify Integrity"
// button. This is the demo centerpiece: the chain is recomputed from the
// stored data every time you click verify, so if a record is ever edited
// directly in the database after the fact, verification will visibly fail.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface ChainEntry {
  id: string;
  action_type: string;
  officer_id: string;
  created_at: string;
  valid: boolean;
  stored_hash: string;
  recomputed_hash: string;
}

interface VerificationResult {
  case_id: string;
  isChainIntact: boolean;
  entries: ChainEntry[];
}

interface Props {
  caseId: string;
}

export default function ChainOfCustody({ caseId }: Props) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/actionlog/${caseId}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Failed to verify chain:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    verify();
  }, [caseId]);

  return (
    <div className="bg-command-panel border border-command-border rounded-xl p-5 text-white max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm">Chain of Custody</h2>
        <button
          onClick={verify}
          disabled={loading}
          className="text-xs bg-sky-600 hover:bg-sky-500 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Verifying..." : "Verify Integrity"}
        </button>
      </div>

      {result && (
        <>
          <motion.div
            key={result.isChainIntact ? "intact" : "broken"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-sm font-medium mb-4 px-3 py-2 rounded-lg ${
              result.isChainIntact
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40"
                : "bg-red-500/10 text-red-400 border border-red-500/40"
            }`}
          >
            {result.isChainIntact
              ? "✓ Chain verified — no tampering detected. Admissible audit trail."
              : "✗ TAMPER DETECTED — one or more records do not match their stored hash."}
          </motion.div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {result.entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`text-xs p-3 rounded-lg border ${
                  entry.valid
                    ? "border-command-border bg-command-bg"
                    : "border-red-500/60 bg-red-500/10"
                }`}
              >
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="font-medium">
                    #{i + 1} — {entry.action_type}
                  </span>
                  <span className={entry.valid ? "text-emerald-400" : "text-red-400"}>
                    {entry.valid ? "✓ valid" : "✗ invalid"}
                  </span>
                </div>
                <div className="text-slate-400">
                  Officer: <span className="text-slate-300 font-medium">{entry.officer_id}</span> • {new Date(entry.created_at).toLocaleString("en-IN")}
                </div>
                <div className="text-slate-500 font-mono break-all mt-1.5 select-all">
                  hash: {entry.stored_hash}
                </div>
              </div>
            ))}
            {result.entries.length === 0 && (
              <div className="text-slate-500 text-xs py-4 text-center">
                No actions logged for this case yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
