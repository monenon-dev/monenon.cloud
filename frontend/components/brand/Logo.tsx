import { type CSSProperties } from "react";

/**
 * Moneo 로고 컴포넌트
 *
 * 사용 예시:
 *   <Logo variant="horizontal" />
 *   <Logo variant="stacked" size={64} />
 *   <Logo variant="symbol" size={40} theme="light" />
 *
 * 폰트: Playfair Display(next/font --font-logo) → Georgia fallback.
 */

type LogoVariant = "horizontal" | "stacked" | "symbol";
type LogoTheme = "dark" | "light";

interface LogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  /** 심볼(M 글자) 기준 크기 px */
  size?: number;
  showTagline?: boolean;
  className?: string;
  style?: CSSProperties;
}

const PALETTE = {
  dark: {
    bg: "#0E0E0E",
    gold: "#E8C87A",
    text: "#F2F2F2",
    subtext: "#8A8A8A",
    divider: "#3A3A3A",
  },
  light: {
    bg: "#FAF9F6",
    gold: "#9B6F1E",
    text: "#1A1A1A",
    subtext: "#7A7A7A",
    divider: "#D8D3C8",
  },
} as const;

const SERIF_FONT =
  'var(--font-logo), "Playfair Display", Georgia, "Times New Roman", serif';

export default function Logo({
  variant = "horizontal",
  theme = "dark",
  size = 56,
  showTagline = false,
  className = "",
  style,
}: LogoProps) {
  const c = PALETTE[theme];

  if (variant === "symbol") {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size * 1.3,
          height: size * 1.3,
          ...style,
        }}
      >
        <span
          style={{
            fontFamily: SERIF_FONT,
            fontSize: size,
            color: c.gold,
            lineHeight: 1,
          }}
        >
          M
        </span>
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={className}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: size * 0.08,
          ...style,
        }}
      >
        <span
          style={{
            fontFamily: SERIF_FONT,
            fontSize: size,
            color: c.gold,
            lineHeight: 1,
          }}
        >
          M
        </span>
        <span
          style={{
            width: size * 0.9,
            height: 1,
            background: c.divider,
          }}
        />
        <span
          style={{
            fontFamily: SERIF_FONT,
            fontSize: size * 0.24,
            letterSpacing: "0.2em",
            color: c.text,
          }}
        >
          MONEO
        </span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.28,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: SERIF_FONT,
          fontSize: size,
          color: c.gold,
          lineHeight: 1,
        }}
      >
        M
      </span>
      <span
        style={{
          width: 1,
          height: size * 0.65,
          background: c.divider,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: size * 0.04 }}>
        <span
          style={{
            fontFamily: SERIF_FONT,
            fontSize: size * 0.42,
            color: c.text,
            lineHeight: 1,
          }}
        >
          moneo
        </span>
        {showTagline && (
          <span
            style={{
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: size * 0.145,
              letterSpacing: "0.12em",
              color: c.subtext,
              lineHeight: 1,
            }}
          >
            AI AGENT ORCHESTRATION
          </span>
        )}
      </div>
    </div>
  );
}
