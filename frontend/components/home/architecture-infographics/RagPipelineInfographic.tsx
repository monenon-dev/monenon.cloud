"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

// 실제 구현(moneyball/rag_retriever.py) 기준 5단계
// 1. 텍스트 청크  2. Ollama 임베딩  3. pgvector 저장(ivfflat)  4. 코사인 top-k 검색  5. Gemini 답변 생성
// 리랭킹 없음 / KiwiPiePy 미사용(orchestration 기준)

const PIPELINE_STEPS = [
  { label: "텍스트\n청크", tech: "DB rows" },
  { label: "임베딩", tech: "Ollama\nnomic-embed" },
  { label: "벡터\n저장", tech: "pgvector\nivfflat" },
  { label: "top-k\n검색", tech: "cosine\nsimilarity" },
  { label: "답변\n생성", tech: "Gemini" },
];

const BOX_W = 64;
const BOX_H = 58;

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
  const labelLines = label.split("\n");
  const techLines = tech.split("\n");
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={BOX_W} height={BOX_H} rx={8}
        fill={accent ? "#312e81" : "#1f2937"}
        stroke={accent ? "#6366f1" : "#4b5563"}
        strokeWidth={1.5}
      />
      {labelLines.map((line, i) => (
        <text key={line + i} x={BOX_W / 2} y={16 + i * 11} textAnchor="middle"
          fill={accent ? "#c7d2fe" : "#d1d5db"} fontSize={8}>
          {line}
        </text>
      ))}
      {techLines.map((line, i) => (
        <text key={"t" + i} x={BOX_W / 2} y={38 + i * 9} textAnchor="middle"
          fill="#6366f1" fontSize={7} opacity={0.9}>
          {line}
        </text>
      ))}
    </g>
  );
}

export function RagPipelineInfographic() {
  const { ref, visible } = useInfographicReveal();

  const total = PIPELINE_STEPS.length;
  // 5개 박스를 viewBox 480 안에 고르게 배치
  const totalW = total * BOX_W + (total - 1) * 14;
  const startX = Math.round((480 - totalW) / 2);
  const step = BOX_W + 14;
  const startY = 28;

  return (
    <InfographicFrame ref={ref} label="텍스트 청크 → Ollama 임베딩 → pgvector 저장 → top-k 검색 → Gemini 생성">
      <svg viewBox="0 0 480 120" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="rag-arrow" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        <g style={infographicStepStyle(0, visible)}>
          <text x={240} y={16} textAnchor="middle" fill="#6b7280" fontSize={9}>
            ingest → embed → store → retrieve → generate
          </text>
        </g>

        {PIPELINE_STEPS.map((step_, i) => (
          <g key={step_.label} style={infographicStepStyle(i + 1, visible)}>
            <PipelineBox
              x={startX + i * step}
              y={startY}
              label={step_.label}
              tech={step_.tech}
              accent={i === total - 1}
            />
            {i < total - 1 ? (
              <path
                d={`M${startX + i * step + BOX_W} ${startY + BOX_H / 2} L${startX + (i + 1) * step - 1} ${startY + BOX_H / 2}`}
                fill="none" stroke="#6b7280" strokeWidth={1.5}
                markerEnd="url(#rag-arrow)"
              />
            ) : null}
          </g>
        ))}
      </svg>
    </InfographicFrame>
  );
}
