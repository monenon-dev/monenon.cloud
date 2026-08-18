"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

export function WatcherInfographic() {
  const { ref, visible } = useInfographicReveal();

  // viewBox 480×240
  // 레이더 중심: (160, 120), 반지름 최대 90
  // 종 아이콘 중심: (360, 120)

  const rc = { x: 160, y: 120 };
  const bellX = 360;
  const bellY = 120;
  const radii = [30, 60, 90];

  // 감지 신호 위치 (레이더 2번째 원 근처, 우상단 방향)
  const signalAngle = -35 * (Math.PI / 180); // 위쪽 약간 오른쪽
  const signalR = 64;
  const signal = {
    x: rc.x + signalR * Math.cos(signalAngle),
    y: rc.y + signalR * Math.sin(signalAngle),
  };

  return (
    <InfographicFrame ref={ref} label="레이더가 이상 신호를 감지해 알림으로 전달하는 흐름">
      <svg viewBox="0 0 480 240" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="watcher-arrowhead" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Step 0 — 레이더 동심원 */}
        <g style={infographicStepStyle(0, visible)}>
          {radii.map((r) => (
            <circle
              key={r}
              cx={rc.x}
              cy={rc.y}
              r={r}
              fill="none"
              stroke="#4b5563"
              strokeWidth={1.2}
              strokeDasharray={r === 30 ? "none" : "4 3"}
            />
          ))}
          {/* 중심점 */}
          <circle cx={rc.x} cy={rc.y} r={6} fill="#6366f1" />
          {/* 레이더 스캔 선 (위쪽 방향) */}
          <line
            x1={rc.x}
            y1={rc.y}
            x2={rc.x + 85}
            y2={rc.y - 35}
            stroke="#6366f1"
            strokeWidth={1.5}
            opacity={0.5}
          />
        </g>

        {/* Step 1 — 감지 신호 */}
        <g style={infographicStepStyle(1, visible)}>
          <circle cx={signal.x} cy={signal.y} r={7} fill="#fbbf24" opacity={0.9} />
          <circle cx={signal.x} cy={signal.y} r={14} fill="none" stroke="#fbbf24" strokeWidth={1} opacity={0.4} />
          {/* 신호 → 종 연결선 */}
          <path
            d={`M${signal.x + 14} ${signal.y} C ${signal.x + 60} ${signal.y - 10}, ${bellX - 70} ${bellY - 20}, ${bellX - 38} ${bellY}`}
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.8}
            strokeDasharray="6 3"
            markerEnd="url(#watcher-arrowhead)"
          />
        </g>

        {/* Step 2 — 종 아이콘 */}
        <g style={infographicStepStyle(2, visible)}>
          {/* 종 배경 원 */}
          <circle cx={bellX} cy={bellY} r={44} fill="#1f2937" stroke="#6366f1" strokeWidth={1.5} />
          {/* 종 모양 */}
          <path
            d={`M${bellX} ${bellY - 26} 
               C ${bellX - 22} ${bellY - 26}, ${bellX - 28} ${bellY - 10}, ${bellX - 28} ${bellY + 6}
               L ${bellX - 32} ${bellY + 14}
               L ${bellX + 32} ${bellY + 14}
               L ${bellX + 28} ${bellY + 6}
               C ${bellX + 28} ${bellY - 10}, ${bellX + 22} ${bellY - 26}, ${bellX} ${bellY - 26} Z`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* 종 손잡이 */}
          <path
            d={`M${bellX - 6} ${bellY - 26} Q${bellX} ${bellY - 34} ${bellX + 6} ${bellY - 26}`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={1.5}
          />
          {/* 종 클래퍼 */}
          <circle cx={bellX} cy={bellY + 18} r={4} fill="#fbbf24" />
          {/* 알림 점 */}
          <circle cx={bellX + 22} cy={bellY - 20} r={6} fill="#ef4444" />
          {/* 라벨 */}
          <text x={bellX} y={bellY + 62} textAnchor="middle" fill="#a5b4fc" fontSize={11} fontWeight={500}>
            즉시 알림
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
