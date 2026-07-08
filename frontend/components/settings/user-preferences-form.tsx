"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Music2,
  Save,
  Shirt,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";

import { RefrigeratorStockSection } from "@/components/settings/refrigerator-stock-section";
import { GENRE_QUICK_TAGS, MOOD_QUICK_TAGS } from "@/lib/music-api";
import { getChatUserId } from "@/lib/chat-user";
import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";
import {
  fetchUserSettings,
  patchUserSettings,
  type LifestyleProfile,
  type GenderPreset,
  type TemperatureSensitivity,
} from "@/lib/user-settings";

const GENDER_OPTIONS: { value: GenderPreset; label: string }[] = [
  { value: "mens", label: "남성복 기준" },
  { value: "womens", label: "여성복 기준" },
  { value: "unisex", label: "남녀공용" },
];

const STYLE_OPTIONS = [
  { value: "casual", label: "캐주얼" },
  { value: "minimal", label: "미니멀" },
  { value: "street", label: "스트릿" },
  { value: "office", label: "오피스룩" },
  { value: "dandy", label: "댄디" },
] as const;

const TEMP_OPTIONS: { value: TemperatureSensitivity; label: string; hint: string }[] = [
  { value: "heat", label: "더위를 많이 탐", hint: "얇은 겉옷·통풍 위주 추천" },
  { value: "normal", label: "보통", hint: "기온에 맞는 일반적인 두께" },
  { value: "cold", label: "추위를 많이 탐", hint: "보온·레이어드 위주 추천" },
];

const COOKING_QUICK_TAGS = [
  "한식 위주",
  "양식 선호",
  "다이어트·식단 관리",
  "자취 초간단 요리",
  "국물 요리",
  "볶음·한 판 요리",
];

type PreferenceSection = "fashion" | "food" | "music";

const PREF_TABS: {
  id: PreferenceSection;
  label: string;
  icon: LucideIcon;
  accent: string;
}[] = [
  { id: "fashion", label: "패션", icon: Shirt, accent: "indigo" },
  { id: "food", label: "식재료·요리", icon: UtensilsCrossed, accent: "indigo" },
  { id: "music", label: "음악", icon: Music2, accent: "violet" },
];

const SECTION_SAVE_LABEL: Record<PreferenceSection, string> = {
  fashion: "패션 선호도 저장",
  food: "식재료·요리 선호도 저장",
  music: "음악 선호도 저장",
};

function defaultLifestyle(): LifestyleProfile {
  return {
    fashion: {
      gender_preset: "unisex",
      style_tags: [],
      temperature_sensitivity: "normal",
    },
    food: {
      avoided_ingredients: [],
      cooking_preference_tags: [],
    },
    music: {
      genre_tags: [],
      mood_tags: [],
    },
  };
}

function normalizeLifestyle(raw: LifestyleProfile | undefined): LifestyleProfile {
  const base = defaultLifestyle();
  if (!raw) return base;
  return {
    fashion: { ...base.fashion, ...raw.fashion },
    food: { ...base.food, ...raw.food },
    music: {
      genre_tags: raw.music?.genre_tags ?? base.music.genre_tags,
      mood_tags: raw.music?.mood_tags ?? base.music.mood_tags,
    },
  };
}

function lifestyleForSectionSave(
  section: PreferenceSection,
  prefs: LifestyleProfile,
  serverPrefs: LifestyleProfile
): LifestyleProfile {
  return {
    fashion: section === "fashion" ? prefs.fashion : serverPrefs.fashion,
    food: section === "food" ? prefs.food : serverPrefs.food,
    music: section === "music" ? prefs.music : serverPrefs.music,
  };
}

type UiState = {
  loading: boolean;
  savingSection: PreferenceSection | null;
  error: string | null;
  savedSection: PreferenceSection | null;
  ingredientDraft: string;
  cookingDraft: string;
};

const apiBaseUrl = getApiBaseUrl();

