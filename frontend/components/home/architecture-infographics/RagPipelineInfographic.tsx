"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

const PIPELINE_STEPS = [
  { label: "문서\n입력", tech: "PDF·CSV" },
  { label: "청킹", tech: "KiwiPiePy" },
  { label: "임베딩", tech: "Gemini" },
  { label: "벡터\n검색", tech: "pgvector" },
  { label: "리랭킹", tech: "score" },
  { label: "답변\n생성", tech: "RAG" },
];

function PipelineBox({
  x,
  y,
  label,
  tech,
  accent = false,
}: {
  x: number;
  y: number;
  label: string;
  tech: string;
  accent?: boolean;
}) {
  const lines = label.split("\n");
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0}
        y={0}
        width={58}
        height={52}
        rx={8}
        fill={accent ? "#312e81" : "#1f2937"}
        stroke={accent ? "#6366f1" : "#4b5563"}
        strokeWidth={1.5}
      />
      {lines.map((line, i) => (
        <text
          key={line}
          x={29}
          y={18 + i * 11}
          textAnchor="middle"
          fill={accent ? "#c7d2fe" : "#d1d5db"}
          fontSize={8}
        >
          {line}
        </text>
      ))}
      <text x={29} y={44} textAnchor="middle" fill="#6366f1" fontSize={7} opacity={0.85}>
        {tech}
      </text>
    </g>
  );
}

export function RagPipelineInfographic() {
  const { ref, visible } = useInfographicReveal();

  return (
    <InfographicFrame ref={ref} label="문서 입력부터 답변 생성까지 RAG 파이프라인 6단계">
      <svg viewBox="0 0 480 120" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="rag-arrow" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {PIPELINE_STEPS.map((step, i) => (
          <g key={step.label} style={infographicStepStyle(i, visible)}>
            <PipelineBox
              x={8 + i * 76}
              y={24}
              label={step.label}
              tech={step.tech}
              accent={i === PIPELINE_STEPS.length - 1}
            />
            {i < PIPELINE_STEPS.length - 1 ? (
              <path
                d={`M${66 + i * 76} 50 L${84 + i * 76} 50`}
                fill="none"
                stroke="#6b7280"
                strokeWidth={1.5}
                markerEnd="url(#rag-arrow)"
              />
            ) : null}
          </g>
        ))}

        <g style={infographicStepStyle(6, visible)}>
          <text x={240} y={14} textAnchor="middle" fill="#6b7280" fontSize={9}>
            ingest → retrieve → generate
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
