import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display, Space_Grotesk } from "next/font/google";
import { ClearAdminSessionOutsideAdmin } from "@/components/auth/clear-admin-outside-admin";
import { UserWarningNotifier } from "@/components/auth/user-warning-notifier";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "Moneo | AI Agents Orchestrated for Work",
  description:
    "Moneo — AI agent platform for briefings, document ops, and work reports.",
  generator: "Moneo",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-dark-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`dark ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${playfair.variable}`}
    >
      <body
        className={`${spaceGrotesk.className} antialiased bg-[var(--moneo-bg)] text-[var(--moneo-text)]`}
      >
        <ClearAdminSessionOutsideAdmin />
        <UserWarningNotifier />
        {children}
      </body>
    </html>
  );
}
