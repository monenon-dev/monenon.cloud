"use client";

import { InfographicFrame } from "@/components/home/about-infographics/infographic-frame";
import {
  infographicStepStyle,
  useInfographicReveal,
} from "@/components/home/about-infographics/use-infographic-reveal";

const NODE_W = 88;
const NODE_H = 28;
const NODE_RX = 6;

function Node({
  x,
  y,
  label,
  sub,
  accent = false,
  warn = false,
}: {
  x: number;
  y: number;
  label: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const fill = warn ? "#1c1917" : accent ? "#312e81" : "#1f2937";
  const stroke = warn ? "#fbbf24" : accent ? "#6366f1" : "#4b5563";
  const textFill = warn ? "#fcd34d" : accent ? "#c7d2fe" : "#9ca3af";

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0}
        y={0}
        width={NODE_W}
        height={sub ? NODE_H + 10 : NODE_H}
        rx={NODE_RX}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text
        x={NODE_W / 2}
        y={sub ? 12 : NODE_H / 2 + 4}
        textAnchor="middle"
        fill={textFill}
        fontSize={8}
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
      {sub ? (
        <text
          x={NODE_W / 2}
          y={26}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={6.5}
          fontFamily="ui-monospace, monospace"
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function HArrow({
  x1,
  y1,
  x2,
  y2,
  accent = false,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  accent?: boolean;
  dashed?: boolean;
}) {
  return (
    <path
      d={`M${x1} ${y1} L${x2} ${y2}`}
      fill="none"
      stroke={accent ? "#6366f1" : "#6b7280"}
      strokeWidth={1.5}
      strokeDasharray={dashed ? "5 3" : undefined}
      markerEnd={`url(#auth-arrow${accent ? "-accent" : dashed ? "-warn" : ""})`}
    />
  );
}

export function AuthSessionInfographic() {
  const { ref, visible } = useInfographicReveal();

  const cy = (y: number) => y + NODE_H / 2;
  const cx = (x: number) => x + NODE_W / 2;

  // Row 1: OAuth → login → token issue
  const r1y = 16;
  const oauthX = 8;
  const loginX = 112;
  const issueX = 216;

  // Row 2: API verify
  const r2y = 72;
  const apiX = 112;
  const verifyX = 216;
  const okX = 320;

  // Row 3: refresh loop
  const r3y = 128;
  const refreshX = 112;
  const redisX = 216;
  const reloginX = 320;

  return (
    <InfographicFrame ref={ref} label="Kakao OAuth → RS256 JWT 발급 → 검증 → Redis refresh rotation">
      <svg viewBox="0 0 480 200" className="h-auto w-full" aria-hidden>
        <defs>
          <marker id="auth-arrow" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6b7280" />
          </marker>
          <marker id="auth-arrow-accent" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#6366f1" />
          </marker>
          <marker id="auth-arrow-warn" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="#fbbf24" />
          </marker>
        </defs>

        {/* Step 0 — OAuth login & token issue */}
        <g style={infographicStepStyle(0, visible)}>
          <Node x={oauthX} y={r1y} label="Kakao OAuth" accent />
          <Node x={loginX} y={r1y} label="/auth/kakao" />
          <Node
            x={issueX}
            y={r1y}
            label="Token Issue"
            sub="access 10m · refresh 14d"
            accent
          />
          <HArrow x1={oauthX + NODE_W} y1={cy(r1y)} x2={loginX} y2={cy(r1y)} accent />
          <HArrow x1={loginX + NODE_W} y1={cy(r1y)} x2={issueX} y2={cy(r1y)} accent />
          {/* cookies annotation */}
          <text x={cx(issueX)} y={r1y + NODE_H + 22} textAnchor="middle" fill="#818cf8" fontSize={7}>
            httpOnly cookies + Bearer
          </text>
        </g>

        {/* Step 1 — API request & JWT verify */}
        <g style={infographicStepStyle(1, visible)}>
          <path
            d={`M${cx(issueX)} ${r1y + NODE_H + 10} L${cx(apiX)} ${r2y}`}
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            markerEnd="url(#auth-arrow-accent)"
          />
          <Node x={apiX} y={r2y} label="API Request" />
          <Node x={verifyX} y={r2y} label="get_current_user" accent />
          <Node x={okX} y={r2y} label="200 OK" />
          <HArrow x1={apiX + NODE_W} y1={cy(r2y)} x2={verifyX} y2={cy(r2y)} />
          <HArrow x1={verifyX + NODE_W} y1={cy(r2y)} x2={okX} y2={cy(r2y)} accent />
        </g>

        {/* Step 2 — 401 → refresh */}
        <g style={infographicStepStyle(2, visible)}>
          <text x={cx(verifyX)} y={r2y + NODE_H + 14} textAnchor="middle" fill="#fbbf24" fontSize={7}>
            access 만료 → 401
          </text>
          <path
            d={`M${cx(verifyX)} ${r2y + NODE_H + 16} L${cx(refreshX)} ${r3y}`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            markerEnd="url(#auth-arrow-warn)"
          />
          <Node x={refreshX} y={r3y} label="/auth/refresh" warn />
          <Node x={redisX} y={r3y} label="Redis rotation" sub="jti store" accent />
          <HArrow x1={refreshX + NODE_W} y1={cy(r3y)} x2={redisX} y2={cy(r3y)} accent />
          {/* re-issue loop back */}
          <path
            d={`M${redisX + NODE_W} ${cy(r3y)} L${400} ${cy(r3y)} L${400} ${cy(r1y)} L${issueX + NODE_W} ${cy(r1y)}`}
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            markerEnd="url(#auth-arrow-accent)"
          />
          <text x={408} y={cy(r3y) - 6} fill="#818cf8" fontSize={7}>
            재발급
          </text>
        </g>

        {/* Step 3 — refresh fail → re-login */}
        <g style={infographicStepStyle(3, visible)}>
          <Node x={reloginX} y={r3y} label="재로그인" warn />
          <HArrow
            x1={redisX + NODE_W}
            y1={cy(r3y) + 8}
            x2={reloginX}
            y2={cy(r3y) + 8}
            dashed
          />
          <text x={(cx(redisX) + cx(reloginX)) / 2} y={r3y + NODE_H + 14} textAnchor="middle" fill="#fbbf24" fontSize={7}>
            만료 · 재사용 감지
          </text>
        </g>

        {/* Caption */}
        <g style={infographicStepStyle(4, visible)}>
          <rect x={88} y={178} width={304} height={18} rx={5} fill="#111827" stroke="#374151" strokeWidth={1} />
          <text
            x={240}
            y={190}
            textAnchor="middle"
            fill="#818cf8"
            fontSize={8}
            fontFamily="ui-monospace, monospace"
          >
            RS256 JWT · Redis refresh · single-flight · httpOnly cookie
          </text>
        </g>
      </svg>
    </InfographicFrame>
  );
}
