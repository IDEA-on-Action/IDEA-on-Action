-- ============================================
-- Services Content Data Migration
-- 일시: 2025-11-18
-- 목적: 토스페이먼츠 심사용 4개 서비스 상세 콘텐츠 추가
-- TASK-005: 서비스 데이터 마이그레이션
-- ============================================

-- ============================================
-- 1. MVP 개발 서비스 (mvp-development)
-- ============================================

UPDATE public.services
SET
  pricing_data = '[
    {
      "name": "스탠다드",
      "price": 8000000,
      "duration": "6-8주",
      "features": [
        "핵심 기능 5-8개 개발",
        "반응형 웹 디자인",
        "기본 UI/UX 설계",
        "소셜 로그인 (1개)",
        "기본 관리자 페이지",
        "2개월 무상 기술 지원"
      ],
      "ideal_for": "빠른 시장 검증이 필요한 스타트업"
    },
    {
      "name": "프로",
      "price": 12000000,
      "duration": "8-10주",
      "features": [
        "핵심 기능 8-12개 개발",
        "고급 UI/UX 디자인",
        "소셜 로그인 (3개)",
        "결제 시스템 연동 (1개 PG사)",
        "고급 관리자 대시보드",
        "실시간 알림 기능",
        "3개월 무상 기술 지원"
      ],
      "ideal_for": "완성도 높은 MVP가 필요한 기업",
      "popular": true
    },
    {
      "name": "엔터프라이즈",
      "price": 18000000,
      "duration": "10-12주",
      "features": [
        "핵심 기능 12-15개 개발",
        "프리미엄 UI/UX 디자인",
        "소셜 로그인 (5개)",
        "복수 결제 시스템 연동",
        "엔터프라이즈급 관리자 시스템",
        "실시간 알림 + 이메일 자동화",
        "Analytics & 리포팅 대시보드",
        "6개월 무상 기술 지원"
      ],
      "ideal_for": "대규모 사용자를 목표로 하는 프로젝트"
    }
  ]'::jsonb,
  deliverables = '[
    {
      "category": "개발 산출물",
      "items": [
        "완전한 소스 코드 (GitHub 저장소)",
        "프로덕션 배포 환경",
        "데이터베이스 스키마 및 마이그레이션",
        "API 문서 (Swagger/OpenAPI)"
      ]
    },
    {
      "category": "디자인 산출물",
      "items": [
        "Figma 디자인 파일",
        "반응형 UI 컴포넌트",
        "브랜드 컬러 & 타이포그래피 가이드"
      ]
    },
    {
      "category": "문서",
      "items": [
        "기술 문서 (README, 설치 가이드)",
        "사용자 매뉴얼",
        "관리자 매뉴얼"
      ]
    },
    {
      "category": "운영",
      "items": [
        "CI/CD 파이프라인 설정",
        "모니터링 & 로깅 설정",
        "백업 & 복구 절차 문서"
      ]
    }
  ]'::jsonb,
  process_steps = '[
    {
      "step": 1,
      "title": "기획 & 설계",
      "duration": "1주",
      "activities": [
        "킥오프 미팅 및 요구사항 상세화",
        "사용자 여정 맵 작성",
        "기능 우선순위 결정",
        "기술 스택 확정",
        "와이어프레임 & 프로토타입 제작"
      ]
    },
    {
      "step": 2,
      "title": "디자인",
      "duration": "1-2주",
      "activities": [
        "UI 디자인 시스템 구축",
        "주요 화면 디자인 (5-10개)",
        "디자인 리뷰 및 피드백 반영",
        "반응형 디자인 확정"
      ]
    },
    {
      "step": 3,
      "title": "개발",
      "duration": "3-5주",
      "activities": [
        "프론트엔드 개발 (React/Next.js)",
        "백엔드 API 개발",
        "데이터베이스 설계 및 구축",
        "인증 & 권한 시스템 구현",
        "결제 시스템 연동",
        "주 2회 진행 상황 공유"
      ]
    },
    {
      "step": 4,
      "title": "테스트 & QA",
      "duration": "1주",
      "activities": [
        "기능 테스트",
        "크로스 브라우저 테스트",
        "모바일 반응형 테스트",
        "성능 최적화",
        "보안 취약점 검토"
      ]
    },
    {
      "step": 5,
      "title": "배포 & 인수인계",
      "duration": "1주",
      "activities": [
        "프로덕션 환경 배포",
        "도메인 & SSL 설정",
        "모니터링 도구 설정",
        "관리자 교육",
        "소스 코드 & 문서 인계"
      ]
    }
  ]'::jsonb,
  faq = '[
    {
      "question": "MVP 개발 기간은 얼마나 걸리나요?",
      "answer": "패키지에 따라 6-12주가 소요됩니다. 스탠다드 패키지는 6-8주, 프로 패키지는 8-10주, 엔터프라이즈 패키지는 10-12주입니다. 정확한 기간은 프로젝트 복잡도에 따라 달라질 수 있습니다."
    },
    {
      "question": "어떤 기술 스택을 사용하나요?",
      "answer": "React/Next.js (프론트엔드), Node.js/Supabase (백엔드), PostgreSQL (데이터베이스), Vercel (호스팅)을 기본으로 사용합니다. 프로젝트 요구사항에 따라 최적의 기술 스택을 제안드립니다."
    },
    {
      "question": "디자인도 포함되나요?",
      "answer": "네, 모든 패키지에 UI/UX 디자인이 포함됩니다. Figma로 디자인 파일을 제공하며, 브랜드 아이덴티티에 맞는 커스텀 디자인을 제작합니다."
    },
    {
      "question": "런칭 후 수정이 필요하면 어떻게 하나요?",
      "answer": "모든 패키지에 2-6개월의 무상 기술 지원이 포함됩니다. 이 기간 동안 버그 수정 및 긴급 이슈에 대응합니다. 이후에는 별도의 유지보수 계약을 체결할 수 있습니다."
    },
    {
      "question": "소스 코드 소유권은 누구에게 있나요?",
      "answer": "프로젝트 완료 후 모든 소스 코드와 디자인 파일의 소유권은 100% 고객님께 귀속됩니다. GitHub 저장소를 고객 계정으로 이전해드립니다."
    },
    {
      "question": "중간에 기능을 추가하거나 변경할 수 있나요?",
      "answer": "네, 가능합니다. 애자일 방식으로 2주 단위 스프린트를 진행하며, 각 스프린트 시작 전 우선순위를 재조정할 수 있습니다. 다만 대규모 변경은 일정과 비용에 영향을 줄 수 있습니다."
    },
    {
      "question": "결제는 어떻게 진행되나요?",
      "answer": "계약금 30% (착수 시), 중도금 40% (개발 50% 완료 시), 잔금 30% (최종 인수인계 시) 3회 분할 납부가 기본입니다. 프로젝트 규모에 따라 협의 가능합니다."
    },
    {
      "question": "개발 진행 상황을 어떻게 확인하나요?",
      "answer": "주 2회 정기 미팅을 통해 진행 상황을 공유하며, 실시간으로 스테이징 환경에서 개발 결과를 확인할 수 있습니다. Slack/Discord를 통한 일일 커뮤니케이션도 지원합니다."
    }
  ]'::jsonb
