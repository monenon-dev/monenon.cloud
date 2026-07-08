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
          <p className="text-[11px] font-semibold tracking-widest text-gray-400">LESSON · CRAWLING</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">2. 게시판 목록</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            크롤링한 뉴스를 정리하고 공유하는 게시판입니다.
          </p>
        </div>
        <Link
          href="/lesson/crawling/write"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          글쓰기
        </Link>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium w-16">번호</th>
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium w-28">작성자</th>
              <th className="px-4 py-3 font-medium w-32">작성일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50/80">
                <td className="px-4 py-3 text-gray-500">{post.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{post.title}</td>
                <td className="px-4 py-3 text-gray-600">{post.author}</td>
                <td className="px-4 py-3 text-gray-500">{post.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
