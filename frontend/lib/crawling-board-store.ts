export type BoardPost = {
  id: number;
  title: string;
  author: string;
  createdAt: string;
  content: string;
};

const STORAGE_KEY = "lesson_crawling_board_posts_v1";

const SEED_POSTS: BoardPost[] = [
  {
    id: 3,
    title: "네이버 뉴스 크롤링 결과 공유",
    author: "관리자",
    createdAt: "2026-06-10",
    content: "크롤링한 뉴스 카드 데이터를 게시판에서 공유합니다.",
  },
  {
    id: 2,
    title: "크롤링 주기 설정 관련 문의",
    author: "수강생A",
    createdAt: "2026-06-09",
    content: "크롤링 주기를 하루 1회로 설정할 수 있을까요?",
  },
  {
    id: 1,
    title: "게시판 기능 안내",
    author: "관리자",
    createdAt: "2026-06-08",
    content: "새 글 작성 시 목록에 추가됩니다.",
  },
];

function readPosts(): BoardPost[] {
  if (typeof window === "undefined") return SEED_POSTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_POSTS));
      return SEED_POSTS;
    }
    const parsed = JSON.parse(raw) as BoardPost[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_POSTS;
  } catch {
    return SEED_POSTS;
  }
}

function writePosts(posts: BoardPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export function listBoardPosts(): BoardPost[] {
  return readPosts().sort((a, b) => b.id - a.id);
}

export function addBoardPost(input: { title: string; author: string; content: string }): BoardPost {
  const posts = readPosts();
  const nextId = posts.reduce((max, post) => Math.max(max, post.id), 0) + 1;
  const today = new Date();
  const createdAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const post: BoardPost = {
    id: nextId,
    title: input.title.trim(),
    author: input.author.trim() || "익명",
    createdAt,
    content: input.content.trim(),
  };
  writePosts([post, ...posts]);
  return post;
}
