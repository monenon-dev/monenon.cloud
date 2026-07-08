import { getApiBaseUrl } from "@/lib/api-base";

const api = getApiBaseUrl();

export type AllowedSender = {
  id: number;
  user_id: number;
  email: string;
  label: string | null;
  created_at: string;
};

export type InboxMail = {
  id: number;
  user_id: number;
  from_email: string;
  from_name: string | null;
  subject: string;
  body_text: string | null;
  gemini_summary: string | null;
  is_read: boolean;
  received_at: string;
  created_at: string;
};

export async function fetchAllowedSenders(userId: number): Promise<AllowedSender[]> {
  const res = await fetch(`${api}/mail/allowed-senders?user_id=${userId}`);
  if (!res.ok) throw new Error("허용 발신자 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function addAllowedSender(
  userId: number,
  email: string,
  label: string | null
): Promise<AllowedSender> {
  const res = await fetch(`${api}/mail/allowed-senders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, email, label: label || null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as Record<string, unknown>).detail;
    throw new Error(typeof msg === "string" ? msg : "발신자 추가에 실패했습니다.");
  }
  return data;
}

export async function deleteAllowedSender(userId: number, senderId: number): Promise<void> {
  const res = await fetch(`${api}/mail/allowed-senders/${senderId}?user_id=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("발신자 삭제에 실패했습니다.");
}

export async function fetchInbox(userId: number): Promise<InboxMail[]> {
  const res = await fetch(`${api}/mail/inbox?user_id=${userId}`);
  if (!res.ok) throw new Error("수신함을 불러오지 못했습니다.");
  return res.json();
}

export async function markAsRead(userId: number, mailId: number): Promise<InboxMail> {
  const res = await fetch(`${api}/mail/inbox/${mailId}/read?user_id=${userId}`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("읽음 처리에 실패했습니다.");
  return res.json();
}

export async function deleteMail(userId: number, mailId: number): Promise<void> {
  const res = await fetch(`${api}/mail/inbox/${mailId}?user_id=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("메일 삭제에 실패했습니다.");
}

export type MailSendResult = {
  ok: boolean;
  to_email: string;
  subject: string;
  body: string;
};

export async function sendMail(
  userId: number,
  toEmail: string,
  instruction: string
): Promise<MailSendResult> {
  const res = await fetch(`${api}/mail/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, to_email: toEmail, instruction }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as Record<string, unknown>).detail;
    throw new Error(typeof msg === "string" ? msg : "메일 발송에 실패했습니다.");
  }
  return data;
}
