/**
 * 수행 사례 데이터
 *
 * 명세: spec/case-studies/requirements.md
 * - catalogNo 는 위시켓 포트폴리오 목록 번호(1~23)이고, 지원서의 첨부 포트폴리오와 대응한다.
 *   위시켓 목록에 없는 사례는 null 이다.
 * - slug 는 지원서에 붙는 주소라서 한 번 정하면 바꾸지 않는다.
 * - 본문은 공개하기로 확인된 내용만 담는다. forbidden 은 해당 사례에서 쓰면 안 되는 표현이고
 *   tests/unit/data/case-studies.test.ts 가 본문에 들어가지 않았는지 검사한다.
 */

/** 구역: 회사가 수행한 사례인지, 대표가 이전에 수행한 경력인지 */
export type CaseSection = "company" | "career";

/** 분야 */
export type CaseCategory = "ai" | "data" | "commerce" | "app" | "consulting";

/** 수행 단계 */
export type CaseStage =
  | "operation" // 구축·운영
  | "build" // 구축 중·배포
  | "poc" // 프로토타입·PoC
  | "design" // 설계·요구사항 정의
  | "proposal" // 제안
  | "mockup" // 제안용 화면 시안
  | "enablement"; // 가이드·교육

export interface CaseStudy {
  catalogNo: number | null;
  slug: string;
  section: CaseSection;
  title: string;
  category: CaseCategory;
  stage: CaseStage;
  /** 단계를 더 구체적으로 적은 한 줄 */
  stageNote: string;
  role: string;
  /** 수행 시기. 확인된 값이 없으면 비운다 */
  period?: string;
  summary: string;
  /** 과제: 무엇을 해결하려 했는가 */
  challenge: string;
  /** 한 일과 결과 */
  highlights: string[];
  tech?: string[];
  /** 이 사례 본문에 쓰면 안 되는 표현 */
  forbidden: string[];
}

export const CASE_SECTION_LABELS: Record<CaseSection, string> = {
  company: "회사 수행 사례",
  career: "대표 경력",
};

export const CASE_SECTION_DESCRIPTIONS: Record<CaseSection, string> = {
  company: "생각과행동이 직접 기획하고 만든 사례입니다.",
  career:
    "대표가 생각과행동 설립 전후로 PM, 아키텍트, 컨설턴트로 수행한 경력입니다. 회사의 수행 실적과 구분해서 보여 드립니다.",
};

export const CASE_CATEGORY_LABELS: Record<CaseCategory, string> = {
  ai: "AI·문서지능",
  data: "데이터 플랫폼",
  commerce: "커머스·결제",
  app: "앱 서비스",
  consulting: "설계·컨설팅",
};

export const CASE_STAGE_LABELS: Record<CaseStage, string> = {
  operation: "구축·운영",
  build: "구축·배포",
  poc: "프로토타입·PoC",
  design: "설계",
  proposal: "제안",
  mockup: "화면 시안",
  enablement: "가이드·교육",
};

