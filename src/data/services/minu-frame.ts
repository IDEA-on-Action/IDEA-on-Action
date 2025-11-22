import { Service } from "@/types/services";

export const minuFrameService: Service = {
  id: "minu-frame",
  category: "minu",
  name: "Minu Frame",
  slug: "frame",
  title: "Minu Frame",
  subtitle: "문제정의 & RFP 설계 서비스",
  description:
    "올바른 문제 정의는 좋은 프로젝트의 절반입니다. Minu Frame은 생각을 구조화하고, 요구사항을 정리해 기획 초기 단계의 혼탁함을 단숨에 정리합니다.",
  features: [
    "문제 정의 Wizard",
    "요구사항 후보 자동 생성",
    "기능/비기능 자동 구분",
    "RFP 1.0 자동 생성",
    "과거 성공 제안서 분석 및 학습",
    "다양한 산업별/규모별 템플릿 제공",
    "팀 협업 및 버전 관리",
    "PDF/Word/HWP 다양한 포맷 내보내기",
  ],
  techStack: {
    frontend: ["React", "TypeScript", "Tailwind CSS"],
    backend: ["Node.js", "OpenAI GPT-4", "Langchain"],
    database: ["PostgreSQL", "Vector DB"],
    infrastructure: ["AWS", "Vercel", "S3"],
  },
  pricing: {
    type: "monthly",
    monthly: [
      {
        name: "Basic",
        price: 39000,
        currency: "KRW",
        features: {
          monthlyProposals: "5건",
          aiGeneration: "기본",
          templates: "10개",
          history: "3개월",
          teamMembers: false,
          brandCustomization: false,
          support: "이메일",
          api: false,
        },
        annualDiscount: 20,
      },
      {
        name: "Pro",
        price: 129000,
        currency: "KRW",
        features: {
          monthlyProposals: "30건",
          aiGeneration: "고급",
          templates: "50개+",
          history: "12개월",
          teamMembers: "5명",
          brandCustomization: true,
          support: "이메일 + 채팅",
          api: false,
        },
        annualDiscount: 20,
        recommended: true,
      },
      {
        name: "Enterprise",
        price: 349000,
        currency: "KRW",
        features: {
          monthlyProposals: "무제한",
          aiGeneration: "전용 모델",
          templates: "무제한 + 커스텀",
          history: "무제한",
          teamMembers: "무제한",
          brandCustomization: "완전 커스텀",
          support: "전담 매니저",
          api: true,
        },
        annualDiscount: 20,
      },
    ],
  },
  process: [
    {
      step: 1,
      title: "프로젝트 정보 입력",
      description: "프로젝트 개요, 요구사항, 예산 범위 등 기본 정보를 입력합니다.",
      duration: "5분",
    },
    {
      step: 2,
      title: "AI 제안서 초안 생성",
      description: "입력된 정보와 과거 성공 사례를 기반으로 AI가 제안서 초안을 생성합니다.",
      duration: "2분",
    },
    {
      step: 3,
      title: "템플릿 적용 및 편집",
      description: "산업별 템플릿을 적용하고 브랜드에 맞게 내용을 수정합니다.",
      duration: "15분",
    },
    {
      step: 4,
      title: "팀 리뷰 및 승인",
      description: "팀원들과 협업하여 제안서를 검토하고 최종 승인을 진행합니다.",
      duration: "30분",
    },
    {
      step: 5,
      title: "내보내기 및 제출",
      description: "PDF/Word/HWP 형식으로 내보내고 고객에게 제출합니다.",
      duration: "1분",
    },
  ],
  deliverables: [
    "AI 기반 맞춤형 제안서",
    "산업별 최적화 템플릿",
    "제안서 성공률 분석 리포트",
    "경쟁 분석 인사이트",
    "브랜드 커스터마이징 옵션",
    "다양한 포맷 내보내기",
  ],
  paymentMethod: {
    type: "monthly",
    monthly: {
      billingDay: 1,
      autoRenewal: true,
    },
  },
  refundPolicy: {
    beforeStart: "구독 시작 후 7일 이내: 100% 환불",
    inProgress: "7일 이후: 당월 환불 불가, 익월부터 해지",
    afterCompletion: "연간 구독: 사용하지 않은 개월 수 비례 환불",
    specialCases: [
      "AI 생성 품질 이슈 시: 해당 제안서 크레딧 복원",
    ],
  },
  faq: [
    {
      question: "AI가 생성한 제안서의 품질은 어떤가요?",
      answer:
        "GPT-4 기반 모델을 사용하며, 과거 성공 제안서 데이터로 파인튜닝되어 있습니다. 평균 80% 이상의 초안 완성도를 보입니다.",
    },
    {
      question: "기존 제안서를 학습시킬 수 있나요?",
      answer:
        "Pro 플랜 이상에서 기존 제안서를 업로드하면 AI가 학습하여 회사 스타일에 맞는 제안서를 생성합니다.",
    },
    {
      question: "한글(HWP) 형식도 지원하나요?",
      answer:
        "네, PDF, Word(DOCX), 한글(HWP) 형식으로 내보내기가 가능합니다.",
    },
    {
      question: "Minu Find와 연동되나요?",
      answer:
        "Find에서 발굴한 프로젝트 정보를 Frame으로 자동 연동하여 제안서 작성을 시작할 수 있습니다.",
    },
  ],
  status: "coming-soon",
  launchDate: "2026-01-15",
};
