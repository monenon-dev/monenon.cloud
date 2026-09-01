"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TraceEdge,
  TraceNodeDef,
  TraceNodeId,
  TraceNodeStatus,
} from "@/components/demo/scenarios";

export type AgentTraceGraphProps = {
  nodes: TraceNodeDef[];
  edges: TraceEdge[];
  statusById: Partial<Record<TraceNodeId, TraceNodeStatus>>;
  className?: string;
};

type LayoutNode = TraceNodeDef & { x: number; y: number };

const DESKTOP_COL_X = [24, 170, 316];
const DESKTOP_ROW_Y = [36, 110, 184, 258];
const NODE_W = 108;
const NODE_H = 40;

function layoutNodes(nodes: TraceNodeDef[], compact: boolean): LayoutNode[] {
  if (compact) {
    const x = 58;
    const startY = 26;
    const gapY = 22;
    return nodes.map((n, index) => ({
      ...n,
      x,
      y: startY + index * (NODE_H + gapY),
    }));
  }

  return nodes.map((n) => ({
    ...n,
    x: DESKTOP_COL_X[n.column] ?? 170,
    y: DESKTOP_ROW_Y[n.row] ?? 110,
  }));
}

function nodeCenter(n: LayoutNode) {
  return { cx: n.x + NODE_W / 2, cy: n.y + NODE_H / 2 };
}

function edgePoints(a: LayoutNode, b: LayoutNode) {
  const ac = nodeCenter(a);
  const bc = nodeCenter(b);
  const dx = bc.cx - ac.cx;
  const dy = bc.cy - ac.cy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x1: dx >= 0 ? a.x + NODE_W - 8 : a.x + 8,
      y1: ac.cy,
      x2: dx >= 0 ? b.x + 8 : b.x + NODE_W - 8,
      y2: bc.cy,
    };
  }

  return {
    x1: ac.cx,
    y1: dy >= 0 ? a.y + NODE_H - 6 : a.y + 6,
    x2: bc.cx,
    y2: dy >= 0 ? b.y + 6 : b.y + NODE_H - 6,
  };
}

/**
 * LangGraph-style directed graph (pure SVG — no react-flow dependency).
 * Optional later: `npm i @xyflow/react` and swap this implementation.
 */
export function AgentTraceGraph({
  nodes,
  edges,
  statusById,
  className = "",
}: AgentTraceGraphProps) {
  const [ui, setUi] = useState({ hoverId: null as TraceNodeId | null });
  const [compact, setCompact] = useState(false);
  const tipId = "moneo-trace";
  const laid = useMemo(() => layoutNodes(nodes, compact), [nodes, compact]);
  const byId = useMemo(() => {
    const m = new Map<TraceNodeId, LayoutNode>();
    for (const n of laid) m.set(n.id, n);
    return m;
  }, [laid]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const width = compact ? 220 : 448;
  const height = Math.max(160, ...laid.map((n) => n.y + NODE_H + 28));
  const hover = ui.hoverId ? byId.get(ui.hoverId) : null;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(12,12,20,0.85)] ${className}`}
      aria-label="Agent Trace"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300/80">
          agent trace · langgraph
        </p>
        <p className="hidden text-[10px] text-zinc-500 sm:block">
          Router → Calendar / Docs → Synthesizer
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="멀티에이전트 오케스트레이션 그래프"
      >
        <defs>
          <marker
            id={`${tipId}-arrow`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="rgba(165,180,252,0.45)" />
          </marker>
          <filter id={`${tipId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const pts = edgePoints(a, b);
          const fromDone =
            statusById[e.from] === "active" || statusById[e.from] === "done";
          const toLit =
            statusById[e.to] === "active" || statusById[e.to] === "done";
          const activeEdge = fromDone && toLit;
          return (
            <line
              key={`${e.from}-${e.to}`}
              x1={pts.x1}
              y1={pts.y1}
              x2={pts.x2}
              y2={pts.y2}
              stroke={
                activeEdge
                  ? "rgba(129,140,248,0.55)"
                  : "rgba(255,255,255,0.12)"
              }
              strokeWidth={activeEdge ? 1.6 : 1}
              markerEnd={`url(#${tipId}-arrow)`}
            />
          );
        })}

        {laid.map((n) => {
          const status = statusById[n.id] ?? "idle";
          const isActive = status === "active";
          const isDone = status === "done";
          const fill = isActive
            ? "rgba(99,102,241,0.28)"
            : isDone
              ? "rgba(16,185,129,0.14)"
              : "rgba(255,255,255,0.03)";
          const stroke = isActive
            ? "rgba(129,140,248,0.9)"
            : isDone
              ? "rgba(52,211,153,0.55)"
              : "rgba(255,255,255,0.12)";
          const textOpacity = status === "idle" ? 0.45 : 1;

          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              onMouseEnter={() => setUi({ hoverId: n.id })}
              onMouseLeave={() => setUi({ hoverId: null })}
              className="cursor-default"
              filter={isActive ? `url(#${tipId}-glow)` : undefined}
            >
              {isActive ? (
                <rect
                  x={-3}
                  y={-3}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  rx={10}
                  fill="none"
                  stroke="rgba(99,102,241,0.45)"
                  strokeWidth={1.5}
                  className="animate-pulse"
                />
              ) : null}
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.25}
              />
              <text
                x={NODE_W / 2 - (isDone ? 6 : 0)}
                y={NODE_H / 2 + 4}
                textAnchor="middle"
                fill={`rgba(226,232,240,${textOpacity})`}
                fontSize={11}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {n.label}
              </text>
              {isDone ? (
                <g transform={`translate(${NODE_W - 16}, 12)`}>
                  <circle r={7} fill="rgba(16,185,129,0.25)" />
                  <path
                    d="M-3 0 L-0.5 2.5 L3.5 -2"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                  />
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hover ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-[11px] leading-relaxed text-indigo-100/90"
        >
          <span className="font-mono text-indigo-300">{hover.label}</span>
          <span className="mx-1.5 text-indigo-400/50">·</span>
          {hover.description}
        </div>
      ) : null}
    </div>
  );
}

/** Reduce timeline node activations into a status map. */
export function applyTraceActivation(
  prev: Partial<Record<TraceNodeId, TraceNodeStatus>>,
  opts: { activate?: TraceNodeId; complete?: TraceNodeId; finishAll?: boolean }
): Partial<Record<TraceNodeId, TraceNodeStatus>> {
  const next = { ...prev };
  if (opts.activate) {
    for (const [k, v] of Object.entries(next)) {
      if (v === "active") next[k as TraceNodeId] = "done";
    }
    next[opts.activate] = "active";
  }
  if (opts.complete) {
    next[opts.complete] = "done";
  }
  if (opts.finishAll) {
    for (const k of Object.keys(next)) {
      next[k as TraceNodeId] = "done";
    }
    next.synthesizer = "done";
    next.router = "done";
  }
  return next;
}
