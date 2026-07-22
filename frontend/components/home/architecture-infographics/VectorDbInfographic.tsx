"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

function PostgresIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse cx={36} cy={14} rx={28} ry={10} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
      <rect x={8} y={14} width={56} height={36} fill="#1f2937" stroke="#6b7280" strokeWidth={1.5} />
      <ellipse cx={36} cy={50} rx={28} ry={10} fill="#111827" stroke="#6b7280" strokeWidth={1.5} />
      <text x={36} y={36} textAnchor="middle" fill="#6366f1" fontSize={9} fontWeight={600}>
        PostgreSQL
      </text>
    </g>
  );
}

function TableIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={72} height={48} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <line x1={0} y1={14} x2={72} y2={14} stroke="#4b5563" strokeWidth={1} />
      <line x1={24} y1={14} x2={24} y2={48} stroke="#4b5563" strokeWidth={1} />
      <line x1={48} y1={14} x2={48} y2={48} stroke="#4b5563" strokeWidth={1} />
      <text x={36} y={62} textAnchor="middle" fill="#9ca3af" fontSize={8}>
        관계형 데이터
      </text>
      <text x={36} y={72} textAnchor="middle" fill="#6366f1" fontSize={7}>
        SQLAlchemy
      </text>
    </g>
  );
}

function VectorCluster({ x, y }: { x: number; y: number }) {
  const dots = [
    [12, 18],
    [28, 10],
    [44, 20],
    [20, 32],
    [38, 34],
    [52, 28],
  ];
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={72} height={48} rx={8} fill="#1f2937" stroke="#6366f1" strokeWidth={1.5} />
      {dots.map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r={3} fill="#6366f1" opacity={0.5 + (i % 3) * 0.15} />
      ))}
      <text x={36} y={62} textAnchor="middle" fill="#9ca3af" fontSize={8}>
        벡터 검색
      </text>
      <text x={36} y={72} textAnchor="middle" fill="#6366f1" fontSize={7}>
        pgvector
      </text>
    </g>
  );
}

export function VectorDbInfographic() {
  const { ref, visible } = useInfographicReveal();

  return (
    <InfographicFrame ref={ref} label="PostgreSQL에서 관계형·벡터 검색이 분기 후 통합 쿼리로 합쳐지는 흐름">
      <svg viewBox="0 0 480 200" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="vectordb-arrow" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        <g style={infographicStepStyle(0, visible)}>
          <PostgresIcon x={204} y={8} />
        </g>

        <g style={infographicStepStyle(1, visible)}>
          <path
            d="M240 58 L 240 78 L 120 78 L 120 88"
            fill="none"
            stroke="#6b7280"
            strokeWidth={1.5}
            markerEnd="url(#vectordb-arrow)"
          />
          <path
            d="M240 58 L 240 78 L 360 78 L 360 88"
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            markerEnd="url(#vectordb-arrow)"
          />
        </g>

        <g style={infographicStepStyle(2, visible)}>
          <TableIcon x={84} y={96} />
          <VectorCluster x={324} y={96} />
        </g>

        <g style={infographicStepStyle(3, visible)}>
          <path
            d="M120 148 L 120 162 L 240 162 L 360 162 L 360 148"
            fill="none"
            stroke="#6b7280"
            strokeWidth={1.5}
            markerEnd="url(#vectordb-arrow)"
          />
          <rect x={168} y={168} width={144} height={28} rx={8} fill="#312e81" stroke="#6366f1" strokeWidth={1.5} />
          <text x={240} y={186} textAnchor="middle" fill="#c7d2fe" fontSize={9}>
            통합 쿼리 결과
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
