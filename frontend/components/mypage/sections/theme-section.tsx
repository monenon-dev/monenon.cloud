"use client";

import { Moon, Sun, Monitor } from "lucide-react";

import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";
import { applyThemeMode, type ThemeMode } from "@/lib/mypage-preferences";

const THEME_OPTIONS: { id: ThemeMode; label: string; description: string; icon: typeof Sun }[] =
  [
    { id: "light", label: "라이트", description: "밝은 배경의 깔끔한 화면", icon: Sun },
    { id: "dark", label: "다크", description: "어두운 배경으로 눈의 피로 감소", icon: Moon },
    { id: "system", label: "시스템", description: "기기 설정에 따라 자동 전환", icon: Monitor },
  ];

type ThemeSectionProps = {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
};

export function ThemeSection({ themeMode, onThemeChange }: ThemeSectionProps) {
  const handleSelect = (mode: ThemeMode) => {
    applyThemeMode(mode);
    onThemeChange(mode);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {THEME_OPTIONS.map(({ id, label, description, icon: Icon }) => {
        const active = themeMode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => handleSelect(id)}
            className={`${mypageCardClass} text-left transition-all hover:-translate-y-0.5 ${
              active
                ? "border-indigo-500 ring-2 ring-indigo-500/30"
                : "hover:border-indigo-200 dark:hover:border-indigo-800"
            }`}
          >
            <div
              className={`mb-4 inline-flex rounded-2xl p-3 ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Icon size={22} />
            </div>
            <h3 className="text-base font-semibold">{label}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </button>
        );
      })}
    </div>
  );
}