WHERE slug = 'mvp-development';

-- ============================================
-- 2. 풀스택 개발 서비스 (fullstack-development)
-- ============================================

UPDATE public.services
SET
  pricing_data = '[
    {
      "name": "월간 (2인 팀)",
      "price": 5500000,
      "unit": "월",
      "commitment": "최소 2개월",
      "team": "시니어 개발자 2명",
      "hours": "주 80시간 (40시간 × 2명)",
      "features": [
        "풀타임 전담 개발팀",
        "2주 단위 스프린트",
        "주 2회 진행 상황 미팅",
        "월 4회 배포",
        "코드 리뷰 & QA",
        "기술 문서 작성"
      ],
      "ideal_for": "지속적인 개발이 필요한 프로젝트",
      "popular": true
    },
    {
      "name": "분기 (3개월)",
      "price": 15000000,
      "unit": "분기",
      "discount": "9% 할인",
      "original_price": 16500000,
      "team": "시니어 개발자 2명",
      "hours": "주 80시간 × 12주",
      "features": [
        "월간 플랜의 모든 혜택",
        "분기별 기술 전략 미팅",
        "성능 최적화 리포트",
        "보안 감사",
        "우선 기술 지원"
      ],
      "ideal_for": "중장기 프로젝트에 최적"
    },
    {
      "name": "연간 (12개월)",
      "price": 60000000,
      "unit": "년",
      "discount": "9% 할인",
      "original_price": 66000000,
      "team": "시니어 개발자 2명 + PM 1명",
      "hours": "주 80시간 × 48주",
      "features": [
        "분기 플랜의 모든 혜택",
        "전담 프로젝트 매니저",
        "월간 기술 리포트",
        "연 4회 아키텍처 리뷰",
        "24시간 긴급 지원",
        "무제한 기술 상담"
      ],
      "ideal_for": "장기 파트너십을 원하는 기업"
    }
  ]'::jsonb,
  deliverables = '[
    {
      "category": "매 스프린트 (2주)",
      "items": [
        "배포 가능한 기능 업데이트",
        "스프린트 리뷰 미팅",
        "다음 스프린트 계획",
        "Git 커밋 & PR 리뷰"
      ]
    },
    {
      "category": "월간",
      "items": [
        "월간 진행 리포트",
        "코드 품질 분석 리포트",
        "성능 메트릭 리포트",
        "기술 부채 현황"
      ]
    },
    {
      "category": "분기별 (해당 플랜)",
      "items": [
        "분기 기술 전략 리포트",
        "성능 최적화 제안서",
        "보안 감사 리포트",
        "아키텍처 리뷰 결과"
      ]
    },
    {
      "category": "프로젝트 종료 시",
      "items": [
        "전체 소스 코드 (GitHub)",
        "API 문서 (OpenAPI/Swagger)",
        "기술 문서 (아키텍처, 배포 가이드)",
        "운영 매뉴얼",
        "테스트 커버리지 리포트",
        "CI/CD 파이프라인 설정"
      ]
    }
  ]'::jsonb,
  process_steps = '[
    {
      "step": 1,
      "title": "온보딩 (Week 1)",
      "activities": [
        "킥오프 미팅",
        "기술 스택 & 아키텍처 리뷰",
        "개발 환경 설정",
        "커뮤니케이션 채널 구축 (Slack/Discord)",
        "첫 번째 스프린트 계획"
      ]
    },
    {
      "step": 2,
      "title": "스프린트 사이클 (매 2주 반복)",
      "activities": [
        "스프린트 플래닝 미팅 (월요일)",
        "일일 스탠드업 (비동기 Slack)",
        "개발 & 코드 리뷰",
        "QA & 테스트",
        "스프린트 리뷰 미팅 (금요일)",
        "배포 (승인 시)"
      ]
    },
    {
      "step": 3,
      "title": "주간 체크인",
      "activities": [
        "진행 상황 공유 미팅 (주 2회)",
        "블로커 이슈 해결",
        "우선순위 조정",
        "다음 주 계획 수립"
      ]
    },
    {
      "step": 4,
      "title": "월간 리뷰",
      "activities": [
        "월간 성과 리뷰",
        "코드 품질 & 성능 분석",
        "기술 부채 점검",
        "다음 달 로드맵 논의"
      ]
    },
    {
      "step": 5,
      "title": "분기/연간 전략 미팅 (해당 플랜)",
      "activities": [
        "기술 전략 리뷰",
        "아키텍처 최적화 제안",
        "보안 & 성능 감사",
        "장기 로드맵 수립"
      ]
    },
    {
      "step": 6,
      "title": "프로젝트 종료 (계약 만료 시)",
      "activities": [
        "최종 인수인계 미팅",
        "소스 코드 & 문서 이전",
        "운영 가이드 교육",
        "후속 지원 계획 논의"
      ]
    }
  ]'::jsonb,
  faq = '[
    {
      "question": "어떤 개발자가 배정되나요?",
      "answer": "5년 이상 경력의 시니어 풀스택 개발자 2명이 전담 팀으로 배정됩니다. React/Next.js, Node.js, PostgreSQL/Supabase에 능숙하며, 현대적인 웹 애플리케이션 개발 경험이 풍부합니다."
    },
    {
      "question": "최소 계약 기간이 있나요?",
      "answer": "월간 플랜은 최소 2개월 계약이 필요합니다. 분기 플랜은 3개월, 연간 플랜은 12개월 약정입니다. 장기 계약일수록 할인 혜택이 제공됩니다."
    },
    {
      "question": "중간에 계약을 해지할 수 있나요?",
      "answer": "월간 플랜은 1개월 전 사전 통보로 해지 가능합니다. 분기/연간 플랜은 약정 기간 만료 후 해지하거나, 위약금(잔여 금액의 30%)을 지불하고 조기 종료할 수 있습니다."
    },
    {
      "question": "작업 시간은 어떻게 배분되나요?",
      "answer": "주 80시간(2명 × 40시간)이 순수 개발 시간입니다. 미팅, 코드 리뷰, 문서 작업 등 모든 활동이 포함됩니다. 필요시 초과 근무도 협의 가능합니다(별도 비용)."
    },
    {
      "question": "어떤 기술 스택을 사용하나요?",
      "answer": "기본 스택은 React/Next.js, TypeScript, Tailwind CSS (프론트엔드), Supabase/PostgreSQL (백엔드), Vercel (호스팅)입니다. 프로젝트 요구사항에 따라 다른 기술도 사용 가능합니다."
    },
    {
      "question": "개발 진행 상황을 실시간으로 볼 수 있나요?",
      "answer": "네, 스테이징 환경에서 실시간으로 개발 결과를 확인할 수 있으며, GitHub에서 모든 커밋과 PR을 볼 수 있습니다. 주 2회 진행 상황 미팅도 있습니다."
    },
    {
      "question": "긴급한 버그 수정은 어떻게 하나요?",
      "answer": "월간/분기 플랜은 업무 시간(09:00-18:00) 내 8시간 이내 대응, 연간 플랜은 24시간 긴급 지원을 제공합니다. 중대한 프로덕션 이슈는 최우선으로 처리합니다."
    },
    {
      "question": "코드 품질은 어떻게 보장되나요?",
      "answer": "모든 코드는 동료 리뷰를 거치며, ESLint/TypeScript로 코드 품질을 관리합니다. 월간 코드 품질 리포트를 제공하며, 테스트 커버리지 80% 이상을 목표로 합니다."
    },
    {
      "question": "배포는 얼마나 자주 하나요?",
      "answer": "2주 스프린트 종료 시 배포하므로 월 2-4회 배포합니다. 긴급 버그 수정은 핫픽스로 즉시 배포 가능합니다. CI/CD 파이프라인을 통해 안전하게 배포합니다."
    },
    {
      "question": "결제는 어떻게 진행되나요?",
      "answer": "월간 플랜은 매월 1일 선불 결제, 분기/연간 플랜은 분할 납부(착수 시 50%, 중간 30%, 종료 시 20%) 또는 일시불 선택 가능합니다. 세금계산서 발행됩니다."
    }
  ]'::jsonb
