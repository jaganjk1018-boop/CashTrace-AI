// src/pages/ChainOfCustodyPage.tsx
//
// Wraps ChainOfCustody with a case selector, since that component needs
// a specific caseId to fetch and verify. Lists recent complaints so an
// officer can pick which case's audit trail to inspect.

import { useEffect, useState } from "react";
import ChainOfCustody from "./ChainOfCustody";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface ComplaintSummary {
  id: string;
  complaint_number: string;
  victim_bank: string;
  amount_lost: number;
  status: string;
}

export default function ChainOfCustodyPage() {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/complaints?limit=30`)
      .then((res) => res.json())
      .then((data) => setComplaints(data))
      .catch((err) => console.error("Failed to load complaints:", err));
  }, []);

  return (
    <div className="min-h-screen bg-command-bg text-white p-6 pt-16 flex flex-col md:flex-row gap-6">
      {/* Case Selector Sidebar */}
      <aside className="w-full md:w-72 shrink-0">
        <h2 className="text-sm font-semibold mb-3 text-slate-300">Select a complaint case</h2>
        <div className="space-y-1 max-h-[75vh] overflow-y-auto pr-1">
          {complaints.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                selectedCaseId === c.id
                  ? "border-sky-500 bg-sky-500/10 shadow-md shadow-sky-500/5 text-white"
                  : "border-command-border bg-command-panel hover:border-slate-500 text-slate-300"
              }`}
            >
              <div className="font-semibold text-white mb-0.5">{c.complaint_number}</div>
              <div className="text-slate-400">
                {c.victim_bank} • ₹{Number(c.amount_lost).toLocaleString("en-IN")}
              </div>
            </button>
          ))}
          {complaints.length === 0 && (
            <div className="text-slate-500 text-xs py-4 text-center">
              No complaints found. Run the seed script first.
            </div>
          )}
        </div>
      </aside>

      {/* Case Audit Detail Main Panel */}
      <main className="flex-1">
        {selectedCaseId ? (
          <ChainOfCustody caseId={selectedCaseId} />
        ) : (
          <div className="text-slate-500 text-sm mt-10 text-center md:text-left border border-dashed border-command-border rounded-xl p-8 max-w-2xl">
            Select a case on the left to view its chain-of-custody audit trail. 
            Generate a freeze request from the Command Center first if you want a case with actions logged.
          </div>
        )}
      </main>
    </div>
  );
}
