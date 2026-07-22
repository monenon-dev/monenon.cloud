"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

function ContainerBox({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={64} height={40} rx={6} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={4} y={4} width={56} height={8} rx={2} fill="#374151" />
      <text x={32} y={28} textAnchor="middle" fill="#9ca3af" fontSize={8} fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  );
}

function EnvBlock({
  x,
  y,
  title,
  dashed = false,
}: {
  x: number;
  y: number;
  title: string;
  dashed?: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0}
        y={0}
        width={200}
        height={100}
        rx={10}
        fill="none"
        stroke={dashed ? "#6366f1" : "#4b5563"}
        strokeWidth={1.5}
        strokeDasharray={dashed ? "6 4" : undefined}
        opacity={dashed ? 0.8 : 1}
      />
      <text x={100} y={-8} textAnchor="middle" fill="#9ca3af" fontSize={9}>
        {title}
      </text>
    </g>
  );
}

export function DeploymentInfographic() {
  const { ref, visible } = useInfographicReveal();

  return (
    <InfographicFrame ref={ref} label="Docker compose로 로컬과 프로덕션에 동일 구성을 배포하는 흐름">
      <svg viewBox="0 0 480 200" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="deploy-arrow" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        <g style={infographicStepStyle(0, visible)}>
          <EnvBlock x={24} y={32} title="로컬 환경" dashed />
          <ContainerBox x={40} y={52} label="API" />
          <ContainerBox x={112} y={52} label="Worker" />
          <ContainerBox x={40} y={100} label="DB" />
          <ContainerBox x={112} y={100} label="Redis" />
          <text x={124} y={24} textAnchor="middle" fill="#6366f1" fontSize={8} opacity={0.7}>
            docker compose
          </text>
        </g>

        <g style={infographicStepStyle(1, visible)}>
          <path
            d="M236 82 L 268 82"
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            markerEnd="url(#deploy-arrow)"
          />
          <text x={252} y={74} textAnchor="middle" fill="#6b7280" fontSize={8}>
            deploy
          </text>
        </g>

        <g style={infographicStepStyle(2, visible)}>
          <EnvBlock x={280} y={32} title="프로덕션" dashed />
          <ContainerBox x={296} y={52} label="API" />
          <ContainerBox x={368} y={52} label="Worker" />
          <ContainerBox x={296} y={100} label="DB" />
          <ContainerBox x={368} y={100} label="Vercel" />
        </g>

        <g style={infographicStepStyle(3, visible)}>
          <rect x={120} y={168} width={240} height={22} rx={6} fill="#111827" stroke="#4b5563" strokeWidth={1} />
          <text x={240} y={182} textAnchor="middle" fill="#9ca3af" fontSize={8}>
            Uvicorn · Docker · 동일 compose 매니페스트
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
