import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ClearAdminSessionOutsideAdmin } from '@/components/auth/clear-admin-outside-admin'
import { UserWarningNotifier } from '@/components/auth/user-warning-notifier'
import './globals.css'

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  // 브라우저 탭에 표시될 타이틀입니다.
  title: 'Monenon | AI Agent Orchestration', 
  description: 'Advanced AI Agent Orchestration Platform for Developers',
  generator: 'Monenon Labs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // 1. lang을 "ko"에서 "en"으로 변경 (영문 서비스 기준)
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className={`${geistSans.className} antialiased bg-white dark:bg-gray-950`}>
        <ClearAdminSessionOutsideAdmin />
        <UserWarningNotifier />
        {children}
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  )
}