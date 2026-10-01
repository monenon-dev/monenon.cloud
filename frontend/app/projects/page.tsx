"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Github } from "lucide-react";

import { HomeFooter } from "@/components/home/home-footer";
import {
  LANDING_PAGE_SHELL,
  LandingSiteHeader,
} from "@/components/home/landing-site-header";
import { HomeSidebar } from "@/components/layout/home-sidebar";
import { getAuthSession, logoutAuthSession } from "@/lib/auth-api";
import {
  loadMyPagePreferences,
  needsProfileOnboarding,
} from "@/lib/mypage-preferences";
import { PROJECTS, type Project } from "@/lib/projects";
import { routes } from "@/lib/routes";

type AuthUser = { nickname: string; role: string };

export default function ProjectsPage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    sidebarOpen: false,
    authUser: null as AuthUser | null,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      if (needsProfileOnboarding(loadMyPagePreferences(session.user_id))) {
        router.replace(routes.oauth.onboarding);
        return;
      }
      patchUi({ authUser: { nickname: session.nickname, role: session.role } });
    }
  }, [router]);

  const handleLogout = () => {
    logoutAuthSession(routes.oauth.login);
    patchUi({ authUser: null });
  };

  return (
    <div className="relative flex min-h-dvh items-start moneo-grid-bg text-[var(--moneo-text)]">
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <HomeSidebar
        open={ui.sidebarOpen}
        onClose={() => patchUi({ sidebarOpen: false })}
      />

      <div className="relative z-10 flex w-full min-w-0 flex-1 flex-col">
        <LandingSiteHeader
          sidebarOpen={ui.sidebarOpen}
          onSidebarToggle={() => patchUi({ sidebarOpen: !ui.sidebarOpen })}
          authUser={ui.authUser}
          onLogout={handleLogout}
        />

        <main>
          <section className={`${LANDING_PAGE_SHELL} py-10 sm:py-14 lg:py-16`}>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400/80">
              Projects
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              개인 프로젝트
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--moneo-muted)] sm:text-lg">
              moneo 밖에서 만들고 있는 서비스들이에요.
            </p>
          </section>

          <section
            className={`${LANDING_PAGE_SHELL} border-t border-white/10 py-14 sm:py-16 lg:py-20`}
            aria-label="프로젝트 목록"
          >
            <ul className="grid gap-5 sm:grid-cols-2">
              {PROJECTS.map((project) => (
                <li key={project.name}>
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          </section>
        </main>

        <HomeFooter />
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<Project["status"], { label: string; className: string }> = {
  live: {
    label: "운영 중",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200/90",
  },
  preparing: {
    label: "준비 중",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-200/90",
  },
};

function ProjectCard({ project }: { project: Project }) {
  const badge = STATUS_BADGE[project.status];

  return (
    <article className="moneo-glass flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <ProjectAvatar project={project} />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">{project.name}</h2>
            <p className="mt-0.5 break-keep text-sm font-medium text-indigo-300">{project.summary}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--moneo-muted)]">
        {project.description}
      </p>

      {project.tags.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="기술 스택">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs text-gray-400"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {project.links.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          {project.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-indigo-100 transition-colors hover:border-indigo-400/30"
            >
              {link.label === "GitHub" ? (
                <Github size={16} aria-hidden />
              ) : (
                <ExternalLink size={16} aria-hidden />
              )}
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/** 카드 왼쪽 위 원형 프로필. 브랜드 색으로 꽉 채운 원 위에 캐릭터를 올리고, 같은 색 빛을 은은하게 퍼뜨린다. */
function ProjectAvatar({ project }: { project: Project }) {
  const accent = project.accent ?? "#6366f1";
  return (
    <div
      className="relative size-20 shrink-0 overflow-hidden rounded-full border-2"
      style={{
        background: `radial-gradient(circle at 50% 30%, ${accent}, ${accent}cc 55%, #1a0a0c 100%)`,
        borderColor: `${accent}`,
        boxShadow: `0 0 0 4px ${accent}26, 0 0 28px ${accent}66`,
      }}
    >
      {project.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- 움직이는 WebP라 next/image 최적화를 거치지 않는다.
        <img
          src={project.avatar}
          alt={`${project.name} 캐릭터`}
          width={80}
          height={80}
          className="h-full w-full scale-110 object-contain"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white/90">
          {project.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
