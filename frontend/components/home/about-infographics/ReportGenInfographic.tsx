"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

function CheckboxList({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={64} height={52} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.2} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(8, ${10 + i * 14})`}>
          <rect x={0} y={0} width={10} height={10} rx={2} fill="none" stroke={i === 0 ? "#34d399" : "#6b7280"} strokeWidth={1.2} />
          {i === 0 ? (
            <path d="M2 5 L4.5 7.5 L8 3" fill="none" stroke="#34d399" strokeWidth={1.2} />
          ) : null}
          <rect x={14} y={2} width={36} height={4} rx={2} fill="#6b7280" />
        </g>
      ))}
    </g>
  );
}

function ProgressBar({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={72} height={36} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.2} />
      <rect x={8} y={10} width={56} height={6} rx={3} fill="#374151" />
      <rect x={8} y={10} width={38} height={6} rx={3} fill="#6366f1" />
      <text x={36} y={28} textAnchor="middle" fill="#9ca3af" fontSize={8}>
        68%
      </text>
    </g>
  );
}

function WarningBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={52} height={52} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.2} />
      <path
        d="M26 12 L38 38 H14 Z"
        fill="none"
        stroke="#fbbf24"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <line x1={26} y1={20} x2={26} y2={30} stroke="#fbbf24" strokeWidth={1.5} />
      <circle cx={26} cy={34} r={1.5} fill="#fbbf24" />
    </g>
  );
}

export function ReportGenInfographic() {
  const { ref, visible } = useInfographicReveal();

  return (
    <InfographicFrame ref={ref} label="체크리스트·진행률·리스크를 리포트 한 장으로 조립하는 흐름">
      <svg viewBox="0 0 480 220" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="report-arrowhead" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Step 0 — 흩어진 요소 */}
        <g style={infographicStepStyle(0, visible)}>
          <CheckboxList x={16} y={24} />
          <ProgressBar x={20} y={92} />
          <WarningBadge x={28} y={148} />
        </g>

        {/* Step 1 — 조립 화살표 */}
        <g style={infographicStepStyle(1, visible)}>
          <path
            d="M88 50 C 140 50, 150 110, 190 110"
            fill="none"
            stroke="#6b7280"
            strokeWidth={1.5}
            markerEnd="url(#report-arrowhead)"
          />
          <path
            d="M92 110 L 190 110"
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            markerEnd="url(#report-arrowhead)"
          />
          <path
            d="M88 170 C 140 170, 150 110, 190 110"
            fill="none"
            stroke="#6b7280"
            strokeWidth={1.5}
            markerEnd="url(#report-arrowhead)"
          />
          <g transform="translate(196, 96)">
            <circle cx={12} cy={14} r={12} fill="#312e81" stroke="#6366f1" strokeWidth={1.5} />
            <path d="M8 14 L11 17 L16 11" fill="none" stroke="#6366f1" strokeWidth={1.5} strokeLinecap="round" />
          </g>
          <path
            d="M222 110 L 268 110"
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            markerEnd="url(#report-arrowhead)"
          />
        </g>

        {/* Step 2 — 리포트 페이지 */}
        <g style={infographicStepStyle(2, visible)}>
          <rect
            x={272}
            y={28}
            width={168}
            height={164}
            rx={10}
            fill="#111827"
            stroke="#6366f1"
            strokeWidth={1.5}
          />
          {/* 제목바 */}
          <rect x={284} y={40} width={96} height={8} rx={4} fill="#6366f1" opacity={0.85} />
          <rect x={284} y={54} width={64} height={4} rx={2} fill="#4b5563" />
          {/* 진행률 */}
          <rect x={284} y={68} width={144} height={6} rx={3} fill="#374151" />
          <rect x={284} y={68} width={98} height={6} rx={3} fill="#6366f1" />
          <text x={432} y={74} fill="#9ca3af" fontSize={7} textAnchor="end">
            68%
          </text>
          {/* 체크리스트 */}
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(284, ${84 + i * 16})`}>
              <rect x={0} y={0} width={10} height={10} rx={2} fill="none" stroke="#34d399" strokeWidth={1.2} />
              <path d="M2 5 L4.5 7.5 L8 3" fill="none" stroke="#34d399" strokeWidth={1.2} />
              <rect x={14} y={2} width={80} height={4} rx={2} fill="#6b7280" />
            </g>
          ))}
          {/* 리스크 배지 */}
          <rect x={284} y={136} width={72} height={18} rx={6} fill="#064e3b" stroke="#34d399" strokeWidth={1} />
          <text x={320} y={148} textAnchor="middle" fill="#34d399" fontSize={8}>
            리스크 1건
          </text>
          <rect x={362} y={136} width={66} height={18} rx={6} fill="#312e81" stroke="#6366f1" strokeWidth={1} />
          <text x={395} y={148} textAnchor="middle" fill="#a5b4fc" fontSize={8}>
            Next action
          </text>
          <text x={356} y={198} textAnchor="middle" fill="#a5b4fc" fontSize={10} fontWeight={500}>
            주간 리포트
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
