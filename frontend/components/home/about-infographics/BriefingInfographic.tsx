"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

function CalendarIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={36} height={36} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={0} y={0} width={36} height={10} rx={8} fill="#374151" />
      <line x1={10} y1={18} x2={26} y2={18} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={10} y1={24} x2={22} y2={24} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={10} y1={30} x2={18} y2={30} stroke="#6366f1" strokeWidth={1.5} />
    </g>
  );
}

function SlackIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={36} height={36} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <path
        d="M12 14h6M12 20h10M12 26h8"
        stroke="#6366f1"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={26} cy={14} r={3} fill="#6366f1" opacity={0.6} />
    </g>
  );
}

function MailIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={36} height={36} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={8} y={12} width={20} height={14} rx={2} fill="none" stroke="#6b7280" strokeWidth={1.5} />
      <path d="M8 14l10 8 10-8" fill="none" stroke="#6366f1" strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  );
}

function Arrow({ d, accent = false }: { d: string; accent?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={accent ? "#6366f1" : "#6b7280"}
      strokeWidth={1.5}
      strokeLinecap="round"
      markerEnd="url(#briefing-arrowhead)"
    />
  );
}

export function BriefingInfographic() {
  const { ref, visible } = useInfographicReveal();

  return (
    <InfographicFrame ref={ref} label="캘린더·Slack·메일에서 브리핑 초안으로 수렴하는 흐름">
      <svg viewBox="0 0 480 220" className="h-auto w-full" aria-hidden>
        <defs>
          <marker
            id="briefing-arrowhead"
            markerWidth={8}
            markerHeight={8}
            refX={6}
            refY={3}
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Step 0 — 입력 소스 */}
        <g style={infographicStepStyle(0, visible)}>
          <CalendarIcon x={24} y={28} />
          <text x={42} y={78} textAnchor="middle" fill="#9ca3af" fontSize={10}>
            캘린더
          </text>

          <SlackIcon x={24} y={88} />
          <text x={42} y={138} textAnchor="middle" fill="#9ca3af" fontSize={10}>
            Slack
          </text>

          <MailIcon x={24} y={148} />
          <text x={42} y={198} textAnchor="middle" fill="#9ca3af" fontSize={10}>
            메일
          </text>
        </g>

        {/* Step 1 — 수렴 */}
        <g style={infographicStepStyle(1, visible)}>
          <Arrow d="M62 46 C 120 46, 140 110, 200 110" />
          <Arrow d="M62 106 C 130 106, 150 110, 200 110" />
          <Arrow d="M62 166 C 120 166, 140 110, 200 110" />
          <circle cx={200} cy={110} r={14} fill="#312e81" stroke="#6366f1" strokeWidth={2} />
          <circle cx={200} cy={110} r={5} fill="#6366f1" />
        </g>

        {/* Step 2 — 브리핑 카드 */}
        <g style={infographicStepStyle(2, visible)}>
          <Arrow d="M214 110 L 280 110" accent />
          <rect
            x={280}
            y={68}
            width={132}
            height={84}
            rx={10}
            fill="#111827"
            stroke="#6366f1"
            strokeWidth={1.5}
          />
          <rect x={292} y={80} width={56} height={6} rx={3} fill="#6366f1" opacity={0.8} />
          <rect x={292} y={94} width={108} height={4} rx={2} fill="#4b5563" />
          <rect x={292} y={104} width={96} height={4} rx={2} fill="#4b5563" />
          <rect x={292} y={114} width={88} height={4} rx={2} fill="#4b5563" />
          <rect x={292} y={128} width={40} height={14} rx={4} fill="#064e3b" stroke="#34d399" strokeWidth={1} />
          <text x={312} y={138} fill="#34d399" fontSize={8}>
            리스크 1
          </text>
          <text x={346} y={162} textAnchor="middle" fill="#a5b4fc" fontSize={10} fontWeight={500}>
            브리핑 초안
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
