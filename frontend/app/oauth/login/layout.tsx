import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 — Monenon AI Agent",
  description: "Monenon AI Agent 계정으로 로그인합니다.",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
