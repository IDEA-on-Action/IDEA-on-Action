import { Service } from "@/types/services";

export const minuKeepService: Service = {
  id: "minu-keep",
  category: "minu",
  name: "Minu Keep",
  slug: "keep",
  title: "Minu Keep",
  subtitle: "운영/유지보수 서비스",
  description:
    "운영은 '묵직하게'가 아니라 '가볍고 지속 가능한 방식'이어야 합니다. Minu Keep은 버그, 업데이트, 리소스, 운영 기록을 단정하면서도 가벼운 방식으로 정리합니다.",
  features: [
    "버그/작업 자동 분류",
    "운영 보고서 생성",
    "배포/업데이트 관리",
    "운영 리소스 추적",
    "실시간 시스템 모니터링 대시보드",
    "장애 감지 및 자동 알림",
    "고객 지원 티켓 관리 시스템",
    "SLA 추적 및 보고서",
  ],
  techStack: {
    frontend: ["React", "TypeScript", "D3.js"],
    backend: ["Node.js", "Prometheus", "Grafana"],
    database: ["PostgreSQL", "InfluxDB", "Redis"],
    infrastructure: ["AWS", "Docker", "Kubernetes"],
  },
  pricing: {
    type: "monthly",
    monthly: [
      {
        name: "Basic",
        price: 59000,
        currency: "KRW",
        features: {
          monitoredServices: "5개",
          alertChannels: "이메일",
          ticketSystem: "기본",
          slaTracking: false,
          automatedMaintenance: false,
          retentionPeriod: "7일",
          support: "이메일",
          api: false,
        },
        annualDiscount: 20,
      },
      {
        name: "Pro",
        price: 179000,
        currency: "KRW",
        features: {
          monitoredServices: "20개",
          alertChannels: "전체 (이메일, Slack, SMS)",
          ticketSystem: "고급 + SLA",
          slaTracking: true,
          automatedMaintenance: "기본",
          retentionPeriod: "90일",
          support: "이메일 + 채팅",
          api: false,
        },
        annualDiscount: 20,
        recommended: true,
      },
      {
        name: "Enterprise",
        price: 499000,
        currency: "KRW",
        features: {
          monitoredServices: "무제한",
          alertChannels: "전체 + PagerDuty",
          ticketSystem: "화이트라벨",
          slaTracking: "고급 + 자동 보상",
          automatedMaintenance: "고급 + 예측",
          retentionPeriod: "365일",
          support: "24/7 전담 지원",
          api: true,
        },
        annualDiscount: 20,
      },
    ],
  },
  process: [
    {
      step: 1,
      title: "서비스 등록",
      description: "모니터링할 시스템과 서비스를 등록하고 연동 설정을 완료합니다.",
      duration: "1시간",
    },
    {
      step: 2,
      title: "알림 설정",
      description: "장애 감지 조건과 알림 채널(이메일, Slack, SMS)을 설정합니다.",
      duration: "30분",
    },
    {
      step: 3,
      title: "SLA 정의",
      description: "고객별 SLA 조건을 정의하고 자동 추적을 활성화합니다.",
      duration: "30분",
    },
    {
      step: 4,
      title: "운영 모니터링",
      description: "대시보드를 통해 시스템 상태를 실시간으로 모니터링합니다.",
      duration: "지속적",
    },
    {
      step: 5,
      title: "보고서 생성",
      description: "월간 운영 보고서를 자동 생성하고 고객에게 전달합니다.",
      duration: "월 1회",
    },
  ],
  deliverables: [
    "실시간 모니터링 대시보드",
    "장애 알림 시스템",
    "고객 지원 티켓 포털",
    "SLA 이행률 보고서",
    "비용 분석 리포트",
    "예측 유지보수 알림",
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
      "SLA 미달 시: 플랫폼 이용료의 10-30% 크레딧 지급",
    ],
  },
  faq: [
    {
      question: "기존 모니터링 도구와 연동할 수 있나요?",
      answer:
        "Prometheus, Grafana, Datadog, New Relic 등 주요 모니터링 도구와 연동이 가능합니다. Enterprise 플랜은 커스텀 연동을 지원합니다.",
    },
    {
      question: "고객이 직접 티켓을 등록할 수 있나요?",
      answer:
        "Pro 플랜 이상에서 고객 전용 포털을 제공하며, 고객이 직접 티켓을 등록하고 진행 상황을 확인할 수 있습니다.",
    },
    {
      question: "장애 발생 시 자동으로 대응하나요?",
      answer:
        "기본적인 자동 복구 스크립트를 설정할 수 있으며, Enterprise 플랜은 AI 기반 예측 유지보수와 자동 대응을 지원합니다.",
    },
    {
      question: "Minu Build 프로젝트에서 Keep으로 자동 연동되나요?",
      answer:
        "네, Build에서 완료된 프로젝트는 Keep으로 자동 이관하여 운영 관리를 시작할 수 있습니다. 모든 Minu 서비스는 통합 연동됩니다.",
    },
  ],
  status: "coming-soon",
  launchDate: "2026-01-15",
};
