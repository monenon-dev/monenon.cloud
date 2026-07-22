"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

const SCATTERED_DOCS = [
  { x: 18, y: 24, rotate: -18 },
  { x: 52, y: 48, rotate: 12 },
  { x: 28, y: 72, rotate: -8 },
  { x: 64, y: 88, rotate: 22 },
  { x: 14, y: 108, rotate: -14 },
  { x: 48, y: 128, rotate: 6 },
  { x: 72, y: 36, rotate: -24 },
  { x: 36, y: 152, rotate: 16 },
];

function DocSheet({ x, y, rotate = 0, accent = false }: { x: number; y: number; rotate?: number; accent?: boolean }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotate})`}>
      <rect
        x={0}
        y={0}
        width={22}
        height={28}
        rx={3}
        fill={accent ? "#1e1b4b" : "#1f2937"}
        stroke={accent ? "#6366f1" : "#4b5563"}
        strokeWidth={1.2}
      />
      <line x1={4} y1={8} x2={18} y2={8} stroke={accent ? "#818cf8" : "#6b7280"} strokeWidth={1.2} />
      <line x1={4} y1={13} x2={16} y2={13} stroke="#6b7280" strokeWidth={1} />
      <line x1={4} y1={18} x2={14} y2={18} stroke="#6b7280" strokeWidth={1} />
    </g>
  );
}

function FolderGroup({
  x,
  y,
  label,
  docCount,
}: {
  x: number;
  y: number;
  label: string;
  docCount: number;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={8} width={72} height={56} rx={8} fill="#111827" stroke="#6366f1" strokeWidth={1.5} />
      <path d="M0 16 Q0 8 8 8 L28 8 L34 16 Z" fill="#312e81" stroke="#6366f1" strokeWidth={1} />
      {Array.from({ length: docCount }).map((_, i) => (
        <DocSheet key={i} x={8 + i * 14} y={24} rotate={0} accent />
      ))}
      <text x={36} y={78} textAnchor="middle" fill="#a5b4fc" fontSize={9}>
        {label}
      </text>
    </g>
  );
}

export function DocsOrganizeInfographic() {
  const { ref, visible } = useInfographicReveal();

  return (
    <InfographicFrame ref={ref} label="흩어진 문서를 주제별 폴더로 정리하는 흐름">
      <svg viewBox="0 0 480 220" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="docs-arrowhead" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Step 0 — 혼란 클러스터 */}
        <g style={infographicStepStyle(0, visible)}>
          <rect x={8} y={12} width={96} height={168} rx={10} fill="none" stroke="#374151" strokeDasharray="4 3" />
          <text x={56} y={188} textAnchor="middle" fill="#6b7280" fontSize={9}>
            Before
          </text>
          {SCATTERED_DOCS.map((doc, i) => (
            <DocSheet key={i} x={doc.x} y={doc.y} rotate={doc.rotate} />
          ))}
        </g>

        {/* Step 1 — 필터/정렬 */}
        <g style={infographicStepStyle(1, visible)}>
          <path
            d="M118 110 L 168 110"
            fill="none"
            stroke="#6b7280"
            strokeWidth={1.5}
            markerEnd="url(#docs-arrowhead)"
          />
          <g transform="translate(178, 88)">
            <polygon points="24,0 48,44 0,44" fill="#1f2937" stroke="#6366f1" strokeWidth={1.5} />
            <rect x={10} y={18} width={28} height={4} rx={2} fill="#6366f1" opacity={0.5} />
            <rect x={14} y={26} width={20} height={4} rx={2} fill="#6366f1" opacity={0.7} />
            <rect x={18} y={34} width={12} height={4} rx={2} fill="#6366f1" />
          </g>
          <path
            d="M230 110 L 268 110"
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            markerEnd="url(#docs-arrowhead)"
          />
        </g>

        {/* Step 2 — 정돈된 폴더 */}
        <g style={infographicStepStyle(2, visible)}>
          <rect x={272} y={12} width={196} height={168} rx={10} fill="none" stroke="#6366f1" strokeOpacity={0.35} />
          <text x={370} y={188} textAnchor="middle" fill="#34d399" fontSize={9}>
            After
          </text>
          <FolderGroup x={282} y={28} label="프로젝트 A" docCount={2} />
          <FolderGroup x={362} y={28} label="리서치" docCount={2} />
          <FolderGroup x={322} y={108} label="회의록" docCount={2} />
        </g>
      </svg>
    </InfographicFrame>
  );
}
