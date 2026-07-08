import type { CalendarEvent } from "@/lib/calendar-api";

export type StoredCalendarEvent = CalendarEvent & {
  id: string;
  createdAt: string;
};

function storageKey(userId: number): string {
  return `monenon:calendar-events:${userId}`;
}

export function loadCalendarEvents(userId: number): StoredCalendarEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCalendarEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCalendarEvents(userId: number, events: StoredCalendarEvent[]): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(events));
}

export function addStoredCalendarEvent(
  userId: number,
  event: CalendarEvent,
): StoredCalendarEvent {
  const stored: StoredCalendarEvent = {
    ...event,
    id: `evt-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  persistCalendarEvents(userId, [...loadCalendarEvents(userId), stored]);
  return stored;
}

export function removeStoredCalendarEvent(userId: number, id: string): void {
  persistCalendarEvents(
    userId,
    loadCalendarEvents(userId).filter((event) => event.id !== id),
  );
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseEventDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}
