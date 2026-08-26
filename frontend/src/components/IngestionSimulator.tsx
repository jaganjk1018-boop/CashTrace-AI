// src/components/IngestionSimulator.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Punjab National Bank"];
const MOCK_NAMES = ["Amit Sharma", "Priya Patel", "Sandeep Singh", "Ananya Reddy", "Vikram Malhotra", "Karan Johar", "Deepika Padukone"];
const MOCK_CITIES = ["Mumbai", "Chennai", "Delhi", "Hyderabad", "Pune", "Bengaluru", "Kolkata"];

export default function IngestionSimulator({ isOpen, onClose }: Props) {
  const [victimName, setVictimName] = useState("");
  const [victimBank, setVictimBank] = useState("");
  const [amountLost, setAmountLost] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [address, setAddress] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function fillMockData() {
    const randomName = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
    const randomBank = MOCK_BANKS[Math.floor(Math.random() * MOCK_BANKS.length)];
    const randomCity = MOCK_CITIES[Math.floor(Math.random() * MOCK_CITIES.length)];
    const randomAmount = Math.floor(10000 + Math.random() * 90000).toString();
    
    // Generate a random 12 digit account number
    const randomAccount = Math.floor(100000000000 + Math.random() * 900000000000).toString();

    setVictimName(randomName);
    setVictimBank(randomBank);
    setAmountLost(randomAmount);
    setToAccount(randomAccount);
    setAddress(randomCity);
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!victimName || !victimBank || !amountLost || !toAccount || !address) {
      setError("Please fill all fields or load mock data.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`${BACKEND_URL}/api/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          victim_name: victimName,
          victim_bank: victimBank,
          amount_lost: parseFloat(amountLost),
          to_account: toAccount,
          address: address,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit simulated complaint");

      setSuccess(true);
      // Reset fields
      setVictimName("");
      setVictimBank("");
      setAmountLost("");
      setToAccount("");
      setAddress("");
      
      // Auto close after brief success message
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-command-panel border border-command-border rounded-xl p-6 w-[28rem] max-h-[90vh] overflow-y-auto shadow-2xl text-white"
          >
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-base font-semibold">Ingestion Simulator</h2>
              <button
                type="button"
                onClick={fillMockData}
                className="text-[10px] bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/30 px-2 py-1 rounded-md transition-colors"
              >
                ✨ Load Mock Data
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Simulate NCRP portal API feeds. Adding a complaint triggers prediction scoring and feeds live dashboard socket updates.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Victim Name</label>
                <input
                  type="text"
                  value={victimName}
                  onChange={(e) => setVictimName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="bg-command-bg border border-command-border text-white text-xs rounded-lg p-2.5 w-full focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Victim Bank</label>
                  <input
                    type="text"
                    value={victimBank}
                    onChange={(e) => setVictimBank(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="bg-command-bg border border-command-border text-white text-xs rounded-lg p-2.5 w-full focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount Lost (₹)</label>
                  <input
                    type="number"
                    value={amountLost}
                    onChange={(e) => setAmountLost(e.target.value)}
                    placeholder="e.g. 50000"
                    className="bg-command-bg border border-command-border text-white text-xs rounded-lg p-2.5 w-full focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Account (Mule)</label>
                <input
                  type="text"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  placeholder="e.g. 910901234567"
                  className="bg-command-bg border border-command-border text-white text-xs rounded-lg p-2.5 w-full focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Victim Location (Address / City)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="bg-command-bg border border-command-border text-white text-xs rounded-lg p-2.5 w-full focus:outline-none focus:border-sky-500"
                />
              </div>

              {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
              
              {success && (
                <div className="text-emerald-400 text-xs mt-1 font-medium bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
                  ✓ Incident ingested! Dashboard updating...
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg border border-command-border font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-sky-600/10"
                >
                  {loading ? "Ingesting..." : "Ingest & Predict"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