function tabButtonClass(active: boolean, accent: string) {
  if (active) {
    return accent === "violet"
      ? "border-violet-600 bg-violet-600 text-white shadow-sm"
      : "border-indigo-600 bg-indigo-600 text-white shadow-sm";
  }
  return "border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/80 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40";
}

function SectionSaveBar({
  section,
  saving,
  saved,
  onSave,
}: {
  section: PreferenceSection;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const accent = section === "music" ? "violet" : "indigo";
  return (
    <div className="mt-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      {saved && (
        <p className="text-sm text-green-700 dark:text-green-400">{SECTION_SAVE_LABEL[section]} 완료</p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60 sm:ml-auto ${
          accent === "violet" ? "bg-violet-600 hover:bg-violet-700" : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {SECTION_SAVE_LABEL[section]}
      </button>
    </div>
  );
}

export function UserPreferencesForm({
  showBackLink = true,
  title = "선호도 설정",
  subtitle = "옷장·냉장고·음악 추천에 반영되는 라이프스타일 선호도입니다.",
  constrainHeight = false,
}: {
  showBackLink?: boolean;
  title?: string;
  subtitle?: string;
  /** true면 탭 패널(선호도 카드) 안에서만 스크롤 — 페이지 전체는 고정 */
  constrainHeight?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<PreferenceSection>("fashion");
  const [prefs, setPrefs] = useState<LifestyleProfile>(defaultLifestyle);
  const [serverPrefs, setServerPrefs] = useState<LifestyleProfile>(defaultLifestyle);
  const [ui, setUi] = useState<UiState>({
    loading: true,
    savingSection: null,
    error: null,
    savedSection: null,
    ingredientDraft: "",
    cookingDraft: "",
  });

  const patchUi = useCallback((p: Partial<UiState>) => {
    setUi((prev) => ({ ...prev, ...p }));
  }, []);

  const load = useCallback(async () => {
    const userId = getChatUserId();
    if (!userId) {
      patchUi({ loading: false, error: null });
      return;
    }
    patchUi({ loading: true, error: null, savedSection: null });
    try {
      const data = await fetchUserSettings(userId, apiBaseUrl);
      const lifestyle = normalizeLifestyle(data.lifestyle);
      setPrefs(lifestyle);
      setServerPrefs(lifestyle);
    } catch (e) {
      patchUi({
        error: e instanceof Error ? e.message : "불러오기 실패",
      });
    } finally {
      patchUi({ loading: false });
    }
  }, [patchUi]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearSaved = () => patchUi({ savedSection: null });

  const selectSection = (id: PreferenceSection) => {
    setActiveSection(id);
    clearSaved();
  };

  const toggleStyle = (value: string) => {
    setPrefs((prev) => {
      const tags = prev.fashion.style_tags;
      const has = tags.includes(value);
      return {
        ...prev,
        fashion: {
          ...prev.fashion,
          style_tags: has ? tags.filter((t) => t !== value) : [...tags, value],
        },
      };
    });
    clearSaved();
  };

  const addIngredient = () => {
    const raw = ui.ingredientDraft.trim();
    if (!raw) return;
    setPrefs((prev) => {
      const lower = raw.toLowerCase();
      if (prev.food.avoided_ingredients.some((x) => x.toLowerCase() === lower)) {
        return prev;
      }
      return {
        ...prev,
        food: {
          ...prev.food,
          avoided_ingredients: [...prev.food.avoided_ingredients, raw],
        },
      };
    });
    patchUi({ ingredientDraft: "", savedSection: null });
  };

  const removeIngredient = (item: string) => {
    setPrefs((prev) => ({
      ...prev,
      food: {
        ...prev.food,
        avoided_ingredients: prev.food.avoided_ingredients.filter((x) => x !== item),
      },
    }));
    clearSaved();
  };

  const addCookingTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    setPrefs((prev) => {
      const lower = t.toLowerCase();
      if (prev.food.cooking_preference_tags.some((x) => x.toLowerCase() === lower)) {
        return prev;
      }
      return {
        ...prev,
        food: {
          ...prev.food,
          cooking_preference_tags: [...prev.food.cooking_preference_tags, t],
        },
      };
    });
    patchUi({ cookingDraft: "", savedSection: null });
  };

  const removeCookingTag = (item: string) => {
    setPrefs((prev) => ({
      ...prev,
      food: {
        ...prev.food,
        cooking_preference_tags: prev.food.cooking_preference_tags.filter((x) => x !== item),
      },
    }));
    clearSaved();
  };

  const toggleMusicTag = (listKey: "genre_tags" | "mood_tags", tag: string) => {
    setPrefs((prev) => {
      const list = prev.music[listKey];
      const has = list.includes(tag);
      return {
        ...prev,
        music: {
          ...prev.music,
          [listKey]: has ? list.filter((t) => t !== tag) : [...list, tag],
        },
      };
    });
    clearSaved();
  };

  const handleSaveSection = async (section: PreferenceSection) => {
    const userId = getChatUserId();
    if (!userId) return;
    patchUi({ savingSection: section, error: null, savedSection: null });
    try {
      const lifestyle = lifestyleForSectionSave(section, prefs, serverPrefs);
      await patchUserSettings(userId, { lifestyle }, apiBaseUrl);
      setServerPrefs((prev) => ({
        ...prev,
        [section]: lifestyle[section],
      }));
      patchUi({ savedSection: section });
    } catch (e) {
      patchUi({
        error: e instanceof Error ? e.message : "저장 실패",
      });
    } finally {
      patchUi({ savingSection: null });
    }
  };

  const userId = typeof window !== "undefined" ? getChatUserId() : null;

  if (!userId && !ui.loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/80 px-6 py-8 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm text-gray-800 dark:text-gray-200">
          선호도를 저장하려면 로그인이 필요합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={routes.oauth.login}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            로그인
          </Link>
          {showBackLink && (
            <Link href="/" className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">
              홈으로
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto max-w-3xl space-y-4 ${
        constrainHeight ? "flex min-h-0 flex-1 flex-col pb-2" : "space-y-6 pb-8"
      }`}
    >
      {showBackLink && (
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft size={18} />
          홈
        </Link>
      )}

      <header className={constrainHeight ? "shrink-0" : undefined}>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>

        {!ui.loading && (
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="선호도 카테고리">
            {PREF_TABS.map(({ id, label, icon: Icon, accent }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeSection === id}
                onClick={() => selectSection(id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${tabButtonClass(activeSection === id, accent)}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        )}

        {!ui.loading && (
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-xs text-gray-500 underline hover:text-gray-800 dark:hover:text-gray-300"
          >
            서버에서 다시 불러오기
          </button>
        )}
      </header>

      {ui.error && (
        <p
          role="alert"
          className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 ${
            constrainHeight ? "shrink-0" : ""
          }`}
        >
          {ui.error}
        </p>
      )}

      {ui.loading ? (
        <div className={`flex justify-center py-16 ${constrainHeight ? "min-h-0 flex-1" : ""}`}>
          <Loader2 className="size-8 animate-spin text-indigo-600" aria-label="불러오는 중" />
        </div>
      ) : (
        <div
          role="tabpanel"
          aria-label={PREF_TABS.find((t) => t.id === activeSection)?.label}
          className={constrainHeight ? "flex min-h-0 flex-1 flex-col" : undefined}
        >
          {activeSection === "fashion" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Shirt size={22} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">패션 스타일 선호도</h2>
              </div>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                날씨 AI가 옷차림을 추천할 때 참고합니다.{" "}
                <Link href={routes.lifestyle.closet} className="text-indigo-600 underline dark:text-indigo-400">
                  옷장
                </Link>
                에 반영됩니다.
              </p>

              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    성별·실루엣 프리셋
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setPrefs((p) => ({
                            ...p,
                            fashion: { ...p.fashion, gender_preset: opt.value },
                          }));
                          clearSaved();
                        }}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          prefs.fashion.gender_preset === opt.value
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    선호 스타일 (복수 선택)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((opt) => {
                      const on = prefs.fashion.style_tags.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleStyle(opt.value)}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            on
                              ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">더위·추위 민감도</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {TEMP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setPrefs((p) => ({
                            ...p,
                            fashion: { ...p.fashion, temperature_sensitivity: opt.value },
                          }));
                          clearSaved();
                        }}
                        className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                          prefs.fashion.temperature_sensitivity === opt.value
                            ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 dark:bg-indigo-950/40"
                            : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80"
                        }`}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{opt.label}</span>
                        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <SectionSaveBar
                section="fashion"
                saving={ui.savingSection === "fashion"}
                saved={ui.savedSection === "fashion"}
                onSave={() => void handleSaveSection("fashion")}
              />
            </section>
          )}

          {activeSection === "food" && (
            <section
              className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/40 ${
                constrainHeight ? "min-h-0 flex-1" : ""
              }`}
            >
              <div className="shrink-0 border-b border-slate-200 px-6 pb-4 pt-6 dark:border-slate-700">
                <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <UtensilsCrossed size={22} />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    식재료·요리 선호도
                  </h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  냉장고 레시피 추천에 반영됩니다.{" "}
                  <Link href={routes.lifestyle.refrigerator} className="text-indigo-600 underline dark:text-indigo-400">
                    냉장고
                  </Link>
                  페이지에서 확인하세요.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    기피·알레르기 재료
                  </p>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-950/40">
                    {prefs.food.avoided_ingredients.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm shadow-sm dark:bg-gray-800"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeIngredient(item)}
                          className="rounded-full p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700"
                          aria-label={`${item} 제거`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={ui.ingredientDraft}
                      onChange={(e) => patchUi({ ingredientDraft: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addIngredient();
                        }
                      }}
                      placeholder="예: 오이, 땅콩, 고수…"
                      className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                    >
                      추가
                    </button>
                  </div>
                </div>

                {userId ? <RefrigeratorStockSection userId={userId} /> : null}

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">선호 요리·식단 성향</p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {COOKING_QUICK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addCookingTag(tag)}
                        className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-700 dark:border-gray-600 dark:text-gray-400"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-950/40">
                    {prefs.food.cooking_preference_tags.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeCookingTag(item)}
                          className="rounded-full p-0.5 hover:bg-indigo-200/50 dark:hover:bg-indigo-900"
                          aria-label={`${item} 제거`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={ui.cookingDraft}
                      onChange={(e) => patchUi({ cookingDraft: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCookingTag(ui.cookingDraft);
                        }
                      }}
                      placeholder="직접 입력 후 Enter"
                      className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => addCookingTag(ui.cookingDraft)}
                      className="shrink-0 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 px-6 pb-6 pt-2 dark:border-slate-700">
                <SectionSaveBar
                  section="food"
                  saving={ui.savingSection === "food"}
                  saved={ui.savedSection === "food"}
                  onSave={() => void handleSaveSection("food")}
                />
              </div>
            </section>
          )}

          {activeSection === "music" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center gap-2 text-violet-600 dark:text-violet-400">
                <Music2 size={22} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">음악 선호도</h2>
              </div>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                출근길·외출·요리할 때 음악 추천에 반영됩니다.{" "}
                <Link href={routes.lifestyle.music} className="text-violet-600 underline dark:text-violet-400">
                  음악 추천
                </Link>
                페이지에서 확인하세요.
              </p>

              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">선호 장르</p>
                  <div className="flex flex-wrap gap-2">
                    {GENRE_QUICK_TAGS.map((tag) => {
                      const on = prefs.music.genre_tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleMusicTag("genre_tags", tag)}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            on
                              ? "border-violet-600 bg-violet-50 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">선호 무드</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_QUICK_TAGS.map((tag) => {
                      const on = prefs.music.mood_tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleMusicTag("mood_tags", tag)}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            on
                              ? "border-violet-600 bg-violet-50 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <SectionSaveBar
                section="music"
                saving={ui.savingSection === "music"}
                saved={ui.savedSection === "music"}
                onSave={() => void handleSaveSection("music")}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
