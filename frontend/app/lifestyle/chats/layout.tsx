import type { ReactNode } from "react";

/** 채팅 페이지: 뷰포트 고정, 본문(페이지) 스크롤 방지 */
export default function ChatsLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh overflow-hidden">{children}</div>;
}
