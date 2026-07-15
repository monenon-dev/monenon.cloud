import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

/** 레슨 허브에서 크롤링 메뉴를 제거함 — 기존 URL은 수업 메인으로 보냄 */
export default function CrawlingLayout({ children: _children }: { children: React.ReactNode }) {
  redirect(routes.lesson.hub);
}
