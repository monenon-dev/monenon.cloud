import Link from "next/link";

export default function SamsungAnalysisPage() {
  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <p className="text-[11px] font-semibold tracking-widest text-gray-400">LESSON · SAMSUNG</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">1. 삼성전자 분석</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
        DART 분기보고서 표지 텍스트를 기반으로 삼성전자 공시 데이터 분석 수업을 진행합니다.
      </p>

      <Link
        href="/lesson/samsung/upload"
        className="mt-8 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        2. 파일 업로드로 이동
      </Link>
    </div>
  );
}
