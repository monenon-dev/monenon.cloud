"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

export function ChatInfographic() {
  const { ref, visible } = useInfographicReveal();

  // viewBox 480×240
  // 왼쪽 말풍선 (사용자): 중심 (148, 100)  크기 200×90
  // 오른쪽 말풍선 (AI): 중심 (332, 140)  크기 200×90
  // 스파크 연결점: (240, 120)

  return (
    <InfographicFrame ref={ref} label="사용자 질문과 AI 즉시 응답이 연결되는 흐름">
      <svg viewBox="0 0 480 240" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="chat-arrowhead" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Step 0 — 사용자 말풍선 */}
        <g style={infographicStepStyle(0, visible)}>
          {/* 말풍선 본체 */}
          <rect x={28} y={48} width={200} height={90} rx={16} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
          {/* 말풍선 꼬리 (우하단) */}
          <path d="M195 138 L220 154 L200 138 Z" fill="#1f2937" />
          {/* 내용 라인 */}
          <rect x={46} y={70} width={140} height={6} rx={3} fill="#6b7280" />
          <rect x={46} y={84} width={120} height={6} rx={3} fill="#6b7280" />
          <rect x={46} y={98} width={100} height={6} rx={3} fill="#6366f1" opacity={0.6} />
          {/* 라벨 */}
          <text x={128} y={158} textAnchor="middle" fill="#9ca3af" fontSize={10}>
            오늘 브리핑 보여줘
          </text>
        </g>

        {/* Step 1 — 스파크 연결 */}
        <g style={infographicStepStyle(1, visible)}>
          {/* 연결선 */}
          <path
            d="M228 120 L 252 120"
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            markerEnd="url(#chat-arrowhead)"
          />
          {/* 스파크 */}
          <circle cx={240} cy={120} r={10} fill="#312e81" stroke="#6366f1" strokeWidth={1.5} />
          <path
            d="M235 123 L239 116 L242 121 L246 114 L248 123"
            fill="none"
            stroke="#fbbf24"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Step 2 — AI 응답 말풍선 */}
        <g style={infographicStepStyle(2, visible)}>
          {/* 말풍선 본체 */}
          <rect x={252} y={102} width={200} height={90} rx={16} fill="#1e1b4b" stroke="#6366f1" strokeWidth={1.5} />
          {/* 말풍선 꼬리 (좌상단) */}
          <path d="M285 102 L260 88 L280 102 Z" fill="#1e1b4b" />
          {/* 내용 라인 */}
          <rect x={270} y={124} width={130} height={6} rx={3} fill="#6366f1" opacity={0.8} />
          <rect x={270} y={138} width={150} height={6} rx={3} fill="#4b5563" />
          <rect x={270} y={152} width={110} height={6} rx={3} fill="#4b5563" />
          {/* 라벨 */}
          <text x={352} y={212} textAnchor="middle" fill="#a5b4fc" fontSize={10}>
            즉시 응답
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
