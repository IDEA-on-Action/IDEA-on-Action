/**
 * 주간 보고서 템플릿
 *
 * 프로젝트 주간 진행 상황 보고서
 *
 * @module skills/docx/templates/report-weekly
 */

import type { DocumentTemplate } from '../types';

/**
 * 주간 보고서 템플릿
 */
export const reportWeeklyTemplate: DocumentTemplate = {
  id: 'report-weekly',
  name: '주간 보고서',
  type: 'report',
  description: '프로젝트 주간 진행 상황 보고서',
  version: '1.0.0',
  variables: [
    {
      key: 'projectName',
      label: '프로젝트명',
      type: 'text',
      required: true,
    },
    {
      key: 'reportWeek',
      label: '보고 주차',
      type: 'text',
      required: true,
      description: '예: 2025년 1주차 (1/1 ~ 1/7)',
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
      key: 'overallStatus',
      label: '전체 진행 상황',
      type: 'text',
      required: true,
      description: '예: 순조롭게 진행 중, 일부 지연, 심각한 이슈 발생',
    },
    {
      key: 'completedTasks',
      label: '완료된 작업',
      type: 'list',
      required: true,
      description: '이번 주에 완료된 작업 목록',
    },
    {
      key: 'inProgressTasks',
      label: '진행 중인 작업',
      type: 'list',
      required: true,
      description: '현재 진행 중인 작업 목록',
    },
    {
      key: 'nextWeekTasks',
      label: '다음 주 계획',
      type: 'list',
      required: true,
      description: '다음 주에 진행할 작업 목록',
    },
    {
      key: 'issues',
      label: '이슈 및 리스크',
      type: 'list',
      required: false,
      description: '발생한 이슈 또는 예상되는 리스크',
    },
    {
      key: 'blockers',
      label: '장애 요인',
      type: 'list',
      required: false,
      description: '진행을 막고 있는 요인',
    },
    {
      key: 'achievements',
      label: '주요 성과',
      type: 'list',
      required: false,
      description: '이번 주의 주요 성과',
    },
    {
      key: 'metrics',
      label: '핵심 지표',
      type: 'table',
      required: false,
      description: '진행률, 완료율 등의 지표',
    },
  ],
  sections: [
    {
      id: 'section-1',
      title: '프로젝트 정보',
      order: 1,
      required: true,
      content: `
프로젝트명: {{projectName}}
보고 주차: {{reportWeek}}
작성일: {{reportDate}}
작성자: {{author}}
      `,
      variables: ['projectName', 'reportWeek', 'reportDate', 'author'],
    },
    {
      id: 'section-2',
      title: '1. 전체 진행 상황',
      order: 2,
      required: true,
      content: `{{overallStatus}}`,
      variables: ['overallStatus'],
    },
    {
      id: 'section-3',
      title: '2. 완료된 작업',
      order: 3,
      required: true,
      content: `{{completedTasks}}`,
      variables: ['completedTasks'],
    },
    {
      id: 'section-4',
      title: '3. 진행 중인 작업',
      order: 4,
      required: true,
      content: `{{inProgressTasks}}`,
      variables: ['inProgressTasks'],
    },
    {
      id: 'section-5',
      title: '4. 다음 주 계획',
      order: 5,
      required: true,
      content: `{{nextWeekTasks}}`,
      variables: ['nextWeekTasks'],
    },
    {
      id: 'section-6',
      title: '5. 주요 성과',
      order: 6,
      required: false,
      content: `{{achievements}}`,
      variables: ['achievements'],
      condition: 'achievements',
    },
    {
      id: 'section-7',
      title: '6. 이슈 및 리스크',
      order: 7,
      required: false,
      content: `{{issues}}`,
      variables: ['issues'],
      condition: 'issues',
    },
    {
      id: 'section-8',
      title: '7. 장애 요인',
      order: 8,
      required: false,
      content: `{{blockers}}`,
      variables: ['blockers'],
      condition: 'blockers',
    },
    {
      id: 'section-9',
      title: '8. 핵심 지표',
      order: 9,
      required: false,
      content: `{{metrics}}`,
      variables: ['metrics'],
      condition: 'metrics',
    },
  ],
};
