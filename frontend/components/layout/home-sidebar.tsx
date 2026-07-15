"use client";

import Link from "next/link";
import {
  Bot,
  Terminal,
} from "lucide-react";

import { LINK_NAV, PLATFORM_NAV } from "@/components/layout/platform-sidebar-layout";
import { lifestyleDashboardSection, routes } from "@/lib/routes";

interface HomeSidebarProps {
  open: boolean;
  onClose: () => void;
  activeView?: "chat" | "logs" | null;
}

const WORK_CHAT_PROMPTS: Record<string, string> = {
  closet: "오늘 일정과 할 일 기준으로 업무 브리핑을 작성해 줘",
  refrigerator: "흩어진 문서와 자료를 주제별로 정리해 줘",
  music: "이번 주 업무 진행 상황을 리포트로 정리해 줘",
};

function workChatHref(prompt: string): string {
  const params = new URLSearchParams({ new: "1", prompt });
  return `${routes.lifestyle.chats}?${params.toString()}`;
}

function navHref(sectionId: string): string {
  if (sectionId === "user_settings") return routes.lifestyle.settings;
  if (sectionId in WORK_CHAT_PROMPTS) {
    return workChatHref(WORK_CHAT_PROMPTS[sectionId]);
  }
  if (sectionId === "messages") return routes.lifestyle.chats;
  return lifestyleDashboardSection(sectionId);
}

export function HomeSidebar({
  open,
  onClose,
  activeView = null,
}: HomeSidebarProps) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="sidebar overlay close"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-dvh shrink-0 self-start
          border-r border-white/10
          bg-[rgba(10,10,15,0.95)]
          transition-[width,transform] duration-300 ease-in-out
          ${open ? "w-64 translate-x-0" : "w-0 -translate-x-full lg:translate-x-0 overflow-hidden"}
        `}
      >
        <div className="flex h-full w-64 flex-col">
          <div className="flex h-14 items-center border-b border-white/10 px-4">
            <span className="text-sm font-bold text-indigo-300">메뉴</span>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            <div>
              <p className="mb-2 px-2 text-xs font-semibold tracking-wider text-indigo-200/50">
                홈
              </p>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={routes.lifestyle.chats}
                    onClick={onClose}
                    className={navClass(activeView === "chat")}
                  >
                    <Bot size={18} />
                    에이전트 채팅
                  </Link>
                </li>
                <li>
                  <Link
                    href={routes.agent.history}
                    onClick={onClose}
                    className={navClass(activeView === "logs")}
                  >
                    <Terminal size={18} />
                    Agent 히스토리
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-2 px-2 text-xs font-semibold tracking-wider text-indigo-200/50">관리</p>
              <ul className="space-y-0.5">
                {LINK_NAV.map(item => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onClose} className={navClass(false)}>
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {PLATFORM_NAV.map((group) => (
              <div key={group.title}>
                <p className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold tracking-wider text-indigo-200/50">
                  <group.icon size={14} />
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={navHref(item.id)}
                        onClick={onClose}
                        className={navClass(false)}
                      >
                        <item.icon size={18} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}

function navClass(active: boolean) {
  return `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
    active
      ? "bg-indigo-500/25 text-indigo-100 border border-indigo-400/30"
      : "text-indigo-100/75 hover:bg-white/5"
  }`;
}
