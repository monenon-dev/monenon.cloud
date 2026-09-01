import Link from "next/link";

import { routes } from "@/lib/routes";

/** abc.com 데모 랜딩 — 로그인은 Moneo 통합 화면 */
export default function AbcHomePage() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <Link href="/abc" className="text-xl font-bold tracking-tight">
          <span className="text-[#e11d48]">a</span>
          <span className="bg-gradient-to-r from-sky-500 to-blue-700 bg-clip-text text-transparent">
            bc.com
          </span>
        </Link>
        <Link
          href={routes.oauth.login}
          className="rounded-md bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af]"
        >
          로그인
        </Link>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">abc.com (데모)</h1>
        <p className="max-w-xl text-sm leading-relaxed text-slate-600">
          OAuth 연동 PoC용 데모 페이지입니다. 로그인·소셜 버튼은{" "}
          <Link href={routes.oauth.login} className="font-medium text-indigo-600 hover:underline">
            Moneo 로그인
          </Link>
          에서 이용하세요.
        </p>
      </main>
    </div>
  );
}
