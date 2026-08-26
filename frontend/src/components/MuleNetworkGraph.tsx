// src/components/MuleNetworkGraph.tsx
//
// Interactive force-directed graph of the mule-account network, built
// directly with d3-force. Supports focus neighbor dimming, drag physics,
// dynamic edge sizing, and selection callbacks.

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { GraphData, GraphNode, GraphEdge } from "../types-graph";

interface Props {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
}

function riskColor(riskScore: number | undefined): string {
  const r = riskScore ?? 0;
  if (r > 0.8) return "#ef4444"; // high risk red
  if (r > 0.5) return "#f59e0b"; // warning amber
  return "#38bdf8"; // sky blue for accounts with low/no computed risk yet
}

export default function MuleNetworkGraph({ data, width = 900, height = 600, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // clear on re-render

    // d3-force mutates node/edge objects, so clone to avoid mutating props directly.
    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const edges: (GraphEdge & { source: any; target: any })[] = data.edges.map((e) => ({ ...e }));

    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(edges as any)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(26));

    const g = svg.append("g");

    // Zoom/pan support
    svg.call(
      d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on("zoom", (event) => {
        g.attr("transform", event.transform);
      }) as any
    );

    const link = g
      .append("g")
      .attr("stroke", "#334155")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke-width", (d) => Math.max(1.5, Math.log10(d.amount) - 2));

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<any, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    // Node circles styling
    node
      .append("circle")
      .attr("r", (d) => (d.type === "account" ? 14 : 8))
      .attr("fill", (d) => (d.type === "account" ? riskColor(d.risk_score) : "#94a3b8"))
      .attr("stroke", "#0b1120")
      .attr("stroke-width", 2);

    // Text labels
    node
      .append("text")
      .text((d) => d.label)
      .attr("x", 0)
      .attr("y", (d) => (d.type === "account" ? 26 : 18))
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("font-weight", "500")
      .attr("fill", "#94a3b8");

    // Dynamic Hover Neighborhood Highlighting & Click callbacks
    node
      .on("mouseover", (_, d: any) => {
        const neighbors = new Set<string>();
        neighbors.add(d.id);

        edges.forEach((edge) => {
          if (edge.source.id === d.id) {
            neighbors.add(edge.target.id);
          } else if (edge.target.id === d.id) {
            neighbors.add(edge.source.id);
          }
        });

        // Dim non-neighbors
        node.style("opacity", (n: any) => (neighbors.has(n.id) ? 1.0 : 0.15));
        link
          .style("stroke-opacity", (e: any) => (e.source.id === d.id || e.target.id === d.id ? 1.0 : 0.08))
          .style("stroke", (e: any) => (e.source.id === d.id || e.target.id === d.id ? "#38bdf8" : "#334155"));
      })
      .on("mouseout", () => {
        // Reset opacities
        node.style("opacity", 1.0);
        link.style("stroke-opacity", 0.6).style("stroke", "#334155");
      })
      .on("click", (_, d) => {
        if (onNodeClick) {
          onNodeClick(d);
        }
      });

    node.append("title").text((d) =>
      d.type === "account"
        ? `Mule account (bank: ${d.bank})\nRisk score: ${(d.risk_score ?? 0).toFixed(2)}`
        : `Complaint (bank: ${d.bank})\nAmount lost: ₹${(d.amount_lost ?? 0).toLocaleString("en-IN")}`
    );

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, width, height, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="bg-command-bg rounded-xl border border-command-border w-full"
    />
  );
}