WHERE slug = 'fullstack-development';

-- ============================================
-- 3. 디자인 시스템 서비스 (design-system)
-- ============================================

UPDATE public.services
SET
  pricing_data = '[
    {
      "name": "스탠다드",
      "price": 800000,
      "duration": "2-3주",
      "components": "30개 컴포넌트",
      "features": [
        "컬러 시스템 (5-8색)",
        "타이포그래피 (3-4 스타일)",
        "기본 컴포넌트 20개",
        "복합 컴포넌트 10개",
        "Figma 디자인 파일",
        "React 컴포넌트 라이브러리",
        "기본 Storybook 문서"
      ],
      "ideal_for": "소규모 프로젝트 & 스타트업",
      "popular": true
    },
    {
      "name": "프로",
      "price": 1500000,
      "duration": "3-4주",
      "components": "50개 컴포넌트",
      "features": [
        "스탠다드의 모든 기능",
        "확장 컬러 시스템 (10-15색)",
        "타이포그래피 (5-6 스타일)",
        "기본 컴포넌트 30개",
        "복합 컴포넌트 20개",
        "다크 모드 지원",
        "애니메이션 & 인터랙션",
        "고급 Storybook 문서",
        "접근성(A11y) 가이드"
      ],
      "ideal_for": "중규모 프로젝트 & 성장하는 기업"
    }
  ]'::jsonb,
  deliverables = '[
    {
      "category": "디자인 파일",
      "items": [
        "Figma 디자인 시스템 파일 (편집 권한)",
        "컬러 팔레트 (Primary, Secondary, Semantic)",
        "타이포그래피 스케일",
        "간격(Spacing) 시스템",
        "아이콘 라이브러리 (Lucide Icons)"
      ]
    },
    {
      "category": "React 컴포넌트",
      "items": [
        "npm 패키지로 배포된 컴포넌트 라이브러리",
        "TypeScript 타입 정의",
        "Tailwind CSS 기반 스타일링",
        "다크 모드 지원 (프로 플랜)",
        "Tree-shaking 최적화"
      ]
    },
    {
      "category": "문서",
      "items": [
        "Storybook 인터랙티브 문서",
        "컴포넌트 사용 가이드",
        "디자인 토큰 문서",
        "브랜드 가이드라인",
        "접근성 체크리스트 (프로 플랜)"
      ]
    },
    {
      "category": "코드 & 설정",
      "items": [
        "GitHub 저장소",
        "Tailwind Config 파일",
        "ESLint & Prettier 설정",
        "Storybook 설정"
      ]
    }
  ]'::jsonb,
  process_steps = '[
    {
      "step": 1,
      "title": "브랜드 분석 & 전략",
      "duration": "3-5일",
      "activities": [
        "킥오프 미팅",
        "브랜드 아이덴티티 분석",
        "경쟁사 디자인 시스템 리서치",
        "타겟 사용자 정의",
        "디자인 방향 수립"
      ]
    },
    {
      "step": 2,
      "title": "디자인 토큰 정의",
      "duration": "2-3일",
      "activities": [
        "컬러 팔레트 생성",
        "타이포그래피 스케일 정의",
        "간격(Spacing) 시스템 구축",
        "레이아웃 그리드 설정",
        "디자인 토큰 리뷰"
      ]
    },
    {
      "step": 3,
      "title": "컴포넌트 디자인",
      "duration": "5-7일",
      "activities": [
        "기본 컴포넌트 디자인 (Button, Input, Card...)",
        "복합 컴포넌트 디자인 (Modal, Dropdown, Table...)",
        "상태별 디자인 (Hover, Focus, Disabled...)",
        "반응형 디자인",
        "다크 모드 디자인 (프로 플랜)"
      ]
    },
    {
      "step": 4,
      "title": "React 구현",
      "duration": "5-7일",
      "activities": [
        "컴포넌트 개발 (TypeScript + Tailwind)",
        "Props 인터페이스 정의",
        "접근성 구현 (ARIA labels, keyboard nav)",
        "단위 테스트 작성",
        "빌드 & 패키징"
      ]
    },
    {
      "step": 5,
      "title": "문서화 & 인수인계",
      "duration": "2-3일",
      "activities": [
        "Storybook 문서 작성",
        "사용 가이드 작성",
        "npm 패키지 배포",
        "개발팀 온보딩",
        "최종 인수인계"
      ]
    }
  ]'::jsonb,
  faq = '[
    {
      "question": "디자인 시스템이란 무엇인가요?",
      "answer": "디자인 시스템은 일관된 사용자 경험을 제공하기 위한 재사용 가능한 디자인 요소와 규칙의 모음입니다. 버튼, 입력 필드 등의 컴포넌트부터 컬러, 타이포그래피 같은 디자인 토큰까지 포함합니다."
    },
    {
      "question": "왜 디자인 시스템이 필요한가요?",
      "answer": "1) 개발 속도 향상 (재사용 가능한 컴포넌트), 2) 일관된 사용자 경험, 3) 디자이너-개발자 협업 효율화, 4) 유지보수 비용 절감의 효과가 있습니다."
    },
    {
      "question": "Figma 파일도 제공되나요?",
      "answer": "네, 모든 컴포넌트와 디자인 토큰이 포함된 Figma 파일을 제공합니다. 편집 권한도 드리므로 향후 자체적으로 확장 가능합니다."
    },
    {
      "question": "어떤 컴포넌트가 포함되나요?",
      "answer": "스탠다드: Button, Input, Card, Modal, Dropdown 등 30개. 프로: 스탠다드 + Table, Tabs, Accordion, Toast 등 50개. 프로젝트 요구사항에 따라 커스터마이징 가능합니다."
    },
    {
      "question": "다크 모드를 지원하나요?",
      "answer": "프로 플랜에서 다크 모드를 지원합니다. 모든 컴포넌트가 라이트/다크 모드에서 자동으로 작동하며, Tailwind CSS의 dark: 클래스를 활용합니다."
    },
    {
      "question": "기존 프로젝트에 적용할 수 있나요?",
      "answer": "네, npm 패키지로 설치하여 기존 React 프로젝트에 바로 적용 가능합니다. Tailwind CSS만 설정되어 있으면 됩니다. 마이그레이션 가이드도 제공합니다."
    },
    {
      "question": "커스터마이징이 가능한가요?",
      "answer": "네, Tailwind Config를 수정하여 컬러, 폰트, 간격 등을 쉽게 커스터마이징할 수 있습니다. 소스 코드도 모두 제공되므로 컴포넌트 자체도 수정 가능합니다."
    },
    {
      "question": "유지보수나 업데이트는 어떻게 하나요?",
      "answer": "프로젝트 완료 후 소스 코드 소유권이 이전되므로 자체적으로 유지보수 가능합니다. 필요시 별도 계약으로 지속적인 업데이트 지원을 받을 수 있습니다."
    }
  ]'::jsonb
