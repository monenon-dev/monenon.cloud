"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

/* 아이콘 크기 */
const ICO = 52;

function CalendarIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={ICO} height={ICO} rx={10} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={0} y={0} width={ICO} height={14} rx={10} fill="#374151" />
      <line x1={14} y1={26} x2={38} y2={26} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={14} y1={34} x2={34} y2={34} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={14} y1={42} x2={28} y2={42} stroke="#6366f1" strokeWidth={1.5} />
    </g>
  );
}

function SlackIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={ICO} height={ICO} rx={10} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <path d="M16 20h14M16 28h20M16 36h16" stroke="#6366f1" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={38} cy={20} r={4} fill="#6366f1" opacity={0.7} />
    </g>
  );
}

function MailIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={ICO} height={ICO} rx={10} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={10} y={16} width={32} height={22} rx={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
      <path d="M10 19l16 12 16-12" fill="none" stroke="#6366f1" strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  );
}

function DocIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={ICO} height={ICO} rx={10} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={12} y={13} width={28} height={4} rx={2} fill="#6b7280" />
      <rect x={12} y={21} width={28} height={4} rx={2} fill="#6b7280" />
      <rect x={12} y={29} width={20} height={4} rx={2} fill="#6b7280" />
      <rect x={12} y={37} width={14} height={4} rx={2} fill="#6366f1" opacity={0.7} />
    </g>
  );
}

export function BriefingInfographic() {
  const { ref, visible } = useInfographicReveal();

  // viewBox 480×260
  // 네 모서리 아이콘 중심: TL(52,52) TR(376,52) BL(52,208) BR(376,208)
  // 중앙 수렴점: (214,130)
  // 브리핑 카드 좌상단: (248,66) 크기 196×128

  const cx = 214;
  const cy = 130;
  // 아이콘 배치 (아이콘 왼쪽 상단 = 중심 - ICO/2)
  const TL = { x: 26, y: 26 };   // 캘린더
  const TR = { x: 402, y: 26 };  // Slack
  const BL = { x: 26, y: 182 };  // 메일
  const BR = { x: 402, y: 182 };  // 문서

  // 아이콘 중심
  const ic = (p: { x: number; y: number }) => ({ x: p.x + ICO / 2, y: p.y + ICO / 2 });

  return (
    <InfographicFrame ref={ref} label="캘린더·Slack·메일·문서에서 브리핑으로 수렴하는 흐름">
      <svg viewBox="0 0 480 260" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="briefing-arrowhead" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Step 0 — 4개 아이콘 */}
        <g style={infographicStepStyle(0, visible)}>
          <CalendarIcon x={TL.x} y={TL.y} />
          <text x={TL.x + ICO / 2} y={TL.y + ICO + 14} textAnchor="middle" fill="#9ca3af" fontSize={11}>캘린더</text>
          <SlackIcon x={TR.x} y={TR.y} />
          <text x={TR.x + ICO / 2} y={TR.y + ICO + 14} textAnchor="middle" fill="#9ca3af" fontSize={11}>Slack</text>
          <MailIcon x={BL.x} y={BL.y} />
          <text x={BL.x + ICO / 2} y={BL.y + ICO + 14} textAnchor="middle" fill="#9ca3af" fontSize={11}>메일</text>
          <DocIcon x={BR.x} y={BR.y} />
          <text x={BR.x + ICO / 2} y={BR.y + ICO + 14} textAnchor="middle" fill="#9ca3af" fontSize={11}>문서</text>
        </g>

        {/* Step 1 — 수렴 연결선 + 허브 */}
        <g style={infographicStepStyle(1, visible)}>
          {/* TL → 허브 */}
          <path
            d={`M${ic(TL).x} ${ic(TL).y} C ${ic(TL).x + 60} ${ic(TL).y}, ${cx - 30} ${cy - 30}, ${cx} ${cy}`}
            fill="none" stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#briefing-arrowhead)"
          />
          {/* TR → 허브 */}
          <path
            d={`M${ic(TR).x} ${ic(TR).y} C ${ic(TR).x - 60} ${ic(TR).y}, ${cx + 30} ${cy - 30}, ${cx} ${cy}`}
            fill="none" stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#briefing-arrowhead)"
          />
          {/* BL → 허브 */}
          <path
            d={`M${ic(BL).x} ${ic(BL).y} C ${ic(BL).x + 60} ${ic(BL).y}, ${cx - 30} ${cy + 30}, ${cx} ${cy}`}
            fill="none" stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#briefing-arrowhead)"
          />
          {/* BR → 허브 */}
          <path
            d={`M${ic(BR).x} ${ic(BR).y} C ${ic(BR).x - 60} ${ic(BR).y}, ${cx + 30} ${cy + 30}, ${cx} ${cy}`}
            fill="none" stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#briefing-arrowhead)"
          />
          {/* 수렴 허브 */}
          <circle cx={cx} cy={cy} r={18} fill="#312e81" stroke="#6366f1" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={7} fill="#6366f1" />
        </g>

        {/* Step 2 — 브리핑 카드 */}
        <g style={infographicStepStyle(2, visible)}>
          <path
            d={`M${cx + 18} ${cy} L 244 ${cy}`}
            fill="none" stroke="#6366f1" strokeWidth={1.5} markerEnd="url(#briefing-arrowhead)"
          />
          {/* 카드 본체 */}
          <rect x={248} y={66} width={196} height={128} rx={12} fill="#111827" stroke="#6366f1" strokeWidth={1.5} />
          {/* 제목바 */}
          <rect x={262} y={80} width={80} height={8} rx={4} fill="#6366f1" opacity={0.85} />
          {/* 본문 라인 */}
          <rect x={262} y={96} width={168} height={5} rx={2.5} fill="#4b5563" />
          <rect x={262} y={107} width={150} height={5} rx={2.5} fill="#4b5563" />
          <rect x={262} y={118} width={138} height={5} rx={2.5} fill="#4b5563" />
          <rect x={262} y={129} width={110} height={5} rx={2.5} fill="#4b5563" />
          {/* 리스크 배지 */}
          <rect x={262} y={148} width={56} height={18} rx={6} fill="#064e3b" stroke="#34d399" strokeWidth={1} />
          <text x={290} y={160} textAnchor="middle" fill="#34d399" fontSize={9}>리스크 1</text>
          {/* 라벨 */}
          <text x={346} y={210} textAnchor="middle" fill="#a5b4fc" fontSize={11} fontWeight={500}>브리핑 초안</text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
