// src/pages/MuleNetworkExplorer.tsx
import { useEffect, useState } from "react";
import MuleNetworkGraph from "../components/MuleNetworkGraph";
import type { GraphData } from "../types-graph";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function MuleNetworkExplorer() {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/graph/network`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load mule network:", err);
        setLoading(false);
      });
  }, []);

  const accountCount = data.nodes.filter((n) => n.type === "account").length;
  const complaintCount = data.nodes.filter((n) => n.type === "complaint").length;

  return (
    <div className="min-h-screen bg-command-bg text-white p-6 pt-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Mule Network Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            {accountCount} mule accounts linked to {complaintCount} complaints. Drag nodes to inspect relationships, scroll to zoom.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs bg-command-panel/40 border border-command-border px-4 py-2.5 rounded-xl">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> High risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> Medium risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400 inline-block" /> Mule account
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 inline-block" /> Complaint
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[500px] border border-dashed border-command-border rounded-xl">
          <div className="text-slate-500 text-sm animate-pulse">Loading relational network mapping...</div>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl">
          <MuleNetworkGraph data={data} width={1100} height={600} />
        </div>
      )}
    </div>
  );
}
