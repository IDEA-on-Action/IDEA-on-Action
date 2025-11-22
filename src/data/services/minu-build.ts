import { Service } from "@/types/services";

export const minuBuildService: Service = {
  id: "minu-build",
  category: "minu",
  name: "Minu Build",
  slug: "build",
  title: "Minu Build",
  subtitle: "개발 & 프로젝트 진행 서비스",
  description:
    "프로젝트는 복잡하기 쉽지만, 진행 상황을 이해하는 일까지 복잡할 필요는 없습니다. Minu Build는 일정·이슈·진척을 부드럽게 요약해 PM/PL이 관리 대신 본질에 집중할 수 있게 만듭니다.",
  features: [
    "일정/이슈/리스크 요약",
    "Sprint/모듈 진척 자동 분석",
    "주간보고 자동 생성",
    "Git/Jira 경량 연동",
    "칸반 보드 및 간트 차트 지원",
    "실시간 프로젝트 진행률 대시보드",
    "팀 리소스 및 워크로드 관리",
    "고객과의 협업 포털",
  ],
  techStack: {
    frontend: ["React", "TypeScript", "Tailwind CSS"],
    backend: ["Node.js", "WebSocket", "Redis"],
    database: ["PostgreSQL", "TimescaleDB"],
    infrastructure: ["AWS", "CloudFlare", "Docker"],
  },
  pricing: {
    type: "monthly",
    monthly: [
      {
        name: "Basic",
        price: 49000,
        currency: "KRW",
        features: {
          activeProjects: "3개",
          teamMembers: "3명",
          storage: "5GB",
          kanban: true,
          gantt: false,
          clientPortal: false,
          reports: "기본",
          support: "이메일",
          api: false,
        },
        annualDiscount: 20,
      },
      {
        name: "Pro",
        price: 149000,
        currency: "KRW",
        features: {
          activeProjects: "15개",
          teamMembers: "15명",
          storage: "50GB",
          kanban: true,
          gantt: true,
          clientPortal: true,
          reports: "고급",
          support: "이메일 + 채팅",
          api: false,
        },
        annualDiscount: 20,
        recommended: true,
      },
      {
        name: "Enterprise",
        price: 399000,
        currency: "KRW",
        features: {
          activeProjects: "무제한",
          teamMembers: "무제한",
          storage: "500GB",
          kanban: true,
          gantt: "고급 + 의존성",
          clientPortal: "화이트라벨",
          reports: "커스텀",
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
      title: "프로젝트 생성",
      description: "새 프로젝트를 생성하고 기본 정보, 마일스톤, 팀원을 설정합니다.",
      duration: "10분",
    },
    {
      step: 2,
      title: "태스크 분해",
      description: "프로젝트를 세부 태스크로 분해하고 담당자와 기한을 배정합니다.",
      duration: "30분",
    },
    {
      step: 3,
      title: "진행 관리",
      description: "칸반 보드와 간트 차트로 프로젝트 진행 상황을 실시간 모니터링합니다.",
      duration: "지속적",
    },
    {
      step: 4,
      title: "고객 커뮤니케이션",
      description: "클라이언트 포털을 통해 진행 상황을 공유하고 피드백을 수집합니다.",
      duration: "주 1회",
    },
    {
      step: 5,
      title: "리포팅",
      description: "자동 생성 리포트로 프로젝트 성과를 분석하고 개선점을 도출합니다.",
      duration: "월 1회",
    },
  ],
  deliverables: [
    "프로젝트 대시보드",
    "칸반 보드 및 간트 차트",
    "팀 워크로드 분석",
    "고객 협업 포털",
    "자동화된 프로젝트 리포트",
    "시간 추적 및 청구서 연동",
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
      "데이터 마이그레이션 지원: 기존 도구에서 이전 시 1회 무료",
    ],
  },
  faq: [
    {
      question: "기존 프로젝트 관리 도구에서 데이터를 가져올 수 있나요?",
      answer:
        "Jira, Asana, Trello, Notion 등 주요 도구에서 프로젝트와 태스크를 가져올 수 있습니다. Enterprise 플랜은 맞춤 마이그레이션을 지원합니다.",
    },
    {
      question: "고객에게 진행 상황을 어떻게 공유하나요?",
      answer:
        "Pro 플랜 이상에서 클라이언트 포털을 통해 고객이 직접 프로젝트 진행 상황을 확인할 수 있습니다. 읽기 전용 또는 댓글 권한을 설정할 수 있습니다.",
    },
    {
      question: "시간 추적 기능이 있나요?",
      answer:
        "네, 태스크별 시간 추적이 가능하며, 이를 기반으로 청구서를 자동 생성할 수 있습니다.",
    },
    {
      question: "Minu Find, Frame과 연동되나요?",
      answer:
        "Minu 플랫폼의 모든 서비스는 통합 연동됩니다. Find에서 수주한 프로젝트를 Build에서 관리하고, Frame으로 제안서를 작성할 수 있습니다.",
    },
  ],
  status: "coming-soon",
  launchDate: "2026-01-15",
};
