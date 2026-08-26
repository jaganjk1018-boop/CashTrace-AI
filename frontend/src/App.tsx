import { useState } from "react";
import CommandCenter from "./pages/CommandCenter";
import MuleNetworkExplorer from "./pages/MuleNetworkExplorer";
import ChainOfCustodyPage from "./pages/ChainOfCustodyPage";

type Tab = "command" | "network" | "custody";

export default function App() {
  const [tab, setTab] = useState<Tab>("command");

  const tabs: { id: Tab; label: string }[] = [
    { id: "command", label: "Command Center" },
    { id: "network", label: "Mule Network" },
    { id: "custody", label: "Chain of Custody" },
  ];

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Floating Header Tab Switcher */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex bg-command-panel/90 backdrop-blur border border-command-border rounded-full p-1 text-xs shadow-2xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-full font-bold transition-all ${
              tab === t.id ? "bg-sky-600 text-white shadow-md shadow-sky-500/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "command" && <CommandCenter />}
      {tab === "network" && <MuleNetworkExplorer />}
      {tab === "custody" && <ChainOfCustodyPage />}
    </div>
  );
}