export const caseStudies: CaseStudy[] = [
  {
    catalogNo: 1,
    slug: "new-business-discovery-platform",
    section: "career",
    title: "AI 기반 신사업 탐색·검증 플랫폼",
    category: "ai",
    stage: "operation",
    stageNote: "사내 팀이 쓰는 도구로 운영 중",
    role: "기획부터 구현까지 (풀스택 + PM)",
    period: "2026.01 ~ 진행 중",
    summary:
      "신사업 아이디어를 수집하고 단계별로 검토하는 과정을 하나의 흐름으로 묶은 사내 플랫폼입니다.",
    challenge:
      "신사업 후보를 검토하는 기준과 진행 상태가 사람마다 달라 검토 이력을 추적하기 어려웠습니다.",
    highlights: [
      "아이디어 수집부터 판단까지 9단계 검토 흐름과 상태 전환을 설계했습니다.",
      "검토 자료를 AI가 보조해서 만들고 발표 자료를 자동으로 생성하는 기능을 넣었습니다.",
      "정기 수집 작업을 매일 돌리는 서버리스 구조로 운영합니다.",
    ],
    tech: ["Remix", "Cloudflare", "D1", "Drizzle", "React", "TypeScript"],
    forbidden: ["33장", "외부 고객", "사용자 수"],
  },
  {
    catalogNo: 2,
    slug: "document-analysis-ai-assistant",
    section: "career",
    title: "문서 분석 기반 AI 업무지원 플랫폼",
    category: "ai",
    stage: "poc",
    stageNote: "프로토타입·PoC 단계",
    role: "풀스택 + PM",
    period: "2026.02 ~ 2026.05",
    summary:
      "정책과 업무 문서를 구조화해서 검색하고 답변 품질을 자동으로 평가하는 업무지원 플랫폼의 PoC입니다.",
    challenge:
      "흩어진 정책과 문서를 사람이 일일이 찾아 읽어야 했고, AI 답변을 믿어도 되는지 판단할 기준이 없었습니다.",
    highlights: [
      "정책 848건과 문서 88건을 구조화했습니다.",
      "답변을 자동으로 평가해 즉시 활용 52%, 보완 후 활용 32%, 사람 확인 16%로 분류했습니다.",
      "서버리스 환경에서 스프린트 단위로 PoC를 진행했습니다.",
    ],
    forbidden: ["운영 중", "구축·운영 경험"],
  },
  {
    catalogNo: 3,
    slug: "multi-agent-bizdev-automation",
    section: "career",
    title: "멀티에이전트 기반 사업개발 자동화 플랫폼 설계",
    category: "ai",
    stage: "build",
    stageNote: "구축 중 (운영 전)",
    role: "풀스택 + 멀티에이전트 설계 + PM",
    period: "2025 하반기 ~ 진행 중",
    summary:
      "사업 검토에 필요한 조사와 정리를 여러 AI 에이전트가 나눠 수행하도록 설계한 자동화 플랫폼입니다.",
    challenge: "사업 검토 한 건을 정리하는 데 2~4주가 걸렸습니다.",
    highlights: [
      "사업 검토 한 건에 걸리는 시간을 2~4주에서 3일로 줄였습니다.",
      "API 수백 개와 테스트 2천 개 이상 규모의 코드베이스를 테스트 자동화로 관리합니다.",
      "에이전트별 역할과 품질 점검 절차를 설계했습니다.",
    ],
    forbidden: ["운영 중인 서비스", "304", "2,032"],
  },
  {
    catalogNo: 4,
    slug: "easy-word-learning-service",
    section: "company",
    title: "다문화·학습장애 청소년용 AI 단어 학습 서비스",
    category: "app",
    stage: "build",
    stageNote: "웹 배포 + 안드로이드 내부 테스트",
    role: "풀스택 (기획·프론트·백엔드·모바일 빌드)",
    period: "2026.01",
    summary:
      "다문화 가정 학생과 학습장애 청소년이 어려운 단어를 쉬운 뜻과 그림, 음성으로 익히는 단어 학습 서비스입니다.",
    challenge:
      "교과서 단어의 사전 풀이가 어려워서 한국어가 서툴거나 읽기가 느린 학생은 뜻을 스스로 이해하기 어렵습니다.",
    highlights: [
      "난이도 5단계와 학년에 맞춘 쉬운 뜻을 AI로 생성하고 결과 품질을 검증했습니다.",
      "한국어, 베트남어, 중국어 다국어 화면과 음성 합성을 넣었습니다.",
      "웹, 하이브리드 앱, 교사·상담사용 관리자 웹을 함께 만들었습니다.",
      "테스트 2천 개 이상으로 기능을 검증했습니다.",
    ],
    tech: ["Next.js", "TypeScript", "Capacitor", "Cloudflare Workers", "Hono", "D1", "Firebase", "Google Cloud TTS"],
    forbidden: ["운영 중", "스토어 출시", "iOS 출시", "사용자 수", "단독 완주"],
  },
  {
    catalogNo: 5,
    slug: "child-development-expert-matching",
    section: "company",
    title: "아동발달 전문가 매칭 플랫폼 앱과 관리자",
    category: "app",
    stage: "mockup",
    stageNote: "제안용 화면 시안 (화면 10컷)",
    role: "기획·화면 설계",
    period: "2026.06",
    summary:
      "보호자와 아동발달 전문가를 서로 찾아 연결하는 앱과 관리자 화면을 기획한 시안입니다.",
    challenge:
      "보호자는 아이에게 맞는 전문가를 찾기 어렵고, 전문가는 상담 요청을 처음 응대하는 데 시간을 많이 씁니다.",
    highlights: [
      "보호자와 전문가 양쪽에서 조건으로 찾는 매칭과 필터 흐름을 설계했습니다.",
      "첫 문의를 AI가 1차로 응대하는 기능을 기획했습니다.",
      "앱과 관리자 화면 10컷을 시안으로 만들었습니다.",
    ],
    forbidden: ["납품", "풀스택 구현", "서버 인프라"],
  },
  {
    catalogNo: 6,
    slug: "drawing-pdf-price-prediction-poc",
    section: "career",
    title: "도면·견적 PDF 추출 + AI 구매단가 예측 PoC",
    category: "ai",
    stage: "poc",
    stageNote: "PoC 단계",
    role: "기획부터 배포까지",
    period: "2026 상반기",
    summary:
      "도면과 견적 PDF에서 항목을 추출하고 구매단가를 예측하는 방식을 PoC로 검증했습니다.",
    challenge:
      "도면과 견적서가 PDF로만 있어서 단가를 비교하려면 사람이 값을 옮겨 적어야 했습니다.",
    highlights: [
      "도면과 견적 PDF를 파싱해 비정형 문서에서 항목을 추출했습니다.",
      "추출한 값으로 구매단가를 예측하는 흐름을 PoC로 검증했습니다.",
    ],
    forbidden: ["247건", "정확도", "오차율 %"],
  },
  {
    catalogNo: 7,
    slug: "traditional-market-voucher-payment",
    section: "career",
    title: "전통시장 전자상품권 결제 플랫폼 구축",
    category: "commerce",
    stage: "operation",
    stageNote: "구축·오픈·운영",
    role: "PM·솔루션 아키텍트",
    period: "2022.05 ~ 2023.03",
    summary:
      "전통시장에서 쓰는 전자상품권의 충전, 결제, 정산을 처리하는 대규모 결제 플랫폼입니다.",
    challenge:
      "짧은 일정 안에 카드사 연동과 대량 결제를 안정적으로 처리하는 플랫폼을 열어야 했습니다.",
    highlights: [
      "착수 4개월 만에 서비스를 열었습니다.",
      "연 1조원 이상의 거래를 처리했습니다.",
      "MSA와 Kubernetes 기반으로 금액 정합성, 부분 취소, 캐시백을 설계했습니다.",
      "앱과 웹 서비스를 함께 열고 운영까지 맡았습니다.",
    ],
    tech: ["Java", "Spring Boot", "Kubernetes", "MSA", "React Native"],
    forbidden: ["가입자 수", "가맹점 수"],
  },
  {
    catalogNo: 8,
    slug: "insurance-commission-reconciliation",
    section: "company",
    title: "보험대리점 수수료 정산 대사 시스템",
    category: "commerce",
    stage: "poc",
    stageNote: "제안·프로토타입 단계 (진행 중)",
    role: "기획·설계·개발",
    period: "2026.07 ~ 진행 중",
    summary:
      "보험대리점이 엑셀로 하던 수수료 정산 대사를 웹으로 옮긴 프로토타입입니다.",
    challenge:
      "보험사마다 다른 엑셀 양식을 사람이 맞춰 보며 수수료를 대사해서 시간이 오래 걸리고 차액을 놓치기 쉬웠습니다.",
    highlights: [
      "엑셀 대사 업무를 웹 화면과 정산 로직으로 옮겼습니다.",
      "프로토타입 검증에서 일치율 99%와 차액 0원을 달성했습니다.",
      "서버리스 구조로 운영 비용을 낮게 설계했습니다.",
    ],
    tech: ["Remix", "Cloudflare Workers", "D1", "Drizzle", "TypeScript"],
    forbidden: ["30여 개"],
  },
  {
    catalogNo: 9,
    slug: "local-delivery-order-platform",
    section: "company",
    title: "지역 배달 주문 플랫폼",
    category: "app",
    stage: "mockup",
    stageNote: "제안용 화면 시안",
    role: "기획·화면 설계",
    period: "2026.06",
    summary:
      "고객 앱, 점주 콘솔, 관리자 화면으로 이어지는 지역 배달 주문 흐름을 설계한 시안입니다.",
    challenge:
      "고객, 점주, 관리자가 같은 주문을 서로 다른 화면에서 다뤄야 해서 상태가 어긋나지 않는 흐름이 필요했습니다.",
    highlights: [
      "고객, 점주, 관리자 세 주체의 주문 흐름과 상태 전환을 설계했습니다.",
      "HTML 프로토타입으로 화면 흐름을 확인할 수 있게 했습니다.",
    ],
    tech: ["HTML", "JavaScript"],
    forbidden: ["POS 연동", "결제 연동", "운영 중"],
  },
  {
    catalogNo: 10,
    slug: "medical-center-generative-ai",
    section: "career",
    title: "의료원 생성형 AI 지식상담과 입원기록 자동화",
    category: "ai",
    stage: "proposal",
    stageNote: "제안 단계",
    role: "제안 PM",
    period: "2024.10 ~ 2024.11",
    summary:
      "대형 의료원의 지식상담과 입원기록 작성에 생성형 AI를 적용하는 사업을 제안했습니다.",
    challenge:
      "의료 현장에서는 AI 답변의 정확성과 근거를 확인할 수 있어야 도입을 검토할 수 있습니다.",
    highlights: [
      "정확성, 응답 시간, 근거 제시를 기준으로 품질 지표를 정의했습니다.",
      "검색 기반 생성(RAG) 아키텍처를 제안했습니다.",
      "의료 분야 요구사항을 분석하고 제안 전체를 PM으로 이끌었습니다.",
    ],
    forbidden: ["구축했", "수주"],
  },
  {
    catalogNo: 11,
    slug: "public-finance-bigdata-visualization",
    section: "career",
    title: "공공 재정정보 빅데이터 시각화와 AI 챗봇",
    category: "data",
    stage: "operation",
    stageNote: "구축",
    role: "개발 PL",
    period: "2021.03 ~ 2021.11",
    summary:
      "공공 재정 데이터를 수집, 저장, 분석하는 플랫폼과 재정 시각화 대시보드를 구축했습니다.",
    challenge:
      "여러 시스템에 나뉜 재정 데이터를 한곳에서 분석하고 시각화할 기반이 필요했습니다.",
    highlights: [
      "수집, 저장, 분석 플랫폼과 재정 시각화 대시보드를 구축했습니다.",
      "데이터 웨어하우스 모델링과 공공 SI 분석·설계 산출물을 맡았습니다.",
      "AI 챗봇은 사업 범위에 포함된 항목이며 직접 맡은 부분은 데이터 플랫폼과 시각화입니다.",
    ],
    tech: ["Java", "Node.js", "Python", "R", "BI"],
    forbidden: ["챗봇을 구축", "LLM", "RAG"],
  },
  {
    catalogNo: 12,
    slug: "open-banking-security-review",
    section: "career",
    title: "오픈뱅킹 계좌 연동 서비스와 금융 보안 승인 대응",
    category: "commerce",
    stage: "build",
    stageNote: "구축과 보안 심사 대응 (승인 전 단계까지 참여)",
    role: "PM",
    period: "2021.12 ~ 2022.04",
    summary:
      "오픈뱅킹 계좌 연동 서비스를 구축하고 금융 보안 심사에 대응하는 과정을 PM으로 이끌었습니다.",
    challenge:
      "오픈뱅킹 연동 규격을 맞추면서 금융 보안 심사에서 요구하는 점검 항목에 대응해야 했습니다.",
    highlights: [
      "오픈뱅킹 연동 규격에 맞춰 서비스 구축을 관리했습니다.",
      "보안 점검과 취약점 진단에서 나온 항목의 조치를 이끌었습니다.",
    ],
    tech: ["Java", "전자정부 프레임워크", "Kubernetes"],
    forbidden: ["승인 획득", "승인을 받", "오픈했"],
  },
  {
    catalogNo: 13,
    slug: "manufacturing-logistics-lakehouse",
    section: "career",
    title: "제조·물류 데이터 레이크하우스와 검색 기반 의사결정 지원",
    category: "data",
    stage: "design",
    stageNote: "설계 단계 (진행 중)",
    role: "아키텍처 리드",
    period: "2025.03 ~ 진행 중",
    summary:
      "제조와 물류 데이터를 한곳에 모으는 레이크하우스와 검색 기반 의사결정 지원 구조를 설계하고 있습니다.",
    challenge:
      "공장과 물류 데이터가 시스템마다 나뉘어 있어서 의사결정에 필요한 정보를 한 번에 찾기 어려웠습니다.",
    highlights: [
      "레이크하우스 아키텍처와 보안 기준, 거버넌스를 설계했습니다.",
      "검색 기반 생성과 그래프 검색을 활용한 의사결정 지원 구조를 설계했습니다.",
    ],
    tech: ["Azure", "Databricks", "Python", "RAG", "GraphRAG", "MLOps"],
    forbidden: ["구축했", "운영했"],
  },
  {
    catalogNo: 14,
    slug: "education-ai-adaptive-learning",
    section: "career",
    title: "교육 분야 AI 맞춤학습 플랫폼 설계",
    category: "consulting",
    stage: "proposal",
    stageNote: "제안 단계",
    role: "제안 PM (요구 분석·기능 설계·운영 체계 설계)",
    period: "2023.12 ~ 2024.11",
    summary:
      "생성형 AI로 학생별 맞춤학습을 제공하는 교육 플랫폼의 요구사항과 기능, 운영 체계를 설계해 제안했습니다.",
    challenge:
      "학생마다 다른 학습 수준에 맞추면서 접근성과 운영 요건을 함께 충족하는 설계가 필요했습니다.",
    highlights: [
      "교육 분야 요구사항을 분석하고 맞춤학습 기능을 설계했습니다.",
      "운영 체계와 접근성 요건을 설계했습니다.",
      "대형 제안을 PM으로 이끌었습니다.",
    ],
    forbidden: ["구축했", "수주", "운영 중"],
  },
  {
    catalogNo: 15,
    slug: "shopping-mall-ux-diagnosis",
    section: "company",
    title: "자사몰 UX 진단과 전환 개선 설계",
    category: "consulting",
    stage: "mockup",
    stageNote: "제안용 화면 시안",
    role: "기획·화면 설계",
    period: "2026.06",
    summary:
      "자사몰의 구매 흐름을 진단하고 전환을 높이기 위한 개선안과 측정 방법을 설계한 시안입니다.",
    challenge:
      "방문자가 구매 과정의 어느 단계에서 이탈하는지 알 수 없어 개선 우선순위를 정하기 어려웠습니다.",
    highlights: [
      "구매 퍼널을 단계별로 진단하는 틀을 만들었습니다.",
      "GA4 기준의 KPI 측정 방법을 설계했습니다.",
      "개선안을 화면 시안으로 제시했습니다.",
    ],
    tech: ["HTML", "JavaScript"],
    forbidden: ["리뉴얼했", "전환율이", "객단가", "GA4 연동을 구현"],
  },
  {
    catalogNo: 16,
    slug: "indoor-outdoor-location-ios",
    section: "company",
    title: "실내외 위치 감지 iOS 앱 고도화",
    category: "app",
    stage: "mockup",
    stageNote: "제안용 화면 시안",
    role: "기획·화면 설계",
    period: "2026.06",
    summary:
      "현장 안전을 위해 작업자의 실내외 위치와 출입을 감지하는 iOS 앱의 상태 전환 구조를 설계한 시안입니다.",
    challenge:
      "실외와 실내를 오가는 작업자의 위치를 끊기지 않게 감지하려면 여러 감지 방식을 상황에 맞게 바꿔 써야 합니다.",
    highlights: [
      "지오펜스, 비콘, 주요 위치 변경 감지를 조합한 상태 전환 구조를 설계했습니다.",
      "화면 흐름을 HTML 프로토타입으로 제시했습니다.",
    ],
    tech: ["HTML", "JavaScript"],
    forbidden: ["고도화했", "직접 구현", "실기기 검증"],
  },
  {
    catalogNo: 17,
    slug: "pt-member-workout-management",
    section: "company",
    title: "PT 회원·운동 관리 플랫폼",
    category: "app",
    stage: "operation",
    stageNote: "베타 운영 중",
    role: "PM·개발",
    period: "2026 상반기 ~",
    summary:
      "트레이너, 회원, 관리자가 예약과 이용권, 운동 기록을 함께 관리하는 웹 플랫폼입니다.",
    challenge:
      "PT 예약과 이용권, 운동 기록을 메신저와 수기로 관리해서 일정이 겹치거나 기록이 빠지는 일이 잦았습니다.",
    highlights: [
      "트레이너, 회원, 관리자 역할별 화면을 함께 만들었습니다.",
      "예약, 스케줄, 이용권 관리 기능을 구현했습니다.",
      "화면 20여 개와 서버 기능 20여 개 규모이며 반응형 웹과 PWA로 제공합니다.",
    ],
    tech: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "PWA"],
    forbidden: ["스토어 출시", "알림톡", "PG 결제", "노쇼 30%"],
  },
  {
    catalogNo: 18,
    slug: "trade-statistics-data-platform-proposal",
    section: "career",
    title: "무역통계 데이터 플랫폼 구축 제안",
    category: "data",
    stage: "proposal",
    stageNote: "제안 단계",
    role: "데이터 파트 총괄",
    summary:
      "무역통계 데이터 플랫폼 구축 사업의 제안에서 데이터 파트를 총괄했습니다.",
    challenge:
      "요구사항이 많은 대형 사업에서 데이터 영역의 요구를 빠짐없이 분석하고 대응 방안을 제시해야 했습니다.",
    highlights: [
      "요구사항 187건 가운데 담당한 37건에 누락 없이 모두 대응했습니다.",
      "96장 분량의 제안서 작성에 참여했습니다.",
    ],
    forbidden: ["사업을 수행", "수주"],
  },
  {
    catalogNo: 19,
    slug: "ai-ready-lakehouse-product",
    section: "career",
    title: "AI 활용을 전제로 한 데이터 레이크하우스 제품 개발",
    category: "data",
    stage: "poc",
    stageNote: "프로토타입·PoC 단계",
    role: "기획부터 구현까지",
    period: "2주",
    summary:
      "AI가 바로 쓸 수 있는 데이터를 목표로 한 레이크하우스 제품의 프로토타입을 2주 동안 만들었습니다.",
    challenge:
      "데이터 플랫폼을 만든 뒤에 AI를 붙이면 데이터 구조를 다시 손봐야 하는 일이 반복되었습니다.",
    highlights: [
      "AI 활용을 처음부터 전제로 한 데이터 구조를 프로토타입으로 구현했습니다.",
      "2주 동안 커밋 5백 건 규모로 개발하고 테스트 160여 개로 검증했습니다.",
    ],
    forbidden: ["510", "161개", "1,085"],
  },
  {
    catalogNo: 20,
    slug: "ontology-knowledge-management",
    section: "career",
    title: "온톨로지 기반 사내 지식관리 플랫폼 구축",
    category: "ai",
    stage: "build",
    stageNote: "구현·통합테스트 통과 (운영 전)",
    role: "기획·설계·구현",
    summary:
      "사내 문서를 온톨로지 구조로 모아 관리하고 접근 등급에 따라 열람을 통제하는 지식관리 도구입니다.",
    challenge:
      "프로젝트 문서가 저장소마다 흩어져 있고 누가 어떤 문서를 볼 수 있는지 관리하기 어려웠습니다.",
    highlights: [
      "문서 2백여 건을 수집하고 온톨로지 스키마를 설계했습니다.",
      "접근 등급과 감사 로그를 넣고 Git 기반 동기화를 자동화했습니다.",
      "통합테스트 20여 건을 모두 통과했습니다.",
    ],
    tech: ["Cloudflare Workers", "Hono", "D1", "Vite", "Python"],
    forbidden: ["208건", "구조화했", "검색 시간", "질의응답"],
  },
  {
    catalogNo: 21,
    slug: "industry-statistics-ontology-qa",
    section: "career",
    title: "산업통계 온톨로지 기반 정책 질의 응답 시스템",
    category: "consulting",
    stage: "design",
    stageNote: "요구사항 정의·설계 단계",
    role: "PM·컨설팅",
    summary:
      "산업통계를 온톨로지로 연결해 정책 질문에 답하는 시스템의 요구사항을 정의하고 설계했습니다.",
    challenge:
      "산업통계가 여러 출처에 나뉘어 있어서 정책 질문에 답하려면 통계 사이의 관계를 먼저 정리해야 했습니다.",
    highlights: [
      "요구사항 27건을 정의했습니다.",
      "설계 결과가 후속 사업 수주로 이어졌습니다.",
    ],
    forbidden: ["시스템을 구축했", "운영 중"],
  },
  {
    catalogNo: 22,
    slug: "retail-vip-platform-analysis",
    section: "career",
    title: "유통 우수고객 관리 플랫폼 재구축 분석과 설계",
    category: "consulting",
    stage: "proposal",
    stageNote: "제안 단계",
    role: "제안 준비 (자료 분석·요구사항 대응·공수 검토)",
    period: "2026.06 ~ 2026.07",
    summary:
      "유통사의 우수고객 관리 플랫폼 재구축 사업에서 요구사항을 분석하고 대응 방안을 정리했습니다.",
    challenge:
      "요구사항 100여 건 규모의 재구축 사업이라 범위를 정리하고 공수를 가늠하는 일이 먼저 필요했습니다.",
    highlights: [
      "요구사항을 분석하고 대응표를 작성했습니다.",
      "기능 점수를 기준으로 공수를 검토했습니다.",
      "기존 고객 관리 체계 위에 온톨로지와 AI를 확장하는 방안을 제안 설계에 담았습니다.",
    ],
    forbidden: ["재구축했", "수주", "102건", "3,669", "추천을 구현"],
  },
  {
    catalogNo: 23,
    slug: "dev-environment-onboarding-harness",
    section: "career",
    title: "개발 환경 표준화와 온보딩 하니스 구축",
    category: "consulting",
    stage: "enablement",
    stageNote: "가이드 작성과 소모임 1시즌 진행",
    role: "퍼실리테이터 (가이드 작성·환경 준비)",
    period: "2026.04 ~ 2026.05",
    summary:
      "AI 코딩 도구를 쓰는 개발 환경을 표준화하고 새 개발자가 빠르게 시작하도록 돕는 가이드와 템플릿을 만들었습니다.",
    challenge:
      "운영체제와 도구 설정이 사람마다 달라서 새로 합류한 개발자가 개발을 시작하기까지 시간이 오래 걸렸습니다.",
    highlights: [
      "셋업과 협업 규칙을 담은 가이드 11종을 작성했습니다.",
      "1시간 안에 온보딩을 마치는 것을 목표로 절차를 설계했습니다.",
      "Windows(WSL2)와 macOS가 섞인 환경을 함께 지원하는 모노레포 템플릿을 준비했습니다.",
    ],
    tech: ["Claude Code", "WSL2", "GitHub Actions", "Cloudflare", "pnpm", "Turborepo"],
    forbidden: ["표준으로 정착", "1시간 달성", "5명"],
  },
  {
    catalogNo: null,
    slug: "ontology-agent-platform-prototype",
    section: "career",
    title: "온톨로지 기반 AI 에이전트 플랫폼 프로토타입",
    category: "ai",
    stage: "poc",
    stageNote: "프로토타입 단계 (진행 중)",
    role: "개발",
    period: "2026.10 ~ 진행 중",
    summary:
      "사람과 AI 에이전트가 같은 업무 데이터 구조 위에서 일하고, 에이전트의 변경은 사람의 승인을 거치도록 통제하는 플랫폼의 프로토타입입니다.",
    challenge:
      "AI 에이전트가 실제 업무 데이터를 바꾸려면 권한과 승인, 변경 이력을 통제할 수단이 먼저 필요합니다.",
    highlights: [
      "객체, 관계, 액션으로 업무를 표현하는 온톨로지 구조를 구현하고 있습니다.",
      "에이전트가 변경을 제안하면 사람이 승인하고 그 이력을 추적하는 흐름을 만들고 있습니다.",
    ],
    forbidden: ["운영 중", "납품"],
  },
  {
    catalogNo: null,
    slug: "ai-ready-data-platform-architecture",
    section: "career",
    title: "AI 활용을 위한 데이터 플랫폼 표준 아키텍처 수립",
    category: "data",
    stage: "design",
    stageNote: "설계·구축 단계 (진행 중)",
    role: "설계·개발 (프로그래머 겸 PM)",
    period: "2026.07 ~ 진행 중",
    summary:
      "AI와 에이전트가 바로 쓸 수 있는 데이터를 만드는 데이터 플랫폼의 표준 아키텍처와 설계 문서를 정리하고 있습니다.",
    challenge:
      "데이터 플랫폼을 만든 뒤에 AI를 붙이는 방식으로는 과제마다 구조를 다시 정해야 해서 재사용이 어려웠습니다.",
    highlights: [
      "표준 아키텍처의 결정 사항을 한곳에서 관리하는 체계를 만들었습니다.",
      "에이전트 프레임워크와 코드 품질 측정 기준 같은 설계 문서를 작성했습니다.",
    ],
    forbidden: ["운영 중", "납품"],
  },
  {
    catalogNo: null,
    slug: "railway-data-platform-productization",
    section: "career",
    title: "철도 분야 데이터 플랫폼 프로토타입의 제품화 계획",
    category: "data",
    stage: "design",
    stageNote: "제품화 계획 단계",
    role: "분석·실행계획 수립",
    period: "2026.09",
    summary:
      "철도 분야를 대상으로 만든 데이터 플랫폼 프로토타입을 제품으로 전환하기 위한 분석과 실행계획을 세웠습니다.",
    challenge:
      "시연용 프로토타입을 실제 제품으로 바꾸려면 구성요소별로 무엇을 실제 시스템으로 전환할지 순서를 정해야 했습니다.",
    highlights: [
      "프로토타입의 자료를 분석해 제품화에 필요한 작업을 화면, 시스템, 데이터, 기준으로 나눠 정리했습니다.",
      "작업 분장과 일정을 담은 실행계획을 작성했습니다.",
    ],
    forbidden: ["구축했", "운영 중", "납품"],
  },
  {
    catalogNo: null,
    slug: "manufacturer-ax-consulting",
    section: "career",
    title: "제조사 AX 컨설팅: AI 과제 선별과 라인 구성 의사결정 지원 과제 정의",
    category: "consulting",
    stage: "proposal",
    stageNote: "제안·과제 정의 단계 (진행 중)",
    role: "컨설팅 (공동 수행)",
    period: "2026.08 ~ 진행 중",
    summary:
      "제조사에서 AI로 풀 과제를 선별하고, 생산 데이터로 라인 구성 의사결정을 돕는 과제를 정의하고 있습니다.",
    challenge:
      "AI를 적용할 후보 업무가 많아서 효과와 실행 가능성을 기준으로 먼저 할 과제를 골라야 했습니다.",
    highlights: [
      "AI 적용 후보 과제를 선별하는 기준을 세우고 과제를 정리했습니다.",
      "생산 데이터 기반의 라인 구성 의사결정 지원 과제를 정의했습니다.",
    ],
    forbidden: ["수주", "구축했", "ERP"],
  },
  {
    catalogNo: null,
    slug: "marine-drone-catch-prediction-ontology",
    section: "career",
    title: "해양 드론 탐지 결과 기반 어획 예측 온톨로지 프로토타입",
    category: "ai",
    stage: "poc",
    stageNote: "프로토타입 단계 (합성 데이터)",
    role: "기획·구현",
    period: "2026.09",
    summary:
      "해양 드론의 탐지 결과를 온톨로지로 연결해 어획을 예측하는 흐름을 합성 데이터로 구현한 프로토타입입니다.",
    challenge:
      "탐지 결과, 해역, 어종 정보가 따로 있어서 예측에 쓰려면 서로의 관계를 먼저 구조화해야 했습니다.",
    highlights: [
      "탐지 결과와 해역, 어종의 관계를 온톨로지로 설계했습니다.",
      "관계를 그래프 화면으로 탐색하는 프로토타입을 합성 데이터로 구현했습니다.",
    ],
    tech: ["React", "Hono", "Cytoscape", "Vite", "Cloudflare Workers", "D1"],
    forbidden: ["800건", "모델을 학습", "실제 데이터"],
  },
  {
    catalogNo: null,
    slug: "industry-association-decision-ai-poc",
    section: "career",
    title: "산업 진흥 기관 통계 시스템의 온톨로지 기반 의사결정 AI PoC",
    category: "ai",
    stage: "poc",
    stageNote: "PoC 단계",
    role: "프로그래머 겸 PM",
    period: "2026.05 ~",
    summary:
      "산업 통계 시스템 위에 온톨로지와 지식그래프를 얹어 여러 통계를 엮어야 답할 수 있는 정책 질문을 지원하는 PoC입니다.",
    challenge:
      "사용자가 단편적인 통계만 볼 수 있어서 여러 통계를 연결해야 하는 질문은 담당자에게 직접 물어야 했습니다.",
    highlights: [
      "기존 통계 시스템의 데이터 구조를 분석해 온톨로지 엔티티로 대응시켰습니다.",
      "의사결정 시나리오를 설계하고 PoC 웹사이트 개발을 기획했습니다.",
    ],
    forbidden: ["운영 중", "납품", "수주"],
  },
];

/** slug 로 사례 찾기 */
export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}

/** 구역별 사례 */
export function getCaseStudiesBySection(section: CaseSection): CaseStudy[] {
  return caseStudies.filter((c) => c.section === section);
}
