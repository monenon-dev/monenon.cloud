import Link from "next/link";

import { LessonLayout } from "@/components/lesson/lesson-layout";
import { routes } from "@/lib/routes";

export default function LessonHubPage() {
  return (
    <LessonLayout active="hub">
      <div className="px-6 py-14 sm:px-10 lg:px-14">
        <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-indigo-300/70">
          LESSON
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">수업용 메인 페이지</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--moneo-muted)]">
          타이타닉·삼성전자 분석 강의 콘텐츠를 제공합니다.
        </p>

        <section className="mt-12 rounded-2xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] p-6 moneo-glass">
          <h2 className="text-sm font-bold tracking-widest text-white">Lesson</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--moneo-muted)]">
            타이타닉 침몰 데이터를 활용한 기초 데이터 분석 및 분류 모델 구현 강의입니다.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-indigo-100/80">
            <li className="flex gap-2">
              <span className="text-[var(--moneo-muted)]">•</span>
              <Link href="/lesson/titanic-home" className="hover:text-indigo-300 hover:underline">
                1. 데이터 수집 (CSV 업로드)
              </Link>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--moneo-muted)]">•</span>
              <Link href="/lesson/titanic-home/smith" className="hover:text-indigo-300 hover:underline">
                2. 스미스 채팅
              </Link>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--moneo-muted)]">•</span>
              <Link href="/star-craft/zerg/vision" className="hover:text-indigo-300 hover:underline">
                3. 레나 vision
              </Link>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--moneo-muted)]">•</span>
              <span>탐색적 데이터 분석 (EDA)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--moneo-muted)]">•</span>
              <span>분류 모델 개발 및 평가</span>
            </li>
          </ul>
          <Link
            href={routes.lesson.titanicHome}
            className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            타이타닉 수업 시작
          </Link>
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] p-6 moneo-glass">
          <h2 className="text-sm font-bold tracking-widest text-white">SAMSUNG</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--moneo-muted)]">
            DART 분기보고서 기반 삼성전자 공시 데이터 분석 수업입니다.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-indigo-100/80">
            <li className="flex gap-2">
              <span className="text-[var(--moneo-muted)]">•</span>
              <Link href="/lesson/samsung" className="hover:text-indigo-300 hover:underline">
                1. 삼성전자 분석
              </Link>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--moneo-muted)]">•</span>
              <Link href="/lesson/samsung/upload" className="hover:text-indigo-300 hover:underline">
                2. 파일 업로드 (PDF → Blob)
              </Link>
            </li>
          </ul>
          <Link
            href="/lesson/samsung"
            className="mt-6 inline-flex items-center rounded-lg border border-[var(--moneo-border)] bg-white/5 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-white/10"
          >
            삼성전자 분석 시작
          </Link>
        </section>
      </div>
    </LessonLayout>
  );
}
