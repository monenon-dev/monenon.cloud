import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입 — Monenon AI Agent",
  description: "Monenon AI Agent 새 계정을 만듭니다.",
};

export default function SignupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
