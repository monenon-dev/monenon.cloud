export type CrawlingNewsItem = {
  id: string;
  category: string;
  source: string;
  title: string;
  summary: string;
  date: string;
};

/** 수업용 더미 — 추후 실제 크롤링 결과로 교체 */
export const CRAWLING_NEWS_DUMMY: CrawlingNewsItem[] = [
  {
    id: "1",
    category: "IT/과학",
    source: "네이버 뉴스",
    title: "AI 에이전트 시장 빠르게 성장... 기업 도입 확대",
    summary:
      "생성형 AI를 넘어 업무 자동화 에이전트 수요가 늘면서 국내외 IT 기업들이 관련 솔루션 출시에 속도를 내고 있다.",
    date: "2026.06.12",
  },
  {
    id: "2",
    category: "경제",
    source: "네이버 뉴스",
    title: "반도체 업황 회복 신호... 수출 증가세 지속",
    summary:
      "메모리 반도체 가격 상승과 수요 회복이 맞물리며 국내 주요 기업들의 실적 개선 기대감이 커지고 있다.",
    date: "2026.06.12",
  },
  {
    id: "3",
    category: "사회",
    source: "네이버 뉴스",
    title: "폭염 특보 발령... 건강 관리 당부",
    summary:
      "전국 대부분 지역에 폭염 특보가 내려지면서 야외 활동 시 수분 섭취와 휴식을 충분히 취할 것을 당부했다.",
    date: "2026.06.11",
  },
  {
    id: "4",
    category: "IT/과학",
    source: "네이버 뉴스",
    title: "클라우드 보안 투자 확대... 제로트러스트 도입 가속",
    summary:
      "원격 근무 확산에 따라 기업들이 클라우드 보안 체계를 재정비하고 제로트러스트 아키텍처 도입을 검토하고 있다.",
    date: "2026.06.11",
  },
  {
    id: "5",
    category: "경제",
    source: "네이버 뉴스",
    title: "스타트업 투자 회복 조짐... AI 분야 집중",
    summary:
      "올해 상반기 벤처 투자가 점진적으로 회복되며 인공지능·데이터 인프라 분야에 자금이 집중되는 양상이다.",
    date: "2026.06.10",
  },
  {
    id: "6",
    category: "사회",
    source: "네이버 뉴스",
    title: "지하철 무임승차 연령 조정 논의 본격화",
    summary:
      "지방자치단체와 국회를 중심으로 대중교통 무임 연령 기준 조정을 둘러싼 논의가 이어지고 있다.",
    date: "2026.06.10",
  },
];
