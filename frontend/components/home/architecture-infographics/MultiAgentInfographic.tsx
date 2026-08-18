"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

// 8노드 선형 체인: START → router → calendar → docs → history → slack → gmail → synthesizer → validator
// validator: validation_ok / validation_review_pending / synth_retries>=2 → END, 아니면 → synthesizer (max 2회 재시도)

const NODE_W = 80;
const NODE_H = 28;
const NODE_RX = 6;

function Node({
  x,
  y,
  label,
  accent = false,
  warn = false,
}: {
  x: number;
  y: number;
  label: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const fill = warn ? "#1c1917" : accent ? "#312e81" : "#1f2937";
  const stroke = warn ? "#fbbf24" : accent ? "#6366f1" : "#4b5563";
  const textFill = warn ? "#fcd34d" : accent ? "#c7d2fe" : "#9ca3af";

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={NODE_RX}
        fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text x={NODE_W / 2} y={NODE_H / 2 + 4} textAnchor="middle"
        fill={textFill} fontSize={8.5} fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  );
}

function HArrow({ x1, y1, x2, y2, accent = false }: { x1: number; y1: number; x2: number; y2: number; accent?: boolean }) {
  return (
    <path
      d={`M${x1} ${y1} L${x2} ${y2}`}
      fill="none"
      stroke={accent ? "#6366f1" : "#6b7280"}
      strokeWidth={1.5}
      markerEnd={`url(#ma-arrow${accent ? "-accent" : ""})`}
    />
  );
}

export function MultiAgentInfographic() {
  const { ref, visible } = useInfographicReveal();

  // 레이아웃: 2행 구조
  // Row 1 (y=20): router → calendar → docs → history
  // Row 2 (y=78): gmail ← slack ← (turn-down from history)
  // Row 3 (y=136): synthesizer → validator (→ END 또는 ← synthesizer 재시도)

  const GAP = 12; // 노드 사이 가로 간격
  const COL = NODE_W + GAP;

  // Row 1 x 시작 (4노드, 중앙 정렬 viewBox=480)
  const r1x = [16, 16 + COL, 16 + COL * 2, 16 + COL * 3];
  const r1y = 18;

  // Row 2: slack, gmail (오른쪽에서 왼쪽으로 배치해 아래 row1 노드와 연결)
  // history(4번) 아래로 내려가 → slack → gmail 순으로 오른쪽→왼쪽
  const r2x = [16 + COL * 3, 16 + COL * 2]; // history 아래 = slack, gmail
  const r2y = 76;

  // Row 3: synthesizer(왼쪽), validator(오른쪽)
  const synthX = 80;
  const validX = 300;
  const r3y = 134;

  // 노드 중심 y helper
  const cy = (y: number) => y + NODE_H / 2;
  const cx = (x: number) => x + NODE_W / 2;

  return (
    <InfographicFrame ref={ref} label="8노드 선형 그래프: 데이터 수집 → 합성 → 검증 → 재시도 루프">
      <svg viewBox="0 0 480 200" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="ma-arrow" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6b7280" />
          </marker>
          <marker id="ma-arrow-accent" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6366f1" />
          </marker>
          <marker id="ma-arrow-warn" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#fbbf24" />
          </marker>
        </defs>

        {/* Step 0 — Row 1: router → calendar → docs → history */}
        <g style={infographicStepStyle(0, visible)}>
          <Node x={r1x[0]} y={r1y} label="router" accent />
          <Node x={r1x[1]} y={r1y} label="calendar" />
          <Node x={r1x[2]} y={r1y} label="docs" />
          <Node x={r1x[3]} y={r1y} label="history" />
          {/* Row1 체인 화살표 */}
          <HArrow x1={r1x[0] + NODE_W} y1={cy(r1y)} x2={r1x[1]} y2={cy(r1y)} />
          <HArrow x1={r1x[1] + NODE_W} y1={cy(r1y)} x2={r1x[2]} y2={cy(r1y)} />
          <HArrow x1={r1x[2] + NODE_W} y1={cy(r1y)} x2={r1x[3]} y2={cy(r1y)} />
        </g>

        {/* Step 1 — history → slack → gmail (꺾임) */}
        <g style={infographicStepStyle(1, visible)}>
          {/* history 아래로 → slack */}
          <path
            d={`M${cx(r1x[3])} ${r1y + NODE_H} L${cx(r1x[3])} ${r2y}`}
            fill="none" stroke="#6b7280" strokeWidth={1.5}
            markerEnd="url(#ma-arrow)"
          />
          <Node x={r2x[0]} y={r2y} label="slack" />
          {/* slack → gmail (왼쪽 방향) */}
          <HArrow x1={r2x[0]} y1={cy(r2y)} x2={r2x[1] + NODE_W} y2={cy(r2y)} />
          <Node x={r2x[1]} y={r2y} label="gmail" />
        </g>

        {/* Step 2 — gmail → synthesizer */}
        <g style={infographicStepStyle(2, visible)}>
          {/* gmail 아래로 꺾어 synthesizer로 */}
          <path
            d={`M${cx(r2x[1])} ${r2y + NODE_H} L${cx(r2x[1])} ${r3y + NODE_H / 2} L${synthX + NODE_W} ${r3y + NODE_H / 2}`}
            fill="none" stroke="#6366f1" strokeWidth={1.5}
            markerEnd="url(#ma-arrow-accent)"
          />
          <Node x={synthX} y={r3y} label="synthesizer" accent />
          {/* synthesizer → validator */}
          <HArrow x1={synthX + NODE_W} y1={cy(r3y)} x2={validX} y2={cy(r3y)} accent />
          <Node x={validX} y={r3y} label="validator" accent />
          {/* validator → END */}
          <path
            d={`M${validX + NODE_W} ${cy(r3y)} L${validX + NODE_W + 30} ${cy(r3y)}`}
            fill="none" stroke="#34d399" strokeWidth={1.5}
            markerEnd="url(#ma-arrow-accent)"
          />
          <text x={validX + NODE_W + 34} y={cy(r3y) + 4} fill="#34d399" fontSize={8} fontFamily="ui-monospace, monospace">END</text>
        </g>

        {/* Step 3 — validator → synthesizer 재시도 루프 */}
        <g style={infographicStepStyle(3, visible)}>
          {/* 루프 화살표: validator 하단 → 아래 → 왼쪽 → synthesizer 하단 */}
          <path
            d={`M${cx(validX)} ${r3y + NODE_H} L${cx(validX)} ${r3y + NODE_H + 22} L${cx(synthX)} ${r3y + NODE_H + 22} L${cx(synthX)} ${r3y + NODE_H}`}
            fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="5 3"
            markerEnd="url(#ma-arrow-warn)"
          />
          <text x={cx(synthX) + (cx(validX) - cx(synthX)) / 2} y={r3y + NODE_H + 34} textAnchor="middle" fill="#fbbf24" fontSize={7.5}>
            재시도 (max 2회)
          </text>
        </g>

        {/* 캡션 */}
        <g style={infographicStepStyle(4, visible)}>
          <rect x={148} y={178} width={184} height={18} rx={5} fill="#111827" stroke="#374151" strokeWidth={1} />
          <text x={240} y={190} textAnchor="middle" fill="#818cf8" fontSize={8} fontFamily="ui-monospace, monospace">
            tool calls · state graph · LangGraph
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