WHERE slug = 'design-system';

-- ============================================
-- 4. 운영 관리 서비스 (operations-management)
-- ============================================

UPDATE public.services
SET
  pricing_data = '[
    {
      "name": "Standard",
      "price": 1000000,
      "unit": "월",
      "commitment": "최소 3개월",
      "sla": "업무시간 24시간 대응",
      "features": [
        "24/7 시스템 모니터링",
        "긴급 장애 대응 (업무시간 24H)",
        "월 10시간 기술 지원",
        "월간 성능 분석 리포트",
        "보안 패치 자동 적용",
        "백업 관리 (일 1회)",
        "Slack 지원 채널"
      ],
      "ideal_for": "소규모 서비스 (일 방문자 ~10K)",
      "popular": true
    },
    {
      "name": "Pro",
      "price": 2000000,
      "unit": "월",
      "commitment": "최소 3개월",
      "sla": "업무시간 8시간 대응",
      "features": [
        "Standard의 모든 기능",
        "긴급 장애 대응 (업무시간 8H)",
        "월 20시간 기술 지원",
        "주간 성능 분석 리포트",
        "성능 최적화 (월 1회)",
        "보안 감사 (월 1회)",
        "백업 관리 (일 3회)",
        "전담 엔지니어 배정",
        "우선 지원"
      ],
      "ideal_for": "중규모 서비스 (일 방문자 10K-100K)"
    },
    {
      "name": "Enterprise",
      "price": 4000000,
      "unit": "월",
      "commitment": "최소 6개월",
      "sla": "24/7 2시간 긴급 대응",
      "features": [
        "Pro의 모든 기능",
        "긴급 장애 대응 (24/7 2시간)",
        "월 40시간 기술 지원",
        "일간 성능 분석 리포트",
        "성능 최적화 (주 1회)",
        "보안 감사 (주 1회)",
        "백업 관리 (실시간)",
        "전담 DevOps 팀",
        "무제한 기술 상담",
        "SLA 99.9% 보장"
      ],
      "ideal_for": "대규모 서비스 (일 방문자 100K+)"
    }
  ]'::jsonb,
  deliverables = '[
    {
      "category": "모니터링 & 알림",
      "items": [
        "실시간 서버 상태 모니터링",
        "애플리케이션 성능 모니터링 (APM)",
        "에러 추적 & 로깅",
        "장애 발생 시 즉시 알림 (Slack/Email/SMS)"
      ]
    },
    {
      "category": "보안 관리",
      "items": [
        "보안 취약점 모니터링",
        "자동 보안 패치 적용",
        "SSL 인증서 관리",
        "정기 보안 감사 리포트 (Pro/Enterprise)"
      ]
    },
    {
      "category": "성능 최적화",
      "items": [
        "데이터베이스 쿼리 최적화",
        "CDN & 캐싱 전략",
        "번들 사이즈 최적화",
        "Lighthouse 점수 개선"
      ]
    },
    {
      "category": "백업 & 복구",
      "items": [
        "자동 데이터베이스 백업",
        "백업 무결성 검증",
        "재해 복구 계획 (DRP)",
        "백업 복원 테스트 (분기 1회)"
      ]
    },
    {
      "category": "정기 리포트",
      "items": [
        "성능 분석 리포트 (월/주/일간)",
        "보안 감사 리포트",
        "장애 대응 리포트",
        "개선 제안서"
      ]
    }
  ]'::jsonb,
  process_steps = '[
    {
      "step": 1,
      "title": "온보딩 & 설정 (Week 1)",
      "activities": [
        "현재 인프라 분석",
        "모니터링 도구 설정 (Vercel Analytics, Sentry 등)",
        "알림 채널 구성 (Slack/Email/SMS)",
        "백업 시스템 구축",
        "긴급 대응 프로세스 정의"
      ]
    },
    {
      "step": 2,
      "title": "일상 운영 (매일)",
      "activities": [
        "시스템 상태 모니터링",
        "에러 로그 검토",
        "성능 메트릭 추적",
        "보안 취약점 스캔",
        "자동 백업 실행 & 검증"
      ]
    },
    {
      "step": 3,
      "title": "장애 대응 (필요 시)",
      "activities": [
        "장애 감지 & 알림",
        "긴급 대응 (SLA 기준)",
        "원인 분석 & 해결",
        "서비스 복구",
        "사후 분석 리포트 작성"
      ]
    },
    {
      "step": 4,
      "title": "정기 유지보수",
      "activities": [
        "보안 패치 적용 (주간)",
        "성능 최적화 (월/주간)",
        "보안 감사 (월/주간)",
        "백업 복원 테스트 (분기)",
        "인프라 업그레이드 권장사항"
      ]
    },
    {
      "step": 5,
      "title": "월간/주간 리뷰 (플랜별)",
      "activities": [
        "성능 분석 리포트 제공",
        "장애 및 대응 내역 공유",
        "보안 현황 리뷰",
        "기술 지원 사용 내역",
        "다음 기간 계획 논의"
      ]
    }
  ]'::jsonb,
  faq = '[
    {
      "question": "24/7 모니터링이란 무엇인가요?",
      "answer": "서버, 데이터베이스, 애플리케이션을 24시간 실시간으로 모니터링하여 장애 발생 시 즉시 감지하고 알립니다. Standard는 알림만, Pro/Enterprise는 직접 대응까지 포함됩니다."
    },
    {
      "question": "긴급 대응 시간은 어떻게 되나요?",
      "answer": "Standard: 업무시간(09:00-18:00) 내 24시간 이내 대응, Pro: 업무시간 8시간 이내 대응, Enterprise: 24/7 2시간 이내 긴급 대응을 보장합니다."
    },
    {
      "question": "월 기술 지원 시간은 어떻게 사용하나요?",
      "answer": "버그 수정, 간단한 기능 추가, 설정 변경, 기술 상담 등에 사용 가능합니다. 사용하지 않은 시간은 다음 달로 이월되지 않으며, 초과 시 별도 비용이 발생합니다."
    },
    {
      "question": "어떤 모니터링 도구를 사용하나요?",
      "answer": "Vercel Analytics (웹 성능), Sentry (에러 추적), Supabase Logs (데이터베이스), Uptime Robot (서버 상태) 등 업계 표준 도구를 사용합니다."
    },
    {
      "question": "백업은 얼마나 자주 하나요?",
      "answer": "Standard: 일 1회, Pro: 일 3회, Enterprise: 실시간 백업을 제공합니다. 모든 백업은 암호화되어 안전한 클라우드 스토리지에 보관됩니다."
    },
    {
      "question": "보안 패치는 어떻게 적용되나요?",
      "answer": "npm 패키지 보안 취약점을 자동으로 스캔하고, 중요 패치는 테스트 후 스테이징 → 프로덕션 순으로 적용합니다. 중대한 보안 이슈는 긴급 패치를 진행합니다."
    },
    {
      "question": "SLA 99.9%는 무엇을 의미하나요?",
      "answer": "월 99.9% 가동시간을 보장합니다(월 43분 이하 다운타임). SLA 미달 시 해당 월 요금의 일부를 환불해드립니다. (Enterprise 플랜만 해당)"
    },
    {
      "question": "중간에 플랜을 변경할 수 있나요?",
      "answer": "네, 다음 결제 주기부터 플랜 변경이 가능합니다. 업그레이드는 즉시 적용되며, 다운그레이드는 현재 약정 기간 만료 후 가능합니다."
    },
    {
      "question": "계약 해지는 어떻게 하나요?",
      "answer": "최소 약정 기간(Standard/Pro: 3개월, Enterprise: 6개월) 이후 1개월 전 사전 통보로 해지 가능합니다. 조기 해지 시 위약금(잔여 금액의 50%)이 발생합니다."
    },
    {
      "question": "성능 최적화는 무엇을 포함하나요?",
      "answer": "데이터베이스 쿼리 최적화, 이미지/번들 사이즈 최적화, CDN 설정, 캐싱 전략, Lighthouse 점수 개선 등을 포함합니다. Pro는 월 1회, Enterprise는 주 1회 진행합니다."
    }
  ]'::jsonb
