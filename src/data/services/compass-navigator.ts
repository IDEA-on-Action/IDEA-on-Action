import { Service } from "@/types/services";

export const compassNavigatorService: Service = {
  id: "compass-navigator",
  category: "compass",
  name: "COMPASS Navigator",
  slug: "navigator",
  title: "COMPASS Navigator",
  subtitle: "사업 기회 탐색 플랫폼",
  description:
    "프리랜서와 에이전시를 위한 지능형 프로젝트 수주 기회 탐색 플랫폼입니다. 여러 플랫폼에 흩어진 프로젝트 정보를 한 곳에서 확인하고, AI 기반 분석을 통해 가장 적합한 기회를 찾으세요.",
  features: [
    "위시켓, 크몽, 원티드긱스, 나라장터 등 주요 플랫폼 통합 수집",
    "AI 기반 프로젝트 난이도 평가 및 경쟁률 예측",
    "JavaScript 기반 맞춤형 필터 및 가중치 설정",
    "Slack, 이메일, SMS 실시간 알림",
  ],
  pricing: {
    type: "monthly",
    monthly: [
      {
        name: "Basic",
        price: 29000,
        currency: "KRW",
        features: {
          platforms: "4개",
          monthlyAnalysis: "50건",
          aiAnalysis: false,
          customFilter: "기본",
          notifications: "이메일",
          history: "1개월",
          team: false,
          support: "이메일",
          api: false,
        },
        annualDiscount: 20,
      },
      {
        name: "Pro",
        price: 99000,
        currency: "KRW",
        features: {
          platforms: "6개+",
          monthlyAnalysis: "300건",
          aiAnalysis: true,
          customFilter: "JavaScript",
          notifications: "전체 채널",
          history: "6개월",
          team: false,
          support: "이메일 + 채팅",
          api: false,
        },
        annualDiscount: 20,
        recommended: true,
      },
      {
        name: "Enterprise",
        price: 299000,
        currency: "KRW",
        features: {
          platforms: "전체 + 커스텀",
          monthlyAnalysis: "무제한",
          aiAnalysis: "✓ 고급",
          customFilter: "JavaScript + API",
          notifications: "전체 + 우선 알림",
          history: "무제한",
          team: "10명까지",
          support: "전담 지원 (월 2시간)",
          api: true,
        },
        annualDiscount: 20,
      },
    ],
  },
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
      "SLA 미달 시: 당월 이용료의 10-50% 크레딧 (미달 시간에 따라)",
    ],
  },
  faq: [
    {
      question: "무료 체험 기간이 있나요?",
      answer: "신규 가입자는 30일 무료 체험이 가능합니다.",
    },
    {
      question: "플랜 변경은 언제든지 가능한가요?",
      answer:
        "언제든지 플랜 업그레이드 또는 다운그레이드가 가능합니다. 변경 사항은 다음 결제일부터 적용됩니다.",
    },
    {
      question: "AI 분석은 얼마나 정확한가요?",
      answer:
        "프로젝트 난이도와 경쟁률 예측은 과거 데이터를 기반으로 약 85% 정확도를 보입니다.",
    },
    {
      question: "API 연동은 어떻게 하나요?",
      answer:
        "Enterprise 플랜 가입 후 기술 문서를 통해 API 키를 발급받으실 수 있습니다.",
    },
  ],
  status: "available",
};
