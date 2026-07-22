"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

function AgentNode({
  x,
  y,
  label,
  accent = false,
}: {
  x: number;
  y: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0}
        y={0}
        width={88}
        height={32}
        rx={8}
        fill={accent ? "#312e81" : "#1f2937"}
        stroke={accent ? "#6366f1" : "#4b5563"}
        strokeWidth={1.5}
      />
      <text
        x={44}
        y={20}
        textAnchor="middle"
        fill={accent ? "#c7d2fe" : "#9ca3af"}
        fontSize={9}
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </g>
  );
}

function GraphEdge({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="#6b7280"
      strokeWidth={1.5}
      strokeLinecap="round"
      markerEnd="url(#multi-agent-arrow)"
    />
  );
}

export function MultiAgentInfographic() {
  const { ref, visible } = useInfographicReveal();

  return (
    <InfographicFrame ref={ref} label="Router에서 여러 에이전트로 분기하는 LangGraph 구조">
      <svg viewBox="0 0 480 240" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="multi-agent-arrow" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        <g style={infographicStepStyle(0, visible)}>
          <AgentNode x={196} y={16} label="Router" accent />
          <circle cx={240} cy={48} r={4} fill="#6366f1" />
        </g>

        <g style={infographicStepStyle(1, visible)}>
          <GraphEdge d="M240 48 L 240 72" />
          <GraphEdge d="M240 72 L 80 100" />
          <GraphEdge d="M240 72 L 196 100" />
          <GraphEdge d="M240 72 L 312 100" />
          <GraphEdge d="M240 72 L 392 100" />
          <circle cx={240} cy={72} r={6} fill="#312e81" stroke="#6366f1" strokeWidth={1.5} />
        </g>

        <g style={infographicStepStyle(2, visible)}>
          <AgentNode x={36} y={108} label="Briefing Agent" />
          <AgentNode x={152} y={108} label="Doc Agent" />
          <AgentNode x={268} y={108} label="Report Agent" />
          <AgentNode x={348} y={108} label="Mail Agent" />
        </g>

        <g style={infographicStepStyle(3, visible)}>
          <GraphEdge d="M80 140 L 80 168" />
          <GraphEdge d="M196 140 L 196 168" />
          <GraphEdge d="M312 140 L 312 168" />
          <GraphEdge d="M392 140 L 392 168" />
          <rect x={120} y={176} width={240} height={40} rx={10} fill="#111827" stroke="#6366f1" strokeWidth={1.5} />
          <text x={240} y={194} textAnchor="middle" fill="#818cf8" fontSize={9}>
            tool calls · state graph
          </text>
          <text x={240} y={208} textAnchor="middle" fill="#6b7280" fontSize={8}>
            LangGraph orchestration
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
