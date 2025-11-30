/**
 * 스타트업 MVP RFP 템플릿
 *
 * 스타트업의 MVP 개발을 위한 RFP 템플릿
 *
 * @module skills/docx/templates/rfp-startup
 */

import type { DocumentTemplate } from '../types';

/**
 * 스타트업 MVP RFP 템플릿
 */
export const rfpStartupTemplate: DocumentTemplate = {
  id: 'rfp-startup-mvp',
  name: '스타트업 MVP RFP',
  type: 'rfp',
  description: '스타트업의 MVP(Minimum Viable Product) 개발을 위한 제안요청서',
  version: '1.0.0',
  variables: [
    {
      key: 'projectName',
      label: '프로젝트명',
      type: 'text',
      required: true,
      description: 'MVP 프로젝트 이름',
    },
    {
      key: 'startupName',
      label: '스타트업명',
      type: 'text',
      required: true,
      description: '회사 또는 팀 이름',
    },
    {
      key: 'background',
      label: '배경 및 문제 정의',
      type: 'text',
      required: true,
      description: '해결하고자 하는 문제와 배경',
    },
    {
      key: 'targetUsers',
      label: '타겟 사용자',
      type: 'text',
      required: true,
      description: 'MVP의 주요 타겟 사용자층',
    },
    {
      key: 'coreFeatures',
      label: '핵심 기능',
      type: 'list',
      required: true,
      description: 'MVP에 포함될 핵심 기능 목록',
    },
    {
      key: 'techStack',
      label: '선호 기술 스택',
      type: 'list',
      required: false,
      description: '선호하는 기술 스택 (선택사항)',
    },
    {
      key: 'budget',
      label: '예산',
      type: 'number',
      required: true,
      description: '총 예산 (KRW)',
      validation: {
        min: 0,
      },
    },
    {
      key: 'timeline',
      label: '개발 기간',
      type: 'text',
      required: true,
      description: '예상 개발 기간 (예: 3개월)',
    },
    {
      key: 'startDate',
      label: '시작 예정일',
      type: 'date',
      required: true,
    },
    {
      key: 'successMetrics',
      label: '성공 지표',
      type: 'list',
      required: false,
      description: 'MVP 성공을 측정할 지표',
    },
  ],
  sections: [
    {
      id: 'section-1',
      title: '1. 프로젝트 개요',
      order: 1,
      required: true,
      content: `
프로젝트명: {{projectName}}
스타트업: {{startupName}}
시작 예정일: {{startDate}}
개발 기간: {{timeline}}
      `,
      variables: ['projectName', 'startupName', 'startDate', 'timeline'],
    },
    {
      id: 'section-2',
      title: '2. 배경 및 문제 정의',
      order: 2,
      required: true,
      content: `{{background}}`,
      variables: ['background'],
    },
    {
      id: 'section-3',
      title: '3. 타겟 사용자',
      order: 3,
      required: true,
      content: `{{targetUsers}}`,
      variables: ['targetUsers'],
    },
    {
      id: 'section-4',
      title: '4. MVP 핵심 기능',
      order: 4,
      required: true,
      content: `{{coreFeatures}}`,
      variables: ['coreFeatures'],
    },
    {
      id: 'section-5',
      title: '5. 기술 요구사항',
      order: 5,
      required: false,
      content: `
선호 기술 스택:
{{techStack}}

기타 요구사항:
- 모바일 반응형 웹 또는 네이티브 앱
- 클라우드 기반 인프라 (AWS, GCP, Azure 등)
- CI/CD 파이프라인 구축
- 기본적인 보안 조치 (HTTPS, 인증/인가)
      `,
      variables: ['techStack'],
      condition: 'techStack',
    },
    {
      id: 'section-6',
      title: '6. 예산 및 일정',
      order: 6,
      required: true,
      content: `
총 예산: {{budget}} 원
개발 기간: {{timeline}}
시작 예정일: {{startDate}}

* 일정은 협의 가능하며, 단계별 진행을 원칙으로 합니다.
      `,
      variables: ['budget', 'timeline', 'startDate'],
    },
    {
      id: 'section-7',
      title: '7. 성공 지표',
      order: 7,
      required: false,
      content: `{{successMetrics}}`,
      variables: ['successMetrics'],
      condition: 'successMetrics',
    },
    {
      id: 'section-8',
      title: '8. 제안 요청사항',
      order: 8,
      required: true,
      content: `
다음 사항을 포함하여 제안서를 제출해주시기 바랍니다:

1. 프로젝트 이해도 및 접근 방법
2. 상세 기능 명세 및 기술 스택 제안
3. 단계별 개발 일정 및 마일스톤
4. 팀 구성 및 투입 인력
5. 총 비용 산출 내역
6. 유사 프로젝트 경험 및 포트폴리오
7. 유지보수 및 운영 계획

제출 기한: {{startDate}} 2주 전까지
제출 방법: 이메일 (startupname@example.com)
      `,
      variables: ['startDate'],
    },
  ],
};
