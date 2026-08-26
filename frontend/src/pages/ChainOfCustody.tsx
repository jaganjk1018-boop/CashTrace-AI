// src/pages/ChainOfCustody.tsx
//
// Shows the hash-chained action log for a case in a visual block layout,
// with a "Verify Integrity" and "Simulate Database Tampering" button.
// Tapping "Simulate Tampering" directly edits the database record, causing
// the recomputed hash comparison to fail, lighting up the compromised blocks in red.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface ChainEntry {
  id: string;
  action_type: string;
  officer_id: string;
  payload: any;
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
  const [tampering, setTampering] = useState(false);

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

  async function toggleTampering() {
    setTampering(true);
    try {
      await fetch(`${BACKEND_URL}/api/actionlog/${caseId}/tamper`, {
        method: "POST",
      });
      await verify();
    } catch (err) {
      console.error("Failed to simulate tampering:", err);
    } finally {
      setTampering(false);
    }
  }

  useEffect(() => {
    verify();
  }, [caseId]);

  const isTampered = result ? !result.isChainIntact : false;

  return (
    <div className="bg-command-panel border border-command-border rounded-xl p-5 text-white w-full max-w-3xl flex flex-col gap-6">
      
      {/* Audit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-command-border/50">
        <div>
          <h2 className="font-extrabold text-sm flex items-center gap-1.5">
            <span>🛡️</span> Cryptographic Ledger Audit
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Case ID: <span className="font-mono text-slate-300 select-all">{caseId}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={toggleTampering}
            disabled={tampering || loading || !result || result.entries.length === 0}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold border transition-all ${
              isTampered
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20"
            } disabled:opacity-50`}
          >
            {tampering ? "Processing..." : isTampered ? "⚡ Restore original data" : "⚠️ Simulate DB tampering"}
          </button>
          
          <button
            onClick={verify}
            disabled={loading}
            className="text-xs bg-sky-600 hover:bg-sky-500 px-3.5 py-1.5 rounded-lg disabled:opacity-50 transition-colors font-bold"
          >
            {loading ? "Recomputing hashes..." : "Verify Integrity"}
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Verdict Alert Box */}
          <motion.div
            key={result.isChainIntact ? "intact" : "broken"}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-semibold px-4 py-3 rounded-lg border flex items-center gap-2.5 ${
              result.isChainIntact
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                : "bg-red-500/10 text-red-400 border-red-500/40 animate-pulse"
            }`}
          >
            <span className="text-base">{result.isChainIntact ? "🟢" : "🚨"}</span>
            <div>
              <div className="font-bold">
                {result.isChainIntact ? "Ledger Verified (Integrity Intact)" : "Tamper Alarm Triggered (Chain Broken)"}
              </div>
              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                {result.isChainIntact
                  ? "Every block recomputed dynamically matches its stored digital signature. Admissible forensic audit trail."
                  : "Database value modified after insertion. The cryptographic chain is broken; evidence cannot be verified."}
              </div>
            </div>
          </motion.div>

          {/* Blockchain Node Timeline Layout */}
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1 select-none">
            {result.entries.map((entry, idx) => {
              const hasBrokenForwardLink = !entry.valid;

              return (
                <div key={entry.id} className="flex flex-col items-center w-full">
                  
                  {/* Ledger Block Card */}
                  <div
                    className={`w-full text-xs p-4 rounded-xl border transition-all ${
                      entry.valid
                        ? "border-command-border bg-command-bg/70 shadow-sm"
                        : "border-red-500/60 bg-red-950/20 shadow-lg shadow-red-500/5"
                    }`}
                  >
                    {/* Header bar of Block */}
                    <div className="flex justify-between items-center pb-2.5 border-b border-command-border/20 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-command-panel text-[10px] px-2 py-0.5 rounded font-mono text-slate-400 font-semibold border border-command-border/60">
                          BLOCK #{idx + 1}
                        </span>
                        <span className="font-extrabold uppercase tracking-wide text-slate-200">
                          {entry.action_type}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        entry.valid ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {entry.valid ? "✓ SHA-256 MATCH" : "✗ INTEGRITY BREACH"}
                      </span>
                    </div>

                    {/* Block Info body */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-400 text-[11px]">
                      <div className="space-y-1">
                        <div>
                          Officer Signature: <span className="text-slate-200 font-semibold">{entry.officer_id}</span>
                        </div>
                        <div>
                          Recorded Date: <span className="text-slate-300">{new Date(entry.created_at).toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Payload Parameters Code Preview */}
                      <div className="bg-command-bg/90 border border-command-border/30 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 relative overflow-hidden">
                        <div className="absolute top-1 right-2 text-[9px] text-slate-600 font-bold uppercase">Payload</div>
                        <div className="space-y-0.5 max-h-20 overflow-y-auto">
                          {Object.entries(entry.payload || {}).map(([key, val]: any) => (
                            <div key={key} className={key === "_tampered" ? "text-amber-400 font-bold animate-pulse" : ""}>
                              <span className="text-sky-400">"{key}"</span>: {JSON.stringify(val)}
                            </div>
                          ))}
                          {Object.keys(entry.payload || {}).length === 0 && (
                            <span className="text-slate-600 italic">Empty payload</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hashes signature bar */}
                    <div className="mt-3.5 pt-3 border-t border-command-border/10 space-y-1 text-[9px] font-mono text-slate-500">
                      <div className="flex flex-col sm:flex-row justify-between gap-1">
                        <span>Stored Hash:</span>
                        <span className="text-slate-300 select-all font-semibold break-all text-right">{entry.stored_hash}</span>
                      </div>
                      {!entry.valid && (
                        <div className="flex flex-col sm:flex-row justify-between gap-1 text-red-400">
                          <span>Recomputed Hash:</span>
                          <span className="select-all font-bold break-all text-right">{entry.recomputed_hash}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Blockchain Link Node Arrow */}
                  {idx < result.entries.length - 1 && (
                    <div className="flex flex-col items-center my-1.5">
                      <div className={`w-0.5 h-6 ${
                        hasBrokenForwardLink 
                          ? "bg-gradient-to-b from-red-500 to-red-500/10 animate-pulse w-[3px]" 
                          : "bg-gradient-to-b from-emerald-500/80 to-emerald-500/10"
                      }`} />
                      {hasBrokenForwardLink ? (
                        <span className="text-[10px] font-extrabold text-red-500 animate-pulse my-0.5">⚠️ LINK BROKEN</span>
                      ) : (
                        <span className="text-[8px] font-bold text-emerald-500/60 my-0.5">LINKED HASH</span>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
            
            {result.entries.length === 0 && (
              <div className="text-slate-500 text-xs py-8 text-center border border-dashed border-command-border rounded-xl">
                No actions logged for this case yet. Go to the Command Center and run a transaction freeze simulation.
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
