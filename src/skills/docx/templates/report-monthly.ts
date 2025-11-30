/**
 * 월간 운영 보고서 템플릿
 *
 * 서비스 운영 월간 보고서
 *
 * @module skills/docx/templates/report-monthly
 */

import type { DocumentTemplate } from '../types';

/**
 * 월간 운영 보고서 템플릿
 */
export const reportMonthlyTemplate: DocumentTemplate = {
  id: 'report-monthly-ops',
  name: '월간 운영 보고서',
  type: 'report',
  description: '서비스 운영 현황 월간 보고서',
  version: '1.0.0',
  variables: [
    {
      key: 'serviceName',
      label: '서비스명',
      type: 'text',
      required: true,
    },
    {
      key: 'reportMonth',
      label: '보고 월',
      type: 'text',
      required: true,
      description: '예: 2025년 1월',
    },
    {
      key: 'reportDate',
      label: '작성일',
      type: 'date',
      required: true,
    },
    {
      key: 'author',
      label: '작성자',
      type: 'text',
      required: true,
    },
    {
      key: 'executiveSummary',
      label: '요약',
      type: 'text',
      required: true,
      description: '월간 운영 현황 한 줄 요약',
    },
    {
      key: 'availability',
      label: '가용률 (%)',
      type: 'number',
      required: true,
      validation: {
        min: 0,
        max: 100,
      },
    },
    {
      key: 'avgResponseTime',
      label: '평균 응답 시간 (ms)',
      type: 'number',
      required: true,
    },
    {
      key: 'errorRate',
      label: '에러율 (%)',
      type: 'number',
      required: true,
      validation: {
        min: 0,
        max: 100,
      },
    },
    {
      key: 'totalRequests',
      label: '총 요청 수',
      type: 'number',
      required: true,
    },
    {
      key: 'activeUsers',
      label: '활성 사용자 수',
      type: 'number',
      required: false,
    },
    {
      key: 'incidents',
      label: '장애 현황',
      type: 'table',
      required: false,
      description: '발생한 장애 목록',
    },
    {
      key: 'majorIncidents',
      label: '주요 장애',
      type: 'list',
      required: false,
      description: '주요 장애 상세 설명',
    },
    {
      key: 'deployments',
      label: '배포 현황',
      type: 'list',
      required: false,
      description: '배포된 업데이트 목록',
    },
    {
      key: 'improvements',
      label: '개선 사항',
      type: 'list',
      required: false,
      description: '이번 달 개선된 사항',
    },
    {
      key: 'nextMonthPlan',
      label: '다음 달 계획',
      type: 'list',
      required: true,
      description: '다음 달 주요 계획',
    },
    {
      key: 'recommendations',
      label: '권장 사항',
      type: 'list',
      required: false,
      description: '운영 개선을 위한 권장 사항',
    },
  ],
  sections: [
    {
      id: 'section-1',
      title: '서비스 정보',
      order: 1,
      required: true,
      content: `
서비스명: {{serviceName}}
보고 월: {{reportMonth}}
작성일: {{reportDate}}
작성자: {{author}}
      `,
      variables: ['serviceName', 'reportMonth', 'reportDate', 'author'],
    },
    {
      id: 'section-2',
      title: '1. 요약',
      order: 2,
      required: true,
      content: `{{executiveSummary}}`,
      variables: ['executiveSummary'],
    },
    {
      id: 'section-3',
      title: '2. 주요 지표',
      order: 3,
      required: true,
      content: `
| 지표 | 값 |
|------|-----|
| 가용률 | {{availability}}% |
| 평균 응답 시간 | {{avgResponseTime}}ms |
| 에러율 | {{errorRate}}% |
| 총 요청 수 | {{totalRequests}} |
| 활성 사용자 | {{activeUsers}} |

※ 전월 대비 증감률은 별도 차트 참조
      `,
      variables: [
        'availability',
        'avgResponseTime',
        'errorRate',
        'totalRequests',
        'activeUsers',
      ],
    },
    {
      id: 'section-4',
      title: '3. 장애 현황',
      order: 4,
      required: false,
      content: `
{{incidents}}

### 주요 장애 상세
{{majorIncidents}}
      `,
      variables: ['incidents', 'majorIncidents'],
      condition: 'incidents',
    },
    {
      id: 'section-5',
      title: '4. 배포 현황',
      order: 5,
      required: false,
      content: `{{deployments}}`,
      variables: ['deployments'],
      condition: 'deployments',
    },
    {
      id: 'section-6',
      title: '5. 개선 사항',
      order: 6,
      required: false,
      content: `{{improvements}}`,
      variables: ['improvements'],
      condition: 'improvements',
    },
    {
      id: 'section-7',
      title: '6. 다음 달 계획',
      order: 7,
      required: true,
      content: `{{nextMonthPlan}}`,
      variables: ['nextMonthPlan'],
    },
    {
      id: 'section-8',
      title: '7. 권장 사항',
      order: 8,
      required: false,
      content: `{{recommendations}}`,
      variables: ['recommendations'],
      condition: 'recommendations',
    },
    {
      id: 'section-9',
      title: '8. 부록',
      order: 9,
      required: false,
      content: `
- 상세 모니터링 그래프
- 서버 리소스 사용률
- 데이터베이스 성능 지표
- 사용자 행동 분석
      `,
    },
  ],
};