WHERE slug = 'operations-management';

-- ============================================
-- 검증 쿼리
-- ============================================

DO $$
DECLARE
  mvp_data_count INTEGER;
  fullstack_data_count INTEGER;
  design_data_count INTEGER;
  operations_data_count INTEGER;
BEGIN
  -- 각 서비스의 데이터 채워짐 여부 확인
  SELECT
    COUNT(*) FILTER (WHERE pricing_data IS NOT NULL AND deliverables IS NOT NULL AND process_steps IS NOT NULL AND faq IS NOT NULL)
  INTO mvp_data_count
  FROM public.services
  WHERE slug = 'mvp-development';

  SELECT
    COUNT(*) FILTER (WHERE pricing_data IS NOT NULL AND deliverables IS NOT NULL AND process_steps IS NOT NULL AND faq IS NOT NULL)
  INTO fullstack_data_count
  FROM public.services
  WHERE slug = 'fullstack-development';

  SELECT
    COUNT(*) FILTER (WHERE pricing_data IS NOT NULL AND deliverables IS NOT NULL AND process_steps IS NOT NULL AND faq IS NOT NULL)
  INTO design_data_count
  FROM public.services
  WHERE slug = 'design-system';

  SELECT
    COUNT(*) FILTER (WHERE pricing_data IS NOT NULL AND deliverables IS NOT NULL AND process_steps IS NOT NULL AND faq IS NOT NULL)
  INTO operations_data_count
  FROM public.services
  WHERE slug = 'operations-management';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ 서비스 콘텐츠 데이터 마이그레이션 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 데이터 추가 현황:';
  RAISE NOTICE '  1. MVP 개발 서비스: %', CASE WHEN mvp_data_count = 1 THEN '✅ 완료 (3개 패키지, 10개 결과물, 5단계, 8개 FAQ)' ELSE '❌ 실패' END;
  RAISE NOTICE '  2. 풀스택 개발 서비스: %', CASE WHEN fullstack_data_count = 1 THEN '✅ 완료 (3개 플랜, 12개 결과물, 6단계, 10개 FAQ)' ELSE '❌ 실패' END;
  RAISE NOTICE '  3. 디자인 시스템 서비스: %', CASE WHEN design_data_count = 1 THEN '✅ 완료 (2개 패키지, 8개 결과물, 5단계, 8개 FAQ)' ELSE '❌ 실패' END;
  RAISE NOTICE '  4. 운영 관리 서비스: %', CASE WHEN operations_data_count = 1 THEN '✅ 완료 (3개 플랜, 5개 결과물, 5단계, 10개 FAQ)' ELSE '❌ 실패' END;
  RAISE NOTICE '';
  RAISE NOTICE '📋 총 추가 데이터:';
  RAISE NOTICE '  - 패키지/플랜: 11개 (MVP 3 + 풀스택 3 + 디자인 2 + 운영 3)';
  RAISE NOTICE '  - 결과물 카테고리: 35개';
  RAISE NOTICE '  - 프로세스 단계: 21개';
  RAISE NOTICE '  - FAQ: 36개';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF mvp_data_count = 1 AND fullstack_data_count = 1 AND design_data_count = 1 AND operations_data_count = 1 THEN
    RAISE NOTICE '🎉 모든 서비스 데이터가 성공적으로 추가되었습니다!';
  ELSE
    RAISE WARNING '❌ 일부 서비스 데이터 추가 실패! 위 내용을 확인하세요.';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
