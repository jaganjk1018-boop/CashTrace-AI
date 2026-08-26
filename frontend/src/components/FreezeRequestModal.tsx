// src/components/FreezeRequestModal.tsx
//
// Shows the LLM-drafted freeze request document for officer review.
// The "Generate" click hits the backend, which calls Claude to draft
// the document from structured case data — this is the moment in the
// demo where prediction turns into a completed, actionable artifact.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import type { Prediction } from "../types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface Props {
  prediction: Prediction | null;
  complaintId: string | null; // the complaint tied to this prediction's last transaction
  onClose: () => void;
}

export default function FreezeRequestModal({ prediction, complaintId, onClose }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!prediction) return null;

  async function generateDraft() {
    if (!complaintId || !prediction) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/draft-freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId, accountId: prediction.account_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate draft");
      setDraft(data.draft);

      // Record this action in the hash-chained audit trail.
      fetch(`${BACKEND_URL}/api/actionlog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: complaintId,
          officer_id: "demo-officer",
          action_type: "freeze_drafted",
          payload: { account_id: prediction.account_id, draft_preview: data.draft.slice(0, 100) },
        }),
      }).catch((err) => console.error("Failed to log action:", err));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveAndClose() {
    if (!complaintId || !prediction || !draft) return;
    try {
      await fetch(`${BACKEND_URL}/api/actionlog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: complaintId,
          officer_id: "demo-officer",
          action_type: "freeze_approved",
          payload: {
            account_id: prediction.account_id,
            account_number: prediction.account_number,
            withdrawal_point_name: prediction.withdrawal_point_name,
            draft_excerpt: draft.slice(0, 200),
          },
        }),
      });
    } catch (err) {
      console.error("Failed to log action:", err);
    } finally {
      onClose();
    }
  }

  function downloadPDF() {
    if (!draft || !prediction || !complaintId) return;
    const doc = new jsPDF();
    
    // Page border
    doc.rect(8, 8, 194, 280);
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("NATIONAL CYBER CRIME INVESTIGATION CELL", 105, 25, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("MINISTRY OF HOME AFFAIRS • GOVERNMENT OF INDIA", 105, 30, { align: "center" });
    doc.text("Email: nodal@cybercell.gov.in | Fax: +91-11-23010203", 105, 35, { align: "center" });
    
    doc.line(15, 40, 195, 40);
    
    // Meta Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Ref Case ID: NCRP-${complaintId.slice(0, 8).toUpperCase()}`, 15, 50);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 150, 50);
    
    doc.text(`Subject: Urgent Account Freeze Order under Section 102 CrPC`, 15, 60);
    doc.line(15, 62, 118, 62);
    
    // Draft Body Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(draft, 170);
    doc.text(splitText, 15, 75);
    
    // Signatures
    doc.setFont("helvetica", "bold");
    doc.text("AUTHORIZED SIGNATORY", 145, 260);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Cyber Crime Investigation Officer", 145, 265);
    doc.text("CashTrace AI Intervention Unit", 145, 270);
    
    doc.save(`Freeze_Notice_NCRP_${complaintId.slice(0, 8).toUpperCase()}.pdf`);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-command-panel border border-command-border rounded-xl p-6 w-[35rem] max-h-[85vh] overflow-y-auto"
        >
          <h2 className="text-white font-semibold mb-1">Account Freeze Request</h2>
          <p className="text-xs text-slate-400 mb-4">
            Draft generated by AI for account {prediction.account_number} at{" "}
            {prediction.mule_bank_name}. Review before sending.
          </p>

          {!draft && !loading && (
            <button
              onClick={generateDraft}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Generate Draft
            </button>
          )}

          {loading && (
            <div className="text-slate-400 text-sm text-center py-6">Drafting document...</div>
          )}

          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

          {draft && (
            <>
              <div className="bg-command-bg border border-command-border rounded-lg p-4 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto font-mono">
                {draft}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigator.clipboard.writeText(draft)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2.5 rounded-lg font-medium transition-colors"
                >
                  Copy Text
                </button>
                <button
                  onClick={downloadPDF}
                  className="flex-1 bg-sky-700 hover:bg-sky-600 text-white text-xs py-2.5 rounded-lg font-medium transition-colors"
                >
                  Download PDF
                </button>
                <button
                  onClick={approveAndClose}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2.5 rounded-lg font-medium transition-colors"
                >
                  Approve & Close
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
