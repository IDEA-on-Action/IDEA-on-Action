/**
 * Design System Service Data
 *
 * 디자인 시스템 구축 서비스 데이터
 */

import type { Service } from "@/types/services";

export const designSystemService: Service = {
  id: "design-system",
  category: "development",
  name: "디자인 시스템",
  slug: "design",
  title: "UI/UX 디자인 시스템 구축",
  subtitle: "일관성 있고 확장 가능한 디자인 시스템으로 브랜드 강화",
  description:
    "Figma 디자인 파일부터 React 컴포넌트 라이브러리, Storybook 문서까지 포함한 완전한 디자인 시스템을 구축하여 브랜드 아이덴티티를 강화하고 개발 효율성을 높입니다.",
  features: [
    "브랜드 컬러 팔레트 및 타이포그래피 시스템",
    "재사용 가능한 UI 컴포넌트 라이브러리",
    "반응형 그리드 및 레이아웃 시스템",
    "애니메이션 및 마이크로 인터랙션 가이드",
    "다크 모드 지원 (프리미엄)",
    "접근성 최적화 (WCAG 2.1 AA)",
    "Figma 디자인 시스템 파일",
    "React 컴포넌트 라이브러리",
    "Storybook 인터랙티브 문서",
    "디자인 토큰 (CSS Variables/Tailwind Config)",
  ],
  techStack: {
    design: ["Figma", "Adobe XD", "Sketch"],
    frontend: ["React 18", "TypeScript", "Tailwind CSS", "Storybook"],
    tokens: ["CSS Variables", "Tailwind Config", "Style Dictionary"],
  },
  pricing: {
    type: "package",
    packages: [
      {
        name: "기본 패키지",
        price: 300000,
        currency: "KRW",
        duration: "2주",
        features: [
          "컬러 시스템 (5-8색)",
          "타이포그래피 (3-4 스타일)",
          "기본 컴포넌트 10종",
          "Figma 디자인 파일",
        ],
      },
      {
        name: "스탠다드 패키지",
        price: 800000,
        currency: "KRW",
        duration: "3주",
        features: [
          "기본 패키지 전체 포함",
          "기본 + 복합 컴포넌트 30종",
          "React 컴포넌트 구현",
          "Storybook 문서",
          "반응형 디자인",
        ],
        recommended: true,
      },
      {
        name: "프리미엄 패키지",
        price: 2000000,
        currency: "KRW",
        duration: "4-6주",
        features: [
          "스탠다드 패키지 전체 포함",
          "전체 컴포넌트 50종 이상",
          "애니메이션 시스템",
          "다크 모드 지원",
          "접근성 최적화",
          "3개월 유지보수",
        ],
      },
    ],
  },
  deliverables: [
    "Figma 디자인 시스템 파일",
    "React 컴포넌트 라이브러리 (TypeScript)",
    "Storybook 인터랙티브 문서",
    "디자인 토큰 (CSS Variables/Tailwind Config)",
    "디자인 가이드라인 문서",
    "코드 스니펫 라이브러리",
  ],
  process: [
    {
      step: 1,
      title: "브랜드 분석",
      duration: "2-3일",
      description:
        "브랜드 아이덴티티 분석, 경쟁사 리서치, 타겟 유저 정의, 디자인 방향성 수립",
    },
    {
      step: 2,
      title: "디자인 토큰 정의",
      duration: "3-5일",
      description:
        "컬러 팔레트, 타이포그래피, 간격 시스템, 그림자 및 효과 정의",
    },
    {
      step: 3,
      title: "컴포넌트 디자인",
      duration: "1-2주",
      description:
        "Figma에서 기본/복합 컴포넌트 디자인, 상태별 UI, 인터랙션 정의",
    },
    {
      step: 4,
      title: "컴포넌트 구현",
      duration: "1-3주",
      description:
        "React 컴포넌트 개발, TypeScript 타입 정의, Storybook 문서 작성",
    },
    {
      step: 5,
      title: "품질 검증",
      duration: "3-5일",
      description:
        "접근성 테스트, 반응형 테스트, 브라우저 호환성 테스트, 성능 최적화",
    },
    {
      step: 6,
      title: "인수인계",
      duration: "1-2일",
      description:
        "디자인 시스템 사용 가이드 교육, Q&A 세션, 유지보수 계획 수립",
    },
  ],
  faq: [
    {
      question: "기존 브랜드 가이드라인이 있어도 디자인 시스템이 필요한가요?",
      answer:
        "네, 브랜드 가이드라인은 시각적 요소를 정의하지만, 디자인 시스템은 실제 코드로 구현 가능한 컴포넌트와 패턴을 제공합니다. 브랜드 가이드를 기반으로 개발팀이 즉시 사용할 수 있는 시스템을 만듭니다.",
    },
    {
      question: "Figma만 제공받고 코드 구현은 자체적으로 해도 되나요?",
      answer:
        "네, 기본 패키지에서는 Figma 파일만 제공합니다. 스탠다드 이상 패키지에서 React 컴포넌트 구현이 포함됩니다.",
    },
    {
      question: "다른 프레임워크(Vue, Svelte)도 지원하나요?",
      answer:
        "기본적으로 React를 지원하지만, 요청 시 Vue 또는 Svelte로 컴포넌트를 구현할 수 있습니다. 추가 비용이 발생할 수 있습니다.",
    },
    {
      question: "유지보수는 어떻게 진행되나요?",
      answer:
        "프리미엄 패키지는 3개월 무료 유지보수가 포함됩니다. 이후에는 별도 유지보수 계약 또는 시간 기반 지원을 이용하실 수 있습니다.",
    },
  ],
  paymentMethod: {
    package: "착수금 50%, 100% 완료 후 잔금 50%",
  },
  refundPolicy: {
    description:
      "계약 체결 전 100% 환불, 착수 전 착수금 100% 환불, 기획 단계 (0-25%) 착수금 제외 금액의 90% 환불, 개발 단계 (25-75%) 진행률에 따라 차등 환불, 완료 단계 (75-100%) 환불 불가",
    link: "/refund-policy",
  },
  status: "available",
};
