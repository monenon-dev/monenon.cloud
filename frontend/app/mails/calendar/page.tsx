"use client";

/**
 * /mails/calendar — Gemini 자연어 파싱 + 화면 캘린더에 일정 표시
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { getSessionUserId } from "@/lib/session-user";
import { addCalendarEvent, type CalendarAddResult, type CalendarEvent } from "@/lib/calendar-api";
import {
  addStoredCalendarEvent,
  loadCalendarEvents,
  parseEventDate,
  removeStoredCalendarEvent,
  toDateKey,
  type StoredCalendarEvent,
} from "@/lib/calendar-store";
import { routes } from "@/lib/routes";

function formatEventDate(date: string, startTime: string, endTime: string): string {
  try {
    const d = new Date(`${date}T${startTime}`);
    const dateStr = d.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    return `${dateStr} ${startTime} ~ ${endTime}`;
  } catch {
    return `${date} ${startTime} ~ ${endTime}`;
  }
}

function EventPreviewCard({
  event,
  onConfirm,
  onCancel,
  confirmed,
}: {
  event: CalendarEvent;
  onConfirm: () => void;
  onCancel: () => void;
  confirmed: boolean;
}) {
  return (
    <div className="ml-9 mt-2 w-full max-w-sm rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="bg-indigo-600 px-4 py-3 flex items-center gap-2">
        <CalendarDays className="size-4 text-white" />
        <span className="text-sm font-semibold text-white truncate">{event.title}</span>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Clock className="size-3.5 text-gray-400 shrink-0" />
          <span>{formatEventDate(event.date, event.start_time, event.end_time)}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <MapPin className="size-3.5 text-gray-400 shrink-0" />
            <span>{event.location}</span>
          </div>
        )}
        {event.description && (
          <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed pt-1">
            {event.description}
          </p>
        )}
      </div>

      {!confirmed ? (
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <CalendarPlus className="size-3.5" />
            캘린더에 추가
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 pb-4 text-sm text-green-600 dark:text-green-400">
          <Check className="size-4" />
          <span>캘린더에 추가되었습니다</span>
        </div>
      )}
    </div>
  );
}

function SavedEventItem({
  event,
  onRemove,
}: {
  event: StoredCalendarEvent;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {event.title}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {event.start_time} ~ {event.end_time}
          </p>
          {event.location && (
            <p className="text-xs text-gray-400 mt-1 truncate">{event.location}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          aria-label="일정 삭제"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

type ChatMsg =
  | { role: "user"; text: string }
  | { role: "ai"; text: string; event?: CalendarEvent; confirmed?: boolean; resultId?: string };

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [savedEvents, setSavedEvents] = useState<StoredCalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      text: '안녕하세요! 일정을 자연어로 말씀해 주시면 Gemini가 파싱해서 왼쪽 캘린더에 추가할 수 있습니다.\n\n예시:\n• "내일 오후 2시에 팀 미팅 1시간"\n• "다음주 월요일 오전 10시 병원 예약"\n• "7월 15일 오후 6시 저녁 약속, 강남역"',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const id = getSessionUserId();
    setUserId(id);
    if (id) {
      setSavedEvents(loadCalendarEvents(id));
      setSelectedDate(new Date());
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const eventDateKeys = useMemo(
    () => new Set(savedEvents.map((event) => event.date)),
    [savedEvents],
  );

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : "";
  const eventsOnSelectedDay = useMemo(
    () =>
      savedEvents
        .filter((event) => event.date === selectedDateKey)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [savedEvents, selectedDateKey],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId || loading) return;

    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      let result: CalendarAddResult = await addCalendarEvent(userId, text);
      if (result.needs_confirm) {
        const ok = window.confirm(
          result.message ||
            "톡캘린더에 겹치는 일정이 있습니다. 그래도 등록할까요?"
        );
        if (!ok) {
          setMessages((prev) => [
            ...prev,
            { role: "ai", text: "겹치는 일정으로 등록을 취소했습니다." },
          ]);
          return;
        }
        result = await addCalendarEvent(userId, text, { confirmOverlap: true });
      }
      if (!result.event) {
        throw new Error(result.message || "일정 파싱에 실패했습니다.");
      }
      const resultId = `event-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: result.message || "아래 일정을 파싱했습니다. 확인 후 캘린더에 추가해 주세요.",
          event: result.event,
          confirmed: false,
          resultId,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `오류가 발생했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (resultId: string, event: CalendarEvent) => {
    if (!userId) return;

    const stored = addStoredCalendarEvent(userId, event);
    setSavedEvents((prev) => [...prev, stored]);
    setSelectedDate(parseEventDate(event.date));

    setMessages((prev) =>
      prev.map((m) =>
        m.role === "ai" && (m as { resultId?: string }).resultId === resultId
          ? { ...m, confirmed: true }
          : m,
      ),
    );
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: `✅ "${event.title}" 일정이 캘린더에 추가되었습니다.\n📅 ${formatEventDate(event.date, event.start_time, event.end_time)}`,
      },
    ]);
  };

  const handleCancel = (resultId: string) => {
    setMessages((prev) =>
      prev.filter((m) => !(m.role === "ai" && (m as { resultId?: string }).resultId === resultId)),
    );
    setMessages((prev) => [
      ...prev,
      { role: "ai", text: "일정 추가를 취소했습니다. 다시 말씀해 주세요." },
    ]);
  };

  const handleRemoveSaved = (id: string) => {
    if (!userId) return;
    removeStoredCalendarEvent(userId, id);
    setSavedEvents((prev) => prev.filter((event) => event.id !== id));
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">로그인이 필요합니다.</p>
          <Link
            href={routes.oauth.login}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
          >
            로그인
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <CalendarDays className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold">일정 관리</h1>
            <p className="text-xs text-gray-400 dark:text-gray-600">Gemini 파싱 · 화면 캘린더</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <aside className="lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 p-4 space-y-4">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                hasEvent: (date) => eventDateKeys.has(toDateKey(date)),
              }}
              modifiersClassNames={{
                hasEvent:
                  "relative font-semibold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1.5 after:rounded-full after:bg-indigo-600",
              }}
            />
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
              {selectedDate
                ? selectedDate.toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })
                : "날짜 선택"}
            </h2>
            {eventsOnSelectedDay.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 px-1">
                이 날짜에 등록된 일정이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {eventsOnSelectedDay.map((event) => (
                  <SavedEventItem
                    key={event.id}
                    event={event}
                    onRemove={() => handleRemoveSaved(event.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} flex-col ${msg.role === "ai" ? "items-start" : "items-end"}`}
              >
                {msg.role === "ai" && (
                  <div className="flex items-start gap-2 mb-1">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                      <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed max-w-sm">
                      {msg.text}
                    </div>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed max-w-sm">
                    {msg.text}
                  </div>
                )}
                {msg.role === "ai" && msg.event && (
                  <EventPreviewCard
                    event={msg.event}
                    confirmed={(msg as { confirmed?: boolean }).confirmed ?? false}
                    onConfirm={() =>
                      handleConfirm((msg as { resultId?: string }).resultId!, msg.event!)
                    }
                    onCancel={() => handleCancel((msg as { resultId?: string }).resultId!)}
                  />
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                    <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 max-w-2xl mx-auto w-full">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="일정을 말씀해 주세요 (예: 내일 오후 3시 치과 예약)"
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 text-center">
              Gemini가 자연어를 파싱 → 확인 후 왼쪽 캘린더에 표시
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
