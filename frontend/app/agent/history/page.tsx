import type { Metadata } from "next";
import { AgentHistoryView } from "@/components/agent-history/agent-history-view";

export const metadata: Metadata = {
  title: "에이전트 히스토리 — Moneo",
  description: "Moneo agent 실행 타임라인과 감사 로그",
};

export default function AgentHistoryPage() {
  return <AgentHistoryView />;
}
