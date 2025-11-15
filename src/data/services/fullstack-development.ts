/**
 * Fullstack Development Service Data
 *
 * 풀스택 개발 서비스 데이터
 */

import type { Service } from "@/types/services";

export const fullstackDevelopmentService: Service = {
  id: "fullstack-development",
  category: "development",
  name: "풀스택 개발",
  slug: "fullstack",
  title: "엔터프라이즈급 풀스택 개발",
  subtitle: "프론트엔드부터 백엔드, DevOps까지 완전한 웹 애플리케이션 구축",
  description:
    "React/Vue/Next.js 기반 프론트엔드, RESTful API/GraphQL 백엔드, CI/CD 파이프라인까지 포함한 엔터프라이즈급 웹 애플리케이션을 처음부터 끝까지 구축합니다.",
  features: [
    "최신 프론트엔드 프레임워크 (React/Vue/Next.js)",
    "확장 가능한 백엔드 아키텍처 (Node.js/Python/Go)",
    "RESTful API 또는 GraphQL 설계 및 구현",
    "데이터베이스 설계 및 최적화 (PostgreSQL/MongoDB)",
    "인증/인가 시스템 (OAuth, JWT)",
    "CI/CD 파이프라인 구축 (GitHub Actions/GitLab CI)",
    "Docker 컨테이너화 및 클라우드 배포",
    "모니터링 및 로깅 시스템 (Sentry, DataDog)",
    "성능 최적화 및 보안 강화",
    "테스트 자동화 (유닛/통합/E2E)",
  ],
  techStack: {
    frontend: [
      "React 18",
      "Vue 3",
      "Next.js 15",
      "TypeScript",
      "Tailwind CSS",
      "Redux Toolkit",
      "React Query",
    ],
    backend: [
      "Node.js",
      "Express/Fastify",
      "Python Django/FastAPI",
      "Go Gin",
      "GraphQL",
      "Prisma ORM",
    ],
    database: ["PostgreSQL", "MongoDB", "Redis", "Supabase"],
    devops: [
      "Docker",
      "GitHub Actions",
      "Vercel/Netlify",
      "AWS/GCP",
      "Terraform",
    ],
    testing: ["Vitest", "Playwright", "Jest", "Cypress"],
  },
  pricing: {
    type: "hourly",
    hourly: {
      seniorRate: 80000,
      juniorRate: 50000,
      currency: "KRW",
      estimatedHours: "프로젝트별 상이",
    },
    monthly: [
      {
        name: "1인 팀",
        price: 3000000,
        currency: "KRW",
        features: {
          engineers: "시니어 개발자 1명",
          hours: "주 40시간",
          sprint: "2주 스프린트",
          meeting: "주간 미팅",
          deployment: "월 2회 배포",
        },
      },
      {
        name: "2인 팀",
        price: 5500000,
        currency: "KRW",
        features: {
          engineers: "시니어 1명 + 주니어 1명",
          hours: "주 80시간",
          sprint: "2주 스프린트",
          meeting: "주 2회 미팅",
          deployment: "월 4회 배포",
        },
        recommended: true,
      },
      {
        name: "3인 팀",
        price: 8000000,
        currency: "KRW",
        features: {
          engineers: "시니어 2명 + 주니어 1명",
          hours: "주 120시간",
          sprint: "1주 스프린트",
          meeting: "주 3회 미팅",
          deployment: "주 2회 배포",
        },
      },
    ],
    annualDiscount: 10,
  },
  deliverables: [
    "전체 소스 코드 (프론트엔드 + 백엔드)",
    "데이터베이스 스키마 및 마이그레이션 스크립트",
    "API 문서 (Swagger/OpenAPI)",
    "아키텍처 문서",
    "배포 가이드",
    "운영 매뉴얼",
    "테스트 코드 (커버리지 80% 이상)",
  ],
  process: [
    {
      step: 1,
      title: "Discovery Phase",
      duration: "1-2주",
      description:
        "요구사항 상세 분석, 기술 스택 및 아키텍처 설계, 프로젝트 일정 수립, 상세 견적 제공",
    },
    {
      step: 2,
      title: "Development Phase",
      duration: "프로젝트별 상이",
      description:
        "Sprint 기반 애자일 개발 (2주 단위), 주간 진행 보고 미팅, 코드 리뷰 및 품질 관리, 정기 데모 및 피드백 반영",
    },
    {
      step: 3,
      title: "Testing & Deployment",
      duration: "1-2주",
      description:
        "QA 테스트, 성능 최적화, 보안 점검, 프로덕션 배포",
    },
    {
      step: 4,
      title: "Post-Launch Support",
      duration: "1개월",
      description:
        "모니터링 및 장애 대응, 긴급 버그 수정, 운영 가이드 제공",
    },
  ],
  faq: [
    {
      question: "프로젝트 최소 계약 금액이 있나요?",
      answer: "프로젝트 단위 견적의 경우 최소 ₩10,000,000부터 시작합니다. 프로젝트 복잡도, 기간, 필요 인력에 따라 조정됩니다.",
    },
    {
      question: "월 단위 계약과 시간 기반 계약의 차이는 무엇인가요?",
      answer:
        "월 단위 계약은 정해진 인력이 풀타임으로 투입되며, 시간 기반 계약은 필요한 시간만큼만 작업합니다. 장기 프로젝트는 월 단위가 비용 효율적입니다.",
    },
    {
      question: "기존 프로젝트 리팩토링도 가능한가요?",
      answer:
        "네, 가능합니다. 기존 코드베이스 분석 후 리팩토링 계획을 수립하고 단계별로 진행합니다.",
    },
    {
      question: "품질은 어떻게 보증하나요?",
      answer:
        "코드 리뷰 100%, 유닛 테스트 커버리지 80% 이상, E2E 테스트 주요 플로우, 성능 테스트 리포트, 보안 취약점 스캔 리포트를 제공합니다.",
    },
  ],
  paymentMethod: {
    hourly: "월말 결산 후 익월 초 청구 또는 선결제 후 정산",
    monthly: "매월 1일 선결제, 연간 계약 시 10% 할인",
    project: "계약금 20%, 중간 진행 40% (마일스톤별 분할 가능), 잔금 40%",
  },
  refundPolicy: {
    description:
      "계약 체결 전 100% 환불, 착수 전 착수금 100% 환불, 기획 단계 (0-25%) 착수금 제외 금액의 90% 환불, 개발 단계 (25-75%) 진행률에 따라 차등 환불, 완료 단계 (75-100%) 환불 불가 (단, 계약 내용 미이행 시 제외)",
    link: "/refund-policy",
  },
  status: "available",
};
