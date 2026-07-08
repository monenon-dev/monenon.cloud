"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { addBoardPost } from "@/lib/crawling-board-store";

export default function CrawlingWritePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const author = String(formData.get("author") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!content) {
      setError("내용을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      addBoardPost({ title, author, content });
      router.push("/lesson/crawling/board");
    } catch {
      setError("글 등록에 실패했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <p className="text-[11px] font-semibold tracking-widest text-gray-400">LESSON · CRAWLING</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">3. 게시판 글쓰기</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
        새 글을 작성하면 게시판 목록에 추가됩니다.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 max-w-2xl space-y-6">
        <label className="block text-sm">
          <span className="mb-2 block font-medium text-gray-800">제목</span>
          <input
            name="title"
            type="text"
            required
            placeholder="제목을 입력하세요"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block font-medium text-gray-800">작성자</span>
          <input
            name="author"
            type="text"
            placeholder="이름을 입력하세요 (선택)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block font-medium text-gray-800">내용</span>
          <textarea
            name="content"
            required
            rows={10}
            placeholder="내용을 입력하세요"
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "등록 중…" : "등록"}
          </button>
          <Link
            href="/lesson/crawling/board"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
