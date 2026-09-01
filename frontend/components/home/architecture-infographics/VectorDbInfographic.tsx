"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

// 실제 구현 구조:
// PostgreSQL (pgvector): moneyball_rag_chunks.embedding, spoke_contexts.embedding (Vector 1024d)
// Neo4j: star_craft 허브 온톨로지 (neo4j-graphrag 사용)
// SQLAlchemy ORM: 관계형 테이블 전반

function PostgresIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse cx={40} cy={16} rx={32} ry={11} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
      <rect x={8} y={16} width={64} height={38} fill="#1f2937" stroke="#6b7280" strokeWidth={1.5} />
      <ellipse cx={40} cy={54} rx={32} ry={11} fill="#111827" stroke="#6b7280" strokeWidth={1.5} />
      <text x={40} y={40} textAnchor="middle" fill="#6366f1" fontSize={9} fontWeight={600}>PostgreSQL</text>
    </g>
  );
}

function TableBox({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={80} height={48} rx={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <line x1={0} y1={14} x2={80} y2={14} stroke="#4b5563" strokeWidth={1} />
      <line x1={28} y1={14} x2={28} y2={48} stroke="#4b5563" strokeWidth={1} />
      <text x={40} y={64} textAnchor="middle" fill="#9ca3af" fontSize={8}>관계형 데이터</text>
      <text x={40} y={74} textAnchor="middle" fill="#6366f1" fontSize={7}>SQLAlchemy</text>
    </g>
  );
}

function VectorBox({ x, y }: { x: number; y: number }) {
  const dots: [number, number][] = [[12, 18], [28, 10], [44, 20], [20, 34], [38, 36], [54, 26]];
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={80} height={48} rx={8} fill="#1f2937" stroke="#6366f1" strokeWidth={1.5} />
      {dots.map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r={3.5} fill="#6366f1" opacity={0.45 + (i % 3) * 0.18} />
      ))}
      <text x={40} y={64} textAnchor="middle" fill="#9ca3af" fontSize={8}>벡터 검색 1024d</text>
      <text x={40} y={74} textAnchor="middle" fill="#6366f1" fontSize={7}>pgvector</text>
    </g>
  );
}

function Neo4jBox({ x, y }: { x: number; y: number }) {
  // 그래프 노드 3개 + 엣지
  const nodes: [number, number][] = [[20, 18], [60, 12], [60, 40]];
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={80} height={48} rx={8} fill="#1c1917" stroke="#fbbf24" strokeWidth={1.5} />
      {/* 엣지 */}
      <line x1={nodes[0][0]} y1={nodes[0][1]} x2={nodes[1][0]} y2={nodes[1][1]} stroke="#fbbf24" strokeWidth={1} opacity={0.5} />
      <line x1={nodes[0][0]} y1={nodes[0][1]} x2={nodes[2][0]} y2={nodes[2][1]} stroke="#fbbf24" strokeWidth={1} opacity={0.5} />
      <line x1={nodes[1][0]} y1={nodes[1][1]} x2={nodes[2][0]} y2={nodes[2][1]} stroke="#fbbf24" strokeWidth={1} opacity={0.4} />
      {/* 노드 */}
      {nodes.map(([nx, ny], i) => (
        <circle key={i} cx={nx} cy={ny} r={5} fill="#fbbf24" opacity={0.8} />
      ))}
      <text x={40} y={64} textAnchor="middle" fill="#9ca3af" fontSize={8}>그래프 DB</text>
      <text x={40} y={74} textAnchor="middle" fill="#fbbf24" fontSize={7}>Neo4j 5</text>
    </g>
  );
}

export function VectorDbInfographic() {
  const { ref, visible } = useInfographicReveal();

  // viewBox 480×210
  // PostgreSQL 중앙 상단, 아래로 3갈래: 관계형(좌), 벡터(중), 그래프(우)

  const pgX = 200;
  const pgY = 8;
  const pgCx = pgX + 40;
  const pgBottomY = pgY + 54 + 11; // 실린더 하단

  const tableX = 36;
  const vecX = 196;
  const neo4jX = 356;
  const boxY = 112;

  return (
    <InfographicFrame ref={ref} label="PostgreSQL(pgvector 관계형+벡터) · Neo4j 그래프 DB 구조">
      <svg viewBox="0 0 480 210" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="vectordb-arrow" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6b7280" />
          </marker>
          <marker id="vectordb-arrow-accent" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6366f1" />
          </marker>
          <marker id="vectordb-arrow-warn" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#fbbf24" />
          </marker>
        </defs>

        {/* Step 0 — PostgreSQL */}
        <g style={infographicStepStyle(0, visible)}>
          <PostgresIcon x={pgX} y={pgY} />
        </g>

        {/* Step 1 — 3갈래 연결선 */}
        <g style={infographicStepStyle(1, visible)}>
          {/* → 관계형 */}
          <path
            d={`M${pgCx} ${pgBottomY} L${pgCx} ${pgBottomY + 10} L${tableX + 40} ${pgBottomY + 10} L${tableX + 40} ${boxY}`}
            fill="none" stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#vectordb-arrow)"
          />
          {/* → 벡터 */}
          <path
            d={`M${pgCx} ${pgBottomY} L${pgCx} ${boxY}`}
            fill="none" stroke="#6366f1" strokeWidth={1.5} markerEnd="url(#vectordb-arrow-accent)"
          />
          {/* → Neo4j */}
          <path
            d={`M${pgCx} ${pgBottomY} L${pgCx} ${pgBottomY + 10} L${neo4jX + 40} ${pgBottomY + 10} L${neo4jX + 40} ${boxY}`}
            fill="none" stroke="#fbbf24" strokeWidth={1.5} markerEnd="url(#vectordb-arrow-warn)"
          />
        </g>

        {/* Step 2 — 3개 박스 */}
        <g style={infographicStepStyle(2, visible)}>
          <TableBox x={tableX} y={boxY} />
          <VectorBox x={vecX} y={boxY} />
          <Neo4jBox x={neo4jX} y={boxY} />
        </g>

        {/* Step 3 — 사용처 주석 */}
        <g style={infographicStepStyle(3, visible)}>
          <text x={tableX + 40} y={boxY + 84} textAnchor="middle" fill="#6b7280" fontSize={7}>
            사용자·세션·브리핑
          </text>
          <text x={vecX + 40} y={boxY + 84} textAnchor="middle" fill="#6b7280" fontSize={7}>
            moneyball · star_craft
          </text>
          <text x={neo4jX + 40} y={boxY + 84} textAnchor="middle" fill="#6b7280" fontSize={7}>
            star_craft 허브 온톨로지
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
