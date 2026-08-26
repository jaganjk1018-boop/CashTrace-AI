// src/pages/MuleNetworkExplorer.tsx
//
// Relational network graph explorer page. Includes graph metrics cards
// (capital, hubs, centralities) and an interactive side-drawer node inspector
// for forensic auditing of mule clusters.

import { useEffect, useState } from "react";
import MuleNetworkGraph from "../components/MuleNetworkGraph";
import type { GraphData, GraphNode } from "../types-graph";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function MuleNetworkExplorer() {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

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

  // Graph Theory Math
  const totalVolume = data.edges.reduce((sum, edge) => sum + Number(edge.amount), 0);
  
  const muleNodes = data.nodes.filter((n) => n.type === "account");
  const avgRisk = muleNodes.length > 0
    ? (muleNodes.reduce((sum, n) => sum + (n.risk_score ?? 0), 0) / muleNodes.length) * 100
    : 0;

  // Compute Node Degree Centrality (links count per node)
  const degrees: Record<string, number> = {};
  data.edges.forEach((edge) => {
    degrees[edge.source] = (degrees[edge.source] || 0) + 1;
    degrees[edge.target] = (degrees[edge.target] || 0) + 1;
  });

  const topHubs = data.nodes
    .filter((n) => n.type === "account")
    .map((n) => ({ ...n, degree: degrees[n.id] || 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 3);

  // Inspector Details
  const connectedTxns = selectedNode
    ? data.edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
    : [];

  return (
    <div className="min-h-screen bg-command-bg text-white p-6 pt-16 flex flex-col gap-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>🕸️</span> Mule Network Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Relational transaction analysis of {accountCount} mule accounts and {complaintCount} linked incident files.
          </p>
        </div>
        <div className="flex flex-wrap gap-3.5 text-[10px] bg-command-panel/40 border border-command-border px-4 py-2.5 rounded-xl font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> HIGH RISK
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> WARNING
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> MULE ACCOUNTS
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> COMPLAINTS
          </span>
        </div>
      </div>

      {/* Network Metrics Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-command-panel/20 border border-command-border/40 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Traced Capital Volume</span>
          <span className="text-lg font-black text-slate-100">₹{totalVolume.toLocaleString("en-IN")}</span>
          <span className="text-[9px] text-slate-400">Total fund movement in graph</span>
        </div>
        <div className="bg-command-panel/20 border border-command-border/40 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Average Mule Risk Index</span>
          <span className="text-lg font-black text-amber-400">{avgRisk.toFixed(1)}%</span>
          <span className="text-[9px] text-slate-400">Overall risk density across nodes</span>
        </div>
        <div className="bg-command-panel/20 border border-command-border/40 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mule-to-Victim Ratio</span>
          <span className="text-lg font-black text-sky-400">
            {complaintCount > 0 ? (accountCount / complaintCount).toFixed(2) : "0.00"}
          </span>
          <span className="text-[9px] text-slate-400">Average accounts per complaint</span>
        </div>
        <div className="bg-command-panel/20 border border-command-border/40 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top Degree Hub</span>
          <span className="text-lg font-black text-red-400 truncate">
            {topHubs[0] ? `****${topHubs[0].label.slice(-4)}` : "None"}
          </span>
          <span className="text-[9px] text-slate-400">
            Connected to {topHubs[0]?.degree || 0} unique victims
          </span>
        </div>
      </div>

      {/* Main Graph Work Area */}
      {loading ? (
        <div className="flex items-center justify-center h-[520px] border border-dashed border-command-border rounded-xl">
          <div className="text-slate-500 text-sm animate-pulse">Loading relational network mapping...</div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full relative">
          
          {/* D3 Graph Workspace */}
          <div className="flex-1 w-full bg-command-bg rounded-xl overflow-hidden relative border border-command-border shadow-inner">
            <MuleNetworkGraph 
              data={data} 
              width={1100} 
              height={550} 
              onNodeClick={(node) => setSelectedNode(node)}
            />
            <div className="absolute bottom-3 left-4 text-[9px] text-slate-500 pointer-events-none">
              💡 Drag nodes to isolate groups. Scroll to zoom. Click node to inspect details.
            </div>
          </div>

          {/* Sliding Node Inspector Sidebar */}
          {selectedNode && (
            <aside className="w-full lg:w-96 shrink-0 bg-command-panel border border-command-border rounded-xl p-4 shadow-2xl flex flex-col gap-4 animate-fade-in relative z-20">
              <div className="flex justify-between items-center pb-2 border-b border-command-border/60">
                <span className="text-xs font-extrabold text-sky-400 uppercase tracking-widest">
                  🔎 Node Forensic Inspector
                </span>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Node Overview Details */}
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Entity Label / Identifier</label>
                  <div className="text-sm font-bold text-slate-100">{selectedNode.label}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Type</label>
                    <div className="text-xs font-semibold capitalize text-slate-300">{selectedNode.type}</div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Associated Institution</label>
                    <div className="text-xs font-semibold text-slate-300">{selectedNode.bank}</div>
                  </div>
                </div>

                {selectedNode.type === "account" ? (
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Computed Risk Score</label>
                    <div className={`text-xs font-bold ${
                      (selectedNode.risk_score ?? 0) > 0.8 ? "text-red-400" : "text-amber-400"
                    }`}>
                      {((selectedNode.risk_score ?? 0) * 100).toFixed(1)}% Risk
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Reported Amount Lost</label>
                    <div className="text-xs font-bold text-red-400">
                      ₹{(selectedNode.amount_lost ?? 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                )}
              </div>

              {/* Connected Cases Ledger list */}
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[9px] font-bold text-slate-500 uppercase block">
                  Linked Transactions ({connectedTxns.length})
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {connectedTxns.map((tx, idx) => {
                    const counterparty = tx.source === selectedNode.id ? tx.target : tx.source;
                    return (
                      <div key={idx} className="bg-command-bg/40 border border-command-border/40 rounded-lg p-2.5 text-[10px] space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-300">Target: ****{counterparty.slice(-4)}</span>
                          <span className="text-emerald-400">₹{tx.amount.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {new Date(tx.txn_time).toLocaleString("en-IN")}
                        </div>
                      </div>
                    );
                  })}
                  {connectedTxns.length === 0 && (
                    <div className="text-slate-500 text-[11px] italic py-4 text-center">
                      No transactions indexed.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}

        </div>
      )}

    </div>
  );
}
