/**
 * Operations Management Service Data
 *
 * 시스템 운영 관리 서비스 데이터
 */

import type { Service } from "@/types/services";

export const operationsManagementService: Service = {
  id: "operations-management",
  category: "development",
  name: "시스템 운영 관리",
  slug: "operations",
  title: "24/7 시스템 운영 관리",
  subtitle: "안정적인 서비스 운영과 지속적인 개선 지원",
  description:
    "24/7 모니터링, 긴급 장애 대응, 보안 패치, 성능 최적화까지 포함한 완전한 시스템 운영 관리 서비스로 비즈니스 연속성을 보장합니다.",
  features: [
    "24/7 서버 상태 모니터링",
    "실시간 에러 추적 및 알림 (Sentry, DataDog)",
    "긴급 장애 대응 (30분~4시간 내)",
    "보안 패치 자동 적용",
    "성능 메트릭 수집 및 분석",
    "데이터베이스 최적화",
    "백업 및 복구 관리",
    "월간 운영 리포트",
    "성능 분석 및 개선 제안",
    "기술 상담 및 기능 개선 개발",
  ],
  techStack: {
    monitoring: ["DataDog", "Sentry", "Grafana", "Prometheus"],
    infrastructure: ["Docker", "Kubernetes", "AWS/GCP", "Terraform"],
    database: ["PostgreSQL", "MongoDB", "Redis"],
    cicd: ["GitHub Actions", "GitLab CI", "Jenkins"],
  },
  pricing: {
    type: "monthly",
    monthly: [
      {
        name: "Basic",
        price: 500000,
        currency: "KRW",
        features: {
          monitoring: "업타임 체크",
          response: "영업시간 내 (4시간)",
          support: "월 5시간 기술 지원",
          reporting: "월간 리포트",
          backup: "주 1회",
        },
      },
      {
        name: "Standard",
        price: 1000000,
        currency: "KRW",
        features: {
          monitoring: "24/7 모니터링",
          response: "긴급 대응 24시간",
          support: "월 10시간 기술 지원",
          reporting: "월간 + 성능 분석",
          backup: "일 1회",
          security: "보안 패치 자동 적용",
        },
        recommended: true,
      },
      {
        name: "Premium",
        price: 2000000,
        currency: "KRW",
        features: {
          monitoring: "24/7 전담 모니터링",
          response: "우선 대응 (30분 내)",
          support: "월 20시간 기술 지원",
          reporting: "주간 + 분기별 개선 프로젝트",
          backup: "일 2회 + 실시간 복제",
          security: "보안 패치 + 정기 취약점 스캔",
          engineer: "전담 엔지니어 배정",
        },
      },
    ],
    annualDiscount: 16.67, // 12개월 → 10개월 가격 (2개월 무료)
  },
  deliverables: [
    "24/7 서버 모니터링 대시보드 접근 권한",
    "월간 운영 리포트 (가동률, 장애 내역, 성능 지표)",
    "성능 분석 및 개선 제안 문서",
    "긴급 장애 대응 보고서",
    "보안 패치 적용 내역",
    "백업 및 복구 절차 가이드",
  ],
  process: [
    {
      step: 1,
      title: "시스템 진단",
      duration: "1주",
      description:
        "현재 인프라 분석, 취약점 파악, 모니터링 도구 설치, 백업 시스템 구축",
    },
    {
      step: 2,
      title: "모니터링 시작",
      duration: "지속",
      description:
        "24/7 서버 상태 모니터링, 에러 추적, 성능 메트릭 수집, 실시간 알림",
    },
    {
      step: 3,
      title: "정기 유지보수",
      duration: "주 1회",
      description:
        "보안 패치 적용, 의존성 업데이트, 데이터베이스 최적화, 로그 정리",
    },
    {
      step: 4,
      title: "장애 대응",
      duration: "즉시",
      description:
        "긴급 알림 수신, 장애 원인 분석, 긴급 수정, 복구 확인, 재발 방지 대책 수립",
    },
    {
      step: 5,
      title: "월간 리포팅",
      duration: "매월 말",
      description:
        "가동률 분석, 장애 내역 정리, 성능 트렌드 분석, 개선 제안 사항 제시",
    },
  ],
  faq: [
    {
      question: "SLA(Service Level Agreement)가 무엇인가요?",
      answer:
        "서비스 수준 협약으로, 가동률 보장 수준과 장애 대응 시간을 명시합니다. Basic 99.5% (월 3.6시간 다운타임), Standard 99.9% (월 43분), Premium 99.95% (월 22분)을 보장합니다.",
    },
    {
      question: "SLA 미달 시 어떻게 되나요?",
      answer:
        "SLA 미달 시 크레딧 보상을 제공합니다. 1시간 미만: 보상 없음, 1-4시간: 월 이용료 10% 크레딧, 4-24시간: 25% 크레딧, 24시간 이상: 50% 크레딧입니다.",
    },
    {
      question: "기능 개선 개발도 포함되나요?",
      answer:
        "Basic과 Standard는 기술 지원 시간 내에서 소규모 버그 수정만 가능합니다. Premium은 월 20시간 내에서 기능 개선 개발이 포함됩니다. 대규모 기능은 별도 개발 프로젝트로 진행됩니다.",
    },
    {
      question: "연간 계약 할인은 어떻게 적용되나요?",
      answer:
        "연간 계약 시 2개월 무료 혜택이 제공됩니다 (12개월 가격으로 14개월 사용). 예: Standard 연간 계약 시 ₩10,000,000 (월 ₩1,000,000 × 10개월)입니다.",
    },
  ],
  paymentMethod: {
    monthly: "매월 1일 선결제, 연간 계약 시 2개월 무료 (12개월 → 10개월 가격)",
  },
  refundPolicy: {
    description:
      "서비스 시작 전 전액 환불, 서비스 시작 후 7일 이내 전액 환불, 7일 경과 후 당월 환불 불가·익월부터 해지, 연간 계약 3개월 이내 80% 환불·6개월 이내 50% 환불·6개월 경과 환불 불가, SLA 위반 시 월 이용료 일부 크레딧 보상",
    link: "/refund-policy",
  },
  status: "available",
};
