import Link from "next/link";

/** abc.com 랜딩 — 우측 상단 로그인 → /abc/login */
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
          href="/abc/login"
          className="rounded-md bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af]"
        >
          로그인
        </Link>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">abc.com</h1>
        <p className="max-w-xl text-sm leading-relaxed text-slate-600">
          우측 상단 로그인으로 eGovFrame 스타일 로그인 화면을 엽니다. 개발 연동은 일반(아이디/비밀번호) →{" "}
          <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">http://api.abc.com</code> 만
          연결됩니다.
        </p>
      </main>
    </div>
  );
}
