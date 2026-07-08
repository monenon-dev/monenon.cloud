import Link from "next/link";

import { routes } from "@/lib/routes";

export type LessonMenuNavActive = "upload" | "walter" | "smith" | "vision";

export function resolveLessonMenuActive(pathname: string): LessonMenuNavActive {
  if (pathname.startsWith(routes.lesson.vision)) return "vision";
  if (
    pathname.startsWith(routes.lesson.titanicSmith) ||
    pathname.startsWith("/titanic-home/smith")
  ) {
    return "smith";
  }
  if (
    pathname.startsWith(routes.lesson.titanicPassengers) ||
    pathname.startsWith("/titanic-home/passengers")
  ) {
    return "walter";
  }
  return "upload";
}

export function LessonMenuNav({ active }: { active: LessonMenuNavActive }) {
  const linkClass = (key: LessonMenuNavActive) =>
    key === active
      ? "rounded-md bg-gray-100 px-3 py-2 text-sm font-medium"
      : "rounded-md px-3 py-2 text-sm hover:bg-gray-100";

  return (
    <nav className="mt-6 flex flex-col gap-2">
      <Link href={routes.lesson.titanicHome} className={linkClass("upload")}>
        1. 데이터 수집(CSV 업로드)
      </Link>
      <Link href={routes.lesson.titanicPassengers} className={linkClass("walter")}>
        2. 월터의 자기소개
      </Link>
      <Link href={routes.lesson.titanicSmith} className={linkClass("smith")}>
        3. 스미스 선장 채팅
      </Link>
      <Link href={routes.lesson.vision} className={linkClass("vision")}>
        4. 레나 vision
      </Link>
    </nav>
  );
}
