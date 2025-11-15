import { Service } from "@/types/services";

export const mvpDevelopmentService: Service = {
  id: "mvp-development",
  category: "development",
  name: "MVP 개발",
  slug: "mvp",
  title: "MVP 개발 서비스",
  subtitle: "아이디어 실현 패키지",
  description:
    "비즈니스 아이디어를 빠르게 검증할 수 있는 최소 기능 제품(MVP)을 개발합니다. 핵심 기능에 집중하여 4-8주 내에 시장 테스트 가능한 제품을 제공합니다.",
  features: [
    "비즈니스 요구사항 분석 및 문서화",
    "React/TypeScript 기반 프론트엔드 개발",
    "Supabase/Node.js 백엔드 API 구축",
    "프로덕션 배포 및 기본 사용자 가이드",
  ],
  techStack: {
    frontend: ["React", "TypeScript", "Vite", "TailwindCSS"],
    backend: ["Supabase", "Node.js + Express"],
    database: ["PostgreSQL (Supabase)"],
    deployment: ["Vercel", "AWS", "Google Cloud"],
  },
  pricing: {
    type: "package",
    packages: [
      {
        name: "기본 패키지",
        price: 5000000,
        currency: "KRW",
        features: [
          "핵심 기능 3-5개",
          "반응형 웹 (데스크톱 + 모바일)",
          "기본 사용자 인증",
          "1개월 무상 기술 지원",
        ],
        duration: "4-6주",
      },
      {
        name: "스탠다드 패키지",
        price: 8000000,
        currency: "KRW",
        features: [
          "핵심 기능 5-8개",
          "고급 UI/UX 디자인",
          "소셜 로그인 통합",
          "결제 시스템 연동 (PG사 1개)",
          "2개월 무상 기술 지원",
        ],
        duration: "6-8주",
        recommended: true,
      },
      {
        name: "프리미엄 패키지",
        price: 12000000,
        currency: "KRW",
        features: [
          "핵심 기능 8-12개",
          "맞춤형 디자인 시스템",
          "고급 인증/권한 관리",
          "다중 결제 수단 지원",
          "관리자 대시보드",
          "3개월 무상 기술 지원",
        ],
        duration: "8-10주",
      },
    ],
  },
  deliverables: [
    "소스 코드 (GitHub 리포지토리)",
    "배포된 애플리케이션",
    "기술 문서 (API 명세서, 아키텍처 문서)",
    "사용자 가이드",
    "관리자 매뉴얼",
  ],
  process: [
    {
      step: 1,
      title: "상담 신청",
      description: "무료 상담을 통해 프로젝트 개요를 파악합니다.",
      duration: "즉시",
    },
    {
      step: 2,
      title: "요구사항 분석 미팅",
      description: "온라인 또는 오프라인으로 상세 요구사항을 분석합니다.",
      duration: "1-2일",
    },
    {
      step: 3,
      title: "견적서 및 제안서 제공",
      description: "프로젝트 범위와 일정을 포함한 상세 견적서를 제공합니다.",
      duration: "2-3일",
    },
    {
      step: 4,
      title: "계약 체결 및 착수금 결제",
      description: "계약서 서명 및 착수금(30%) 결제 후 프로젝트를 시작합니다.",
      duration: "1-2일",
    },
    {
      step: 5,
      title: "프로젝트 진행",
      description: "정기 진행 보고와 함께 개발을 진행합니다.",
      duration: "4-10주",
    },
    {
      step: 6,
      title: "최종 납품 및 검수",
      description: "완성된 제품을 납품하고 검수를 진행합니다.",
      duration: "1주",
    },
    {
      step: 7,
      title: "운영 지원",
      description: "무상 지원 기간 동안 기술 지원을 제공합니다.",
      duration: "1-3개월",
    },
  ],
  paymentMethod: {
    type: "split",
    split: {
      deposit: 30,
      interim: 40,
      final: 30,
    },
  },
  refundPolicy: {
    beforeStart: "착수 전: 100% 환불",
    inProgress: "기획 단계 완료 전: 착수금 제외 환불, 개발 단계 진행 중: 진행률에 따라 협의",
    afterCompletion: "개발 완료 후: 환불 불가 (단, 계약 내용 미이행 시 제외)",
    specialCases: [
      "회사가 계약서상의 의무를 이행하지 않은 경우: 기지불 금액 전액 + 손해배상 협의",
      "납품 지연이 30일 이상 발생한 경우 (천재지변 등 불가항력 제외): 협의",
    ],
  },
  faq: [
    {
      question: "개발 기간을 단축할 수 있나요?",
      answer: "기능 범위 조정을 통해 가능합니다. 상담 시 논의해주세요.",
    },
    {
      question: "추가 기능 개발이 필요하면 어떻게 하나요?",
      answer: "별도 견적을 통해 추가 개발이 가능합니다.",
    },
    {
      question: "소스 코드 소유권은 누구에게 있나요?",
      answer:
        "최종 결제 완료 후 클라이언트에게 모든 권한이 이전됩니다.",
    },
    {
      question: "유지보수는 어떻게 하나요?",
      answer:
        "무상 지원 기간 종료 후 별도 운영 관리 서비스를 이용하실 수 있습니다.",
    },
  ],
  status: "available",
};
