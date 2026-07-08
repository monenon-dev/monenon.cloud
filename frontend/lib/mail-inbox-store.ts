import { promises as fs } from "fs";
import path from "path";

import type { InboxMessage } from "@/lib/mail-inbox-types";

const DATA_DIR = path.join(process.cwd(), ".data");
const INBOX_FILE = path.join(DATA_DIR, "mail-inbox.json");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readInboxStore(): Promise<InboxMessage[]> {
  try {
    const raw = await fs.readFile(INBOX_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeStoredMessage(item))
      .filter((item): item is InboxMessage => item !== null);
  } catch {
    return [];
  }
}

export async function upsertInboxMessages(messages: InboxMessage[]): Promise<InboxMessage[]> {
  const existing = await readInboxStore();
  const map = new Map<string, InboxMessage>();
  for (const msg of [...existing, ...messages]) {
    map.set(msg.id, msg);
  }
  const merged = [...map.values()].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
  await ensureDataDir();
  await fs.writeFile(INBOX_FILE, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

function normalizeStoredMessage(item: unknown): InboxMessage | null {
  if (typeof item !== "object" || item === null) return null;
  const row = item as Partial<InboxMessage>;
  const from = String(row.from ?? "").trim();
  const subject = String(row.subject ?? "").trim();
  const snippet = String(row.snippet ?? "").trim();
  const receivedAt = String(row.receivedAt ?? "").trim() || new Date().toISOString();
  const id = String(row.id ?? "").trim() || `${from}-${receivedAt}`;
  if (!from) return null;
  return { id, from, subject: subject || "(제목 없음)", snippet, receivedAt };
}
