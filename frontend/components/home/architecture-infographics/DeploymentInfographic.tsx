"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

// 실제 배포 구조
// 로컬: docker-compose 9개 서비스 (API + pgvector + redis + neo4j + ollama + auth + ...)
// 프로덕션: Railway (Procfile → uvicorn) + Vercel (Next.js 프론트엔드) — 분리 배포
// 별도 Worker 컨테이너 없음 (APScheduler in-process)

function ServicePill({
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
      <rect x={0} y={0} width={56} height={24} rx={5}
        fill={fill} stroke={stroke} strokeWidth={1.2} />
      <text x={28} y={15} textAnchor="middle" fill={textFill} fontSize={7.5}
        fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  );
}

function EnvBox({
  x,
  y,
  w,
  h,
  label,
  dashed = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  dashed?: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={10}
        fill="none"
        stroke={dashed ? "#6366f1" : "#4b5563"}
        strokeWidth={1.4}
        strokeDasharray={dashed ? "6 4" : undefined}
        opacity={dashed ? 0.85 : 1}
      />
      <text x={w / 2} y={-7} textAnchor="middle" fill="#9ca3af" fontSize={9}>
        {label}
      </text>
    </g>
  );
}

export function DeploymentInfographic() {
  const { ref, visible } = useInfographicReveal();

  // viewBox 480×200
  // 왼쪽: 로컬 docker-compose 블록  /  오른쪽: Railway + Vercel 분리 배포

  return (
    <InfographicFrame ref={ref} label="로컬 docker-compose → Railway(백엔드) + Vercel(프론트) 분리 배포">
      <svg viewBox="0 0 480 200" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="deploy-arrow" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Step 0 — 로컬 docker-compose */}
        <g style={infographicStepStyle(0, visible)}>
          <EnvBox x={14} y={28} w={208} h={138} label="로컬 개발" dashed />
          {/* Row 1: API, auth */}
          <ServicePill x={28} y={48} label="API :8000" accent />
          <ServicePill x={92} y={48} label="auth :9000" accent />
          {/* Row 2: pgvector, redis */}
          <ServicePill x={28} y={82} label="pgvector" />
          <ServicePill x={92} y={82} label="redis" />
          {/* Row 3: neo4j, ollama */}
          <ServicePill x={28} y={116} label="neo4j" warn />
          <ServicePill x={92} y={116} label="ollama" />
          {/* compose 라벨 */}
          <text x={118} y={24} textAnchor="middle" fill="#6366f1" fontSize={8} opacity={0.7}>
            docker compose
          </text>
        </g>

        {/* Step 1 — 배포 화살표 */}
        <g style={infographicStepStyle(1, visible)}>
          <path d="M234 97 L 258 97"
            fill="none" stroke="#6366f1" strokeWidth={2}
            markerEnd="url(#deploy-arrow)"
          />
          <text x={246} y={90} textAnchor="middle" fill="#6b7280" fontSize={8}>deploy</text>
        </g>

        {/* Step 2 — Railway 백엔드 */}
        <g style={infographicStepStyle(2, visible)}>
          <EnvBox x={266} y={28} w={100} h={80} label="Railway" dashed />
          <ServicePill x={279} y={50} label="uvicorn" accent />
          <ServicePill x={279} y={82} label="PostgreSQL" />
          <text x={316} y={122} textAnchor="middle" fill="#9ca3af" fontSize={7.5}>
            Procfile
          </text>
        </g>

        {/* Step 3 — Vercel 프론트 */}
        <g style={infographicStepStyle(3, visible)}>
          <EnvBox x={375} y={28} w={92} h={50} label="Vercel" dashed />
          <ServicePill x={388} y={48} label="Next.js" accent />
          {/* Railway ↔ Vercel 연결 */}
          <path d="M366 68 L 375 68"
            fill="none" stroke="#6b7280" strokeWidth={1.2}
            strokeDasharray="3 2"
          />
          <text x={421} y={88} textAnchor="middle" fill="#9ca3af" fontSize={7.5}>
            분리 배포
          </text>
        </g>

        {/* 캡션 */}
        <g style={infographicStepStyle(4, visible)}>
          <rect x={100} y={170} width={280} height={20} rx={6} fill="#111827" stroke="#374151" strokeWidth={1} />
          <text x={240} y={183} textAnchor="middle" fill="#9ca3af" fontSize={8}
            fontFamily="ui-monospace, monospace">
            Uvicorn · Railway · Vercel · APScheduler in-process
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
