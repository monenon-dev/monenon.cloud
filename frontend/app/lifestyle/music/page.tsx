"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Music2,
  Plus,
  Trash2,
  Train,
  PartyPopper,
  ChefHat,
} from "lucide-react";

import { WeatherWidget } from "@/components/weather/weather-widget";
import { getChatUserId } from "@/lib/chat-user";
import {
  createMusicItem,
  deleteMusicItem,
  fetchMusicOverview,
  GENRE_QUICK_TAGS,
  MOOD_QUICK_TAGS,
  SCENE_ORDER,
  updateMusicPrefs,
  type MusicOverview,
  type MusicScene,
} from "@/lib/music-api";

import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();

const SCENE_ICONS: Record<MusicScene, typeof Train> = {
  commute: Train,
  outing: PartyPopper,
  cooking: ChefHat,
};

type UiState = {
  loading: boolean;
  error: string | null;
  savingPrefs: boolean;
  addingScene: MusicScene | null;
  draftTitle: string;
  draftArtist: string;
};

function PageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="size-8 animate-spin text-violet-600" aria-label="불러오는 중" />
    </main>
  );
}

export default function MusicPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [overview, setOverview] = useState<MusicOverview | null>(null);
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [ui, setUi] = useState<UiState>({
    loading: true,
    error: null,
    savingPrefs: false,
    addingScene: null,
    draftTitle: "",
    draftArtist: "",
  });

  const patchUi = (p: Partial<UiState>) => setUi((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    setMounted(true);
    setUserId(getChatUserId());
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setOverview(null);
      patchUi({ loading: false });
      return;
    }
    patchUi({ loading: true, error: null });
    try {
      const data = await fetchMusicOverview(userId, apiBaseUrl);
      setOverview(data);
      setGenreTags(data.prefs.genre_tags ?? []);
      setMoodTags(data.prefs.mood_tags ?? []);
    } catch (e) {
      setOverview(null);
      patchUi({ error: e instanceof Error ? e.message : "불러오기 실패" });
    } finally {
      patchUi({ loading: false });
    }
  }, [userId]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  const toggleTag = (list: string[], tag: string, setter: (v: string[]) => void) => {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const savePrefs = async () => {
    if (!userId) return;
    patchUi({ savingPrefs: true, error: null });
    try {
      await updateMusicPrefs({ user_id: userId, genre_tags: genreTags, mood_tags: moodTags }, apiBaseUrl);
      await load();
    } catch (e) {
      patchUi({ error: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      patchUi({ savingPrefs: false });
    }
  };

  const handleAdd = async (scene: MusicScene) => {
    if (!userId || !ui.draftTitle.trim()) return;
    patchUi({ error: null });
    try {
      await createMusicItem(
        {
          user_id: userId,
          title: ui.draftTitle.trim(),
          artist: ui.draftArtist.trim() || undefined,
          scene,
        },
        apiBaseUrl
      );
      patchUi({ addingScene: null, draftTitle: "", draftArtist: "" });
      await load();
    } catch (e) {
      patchUi({ error: e instanceof Error ? e.message : "등록 실패" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!userId) return;
    try {
      await deleteMusicItem(id, userId, apiBaseUrl);
      await load();
    } catch (e) {
      patchUi({ error: e instanceof Error ? e.message : "삭제 실패" });
    }
  };

  if (!mounted) return <PageFallback />;

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-950">
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm">로그인 후 음악 추천을 사용할 수 있습니다.</p>
          <Link href={routes.oauth.login} className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm text-white">
            로그인
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400">
            <ArrowLeft size={20} />
          </Link>
          <Music2 className="text-violet-600" size={22} />
          <h1 className="flex-1 text-lg font-bold text-gray-900 dark:text-white">음악 추천</h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {ui.error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ui.error}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {overview?.summary ?? "출근길·외출·요리할 때 맞는 음악을 추천합니다."}
          </p>
          <WeatherWidget apiBaseUrl={apiBaseUrl} variant="compact" />
        </div>

        <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 dark:border-violet-900 dark:bg-violet-950/30">
          <h2 className="mb-3 text-sm font-semibold text-violet-800 dark:text-violet-200">내 음악 취향</h2>
          <p className="mb-2 text-xs text-gray-500">장르</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {GENRE_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(genreTags, tag, setGenreTags)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  genreTags.includes(tag)
                    ? "bg-violet-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs text-gray-500">무드</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {MOOD_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(moodTags, tag, setMoodTags)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  moodTags.includes(tag)
                    ? "bg-violet-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={ui.savingPrefs}
            onClick={() => void savePrefs()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {ui.savingPrefs ? "저장 중…" : "취향 저장 후 추천 갱신"}
          </button>
        </section>

        {ui.loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-violet-600" />
          </div>
        ) : overview ? (
          SCENE_ORDER.map((sceneKey) => {
            const section = overview.scenes[sceneKey];
            const saved = overview.saved_by_scene[sceneKey] ?? [];
            const Icon = SCENE_ICONS[sceneKey];
            if (!section) return null;
            return (
              <section
                key={sceneKey}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xl" aria-hidden>
                    {section.emoji}
                  </span>
                  <Icon size={20} className="text-violet-600 dark:text-violet-400" />
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{section.label}</h2>
                    <p className="text-xs text-gray-500">{section.hint}</p>
                  </div>
                </div>

                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">오늘 추천</h3>
                <ul className="mb-4 grid gap-2 sm:grid-cols-2">
                  {section.tracks.map((track, i) => (
                    <li
                      key={`${track.title}-${i}`}
                      className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2.5 dark:border-violet-900/50 dark:bg-violet-950/20"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{track.title}</p>
                      <p className="text-xs text-violet-700 dark:text-violet-300">{track.artist}</p>
                      <p className="mt-1 text-xs text-gray-500">{track.reason}</p>
                    </li>
                  ))}
                </ul>

                {saved.length > 0 && (
                  <>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">내 플레이리스트</h3>
                    <ul className="mb-4 space-y-1">
                      {saved.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                        >
                          <span className="text-sm">
                            {item.title}
                            {item.artist ? ` · ${item.artist}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="text-gray-400 hover:text-red-600"
                            aria-label="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {ui.addingScene === sceneKey ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={ui.draftTitle}
                      onChange={(e) => patchUi({ draftTitle: e.target.value })}
                      placeholder="곡 제목"
                      className="min-w-[120px] flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                    <input
                      value={ui.draftArtist}
                      onChange={(e) => patchUi({ draftArtist: e.target.value })}
                      placeholder="아티스트"
                      className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAdd(sceneKey)}
                      className="rounded-xl bg-violet-600 px-3 py-2 text-sm text-white"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => patchUi({ addingScene: null, draftTitle: "", draftArtist: "" })}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => patchUi({ addingScene: sceneKey, draftTitle: "", draftArtist: "" })}
                    className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 dark:text-violet-400"
                  >
                    <Plus size={16} />
                    곡 저장하기
                  </button>
                )}
              </section>
            );
          })
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800">
            <p className="text-sm text-gray-600">음악 추천을 불러올 수 없습니다.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm text-white"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
