"use client";

import { useRouter } from "next/navigation";

import { hasKakaoConsent, hasNaverConsent } from "@/lib/social-auth";
import { routes } from "@/lib/routes";

const SOCIAL = [
  {
    id: "naver",
    label: "네이버 아이디로 로그인",
    className: "bg-[#03C75A] text-white hover:brightness-95",
    mark: "N",
    markClass: "bg-white text-[#03C75A]",
  },
  {
    id: "kakao",
    label: "카카오계정으로 로그인",
    className: "bg-[#FEE500] text-[#391B1B] hover:brightness-95",
    mark: "톡",
    markClass: "bg-[#391B1B] text-[#FEE500]",
  },
  {
    id: "apple",
    label: "Apple로 로그인",
    className: "bg-black text-white hover:bg-neutral-800 dark:bg-neutral-900",
    mark: "",
    markClass: "bg-white text-black",
    apple: true,
  },
  {
    id: "instagram",
    label: "Instagram으로 로그인",
    className:
      "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white hover:brightness-95",
    mark: "IG",
    markClass: "bg-white/20 text-white",
  },
] as const;

type SocialLoginButtonsProps = {
  onInfo?: (message: string) => void;
  className?: string;
};

export function SocialLoginButtons({ onInfo, className = "" }: SocialLoginButtonsProps) {
  const router = useRouter();

  const handleClick = (id: (typeof SOCIAL)[number]["id"]) => {
    if (id === "naver") {
      router.push(hasNaverConsent() ? routes.oauth.naver : routes.oauth.signupNaver);
      return;
    }
    if (id === "kakao") {
      router.push(hasKakaoConsent() ? routes.oauth.kakao : routes.oauth.signupKakao);
      return;
    }
    if (id === "apple") {
      onInfo?.("Apple 로그인은 준비 중입니다.");
      return;
    }
    onInfo?.("Instagram 로그인은 준비 중입니다.");
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {SOCIAL.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => handleClick(s.id)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${s.className}`}
        >
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${s.markClass}`}
          >
            {"apple" in s && s.apple ? (
              <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.7c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.4-1-2.4-3.8zM14.2 5.8c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.9-.9 3 1 .1 2-.5 2.6-1.4z" />
              </svg>
            ) : (
              s.mark
            )}
          </span>
          <span className="flex-1 text-center pr-8">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
