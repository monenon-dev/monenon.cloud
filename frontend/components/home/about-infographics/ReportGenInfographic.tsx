"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

/** 쌓인 일일 브리핑 카드 스택 */
function BriefingStack({ x, y }: { x: number; y: number }) {
  const cards = [
    { dx: 10, dy: 10, opacity: 0.3 },
    { dx: 5, dy: 5, opacity: 0.55 },
    { dx: 0, dy: 0, opacity: 1 },
  ];
  return (
    <g transform={`translate(${x}, ${y})`}>
      {cards.map((c, i) => (
        <g key={i} opacity={c.opacity}>
          <rect x={c.dx} y={c.dy} width={88} height={64} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.2} />
          <rect x={c.dx + 8} y={c.dy + 12} width={52} height={5} rx={2.5} fill="#6366f1" opacity={0.7} />
          <rect x={c.dx + 8} y={c.dy + 23} width={68} height={4} rx={2} fill="#4b5563" />
          <rect x={c.dx + 8} y={c.dy + 32} width={58} height={4} rx={2} fill="#4b5563" />
          <rect x={c.dx + 8} y={c.dy + 41} width={44} height={4} rx={2} fill="#4b5563" />
        </g>
      ))}
    </g>
  );
}

/** 막대 + 곡선 + 경고 아이콘 차트 */
function ReportChart({ x, y }: { x: number; y: number }) {
  const bars = [42, 58, 36, 70, 82, 64, 90, 76];
  const barW = 18;
  const gap = 6;
  const chartH = 110;
  const chartW = bars.length * (barW + gap) - gap;

  // 곡선 포인트
  const points = bars.map((h, i) => ({
    px: i * (barW + gap) + barW / 2,
    py: chartH - h,
  }));
  const curvePath = points
    .map((p, i) =>
      i === 0 ? `M${p.px},${p.py}` : `S${p.px - 10},${p.py} ${p.px},${p.py}`
    )
    .join(" ");

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 막대 */}
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * (barW + gap)}
          y={chartH - h}
          width={barW}
          height={h}
          rx={3}
          fill="#6366f1"
          opacity={0.6 + i * 0.04}
        />
      ))}
      {/* 추세 곡선 */}
      <path d={curvePath} fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
      {/* 경고 아이콘 (마지막 바 위) */}
      <g transform={`translate(${chartW - 14}, ${chartH - bars[bars.length - 1] - 38})`}>
        <circle cx={14} cy={14} r={13} fill="#1f2937" stroke="#fbbf24" strokeWidth={1.5} />
        <line x1={14} y1={7} x2={14} y2={16} stroke="#fbbf24" strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={14} cy={20} r={2} fill="#fbbf24" />
      </g>
      {/* 라벨 */}
      <rect x={0} y={chartH + 6} width={chartW} height={1} stroke="#374151" />
    </g>
  );
}

export function ReportGenInfographic() {
  const { ref, visible } = useInfographicReveal();

  return (
    <InfographicFrame ref={ref} label="일일 브리핑 스택에서 주간 리포트를 생성하는 흐름">
      <svg viewBox="0 0 480 240" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="report-arrowhead" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Step 0 — 쌓인 일일 브리핑 카드 */}
        <g style={infographicStepStyle(0, visible)}>
          <BriefingStack x={16} y={80} />
          <text x={59} y={172} textAnchor="middle" fill="#9ca3af" fontSize={10}>
            일일 브리핑 ×5
          </text>
        </g>

        {/* Step 1 — 화살표 */}
        <g style={infographicStepStyle(1, visible)}>
          <path
            d="M120 112 L 162 112"
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.8}
            markerEnd="url(#report-arrowhead)"
          />
          {/* 조립 노드 */}
          <circle cx={175} cy={112} r={12} fill="#312e81" stroke="#6366f1" strokeWidth={1.5} />
          <path d="M170 112 L173 115 L180 108" fill="none" stroke="#6366f1" strokeWidth={1.5} strokeLinecap="round" />
          <path
            d="M188 112 L 218 112"
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.8}
            markerEnd="url(#report-arrowhead)"
          />
        </g>

        {/* Step 2 — 막대차트 리포트 */}
        <g style={infographicStepStyle(2, visible)}>
          <ReportChart x={224} y={62} />
          <text x={352} y={222} textAnchor="middle" fill="#a5b4fc" fontSize={11} fontWeight={500}>
            주간 리포트
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
