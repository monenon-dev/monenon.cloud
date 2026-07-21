"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { listBoardPosts, type BoardPost } from "@/lib/crawling-board-store";

export default function CrawlingBoardPage() {
  const [posts, setPosts] = useState<BoardPost[]>([]);

  useEffect(() => {
    setPosts(listBoardPosts());
  }, []);

  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-indigo-300/70">
            LESSON · CRAWLING
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">2. 게시판 목록</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--moneo-muted)]">
            크롤링한 뉴스를 정리하고 공유하는 게시판입니다.
          </p>
        </div>
        <Link
          href="/lesson/crawling/write"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          글쓰기
        </Link>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-[var(--moneo-border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--moneo-border)] bg-white/[0.03] text-[var(--moneo-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium w-16">번호</th>
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium w-28">작성자</th>
              <th className="px-4 py-3 font-medium w-32">작성일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--moneo-border)]">
            {posts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--moneo-muted)]">
                  게시글이 없습니다.
                </td>
              </tr>
            ) : (
              posts.map((post: BoardPost) => (
                <tr key={post.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[var(--moneo-muted)]">{post.id}</td>
                  <td className="px-4 py-3 font-medium text-white">{post.title}</td>
                  <td className="px-4 py-3 text-indigo-100/70">{post.author}</td>
                  <td className="px-4 py-3 text-[var(--moneo-muted)]">{post.createdAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
