/**
 * Minu Build 프로젝트 리포트 Excel 생성기
 *
 * 프로젝트 스프린트 현황을 Excel 형식으로 내보내기
 *
 * @module skills/xlsx/generators/projectReport
 */

import type { SheetConfig, ColumnConfig } from '@/types/skills.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 프로젝트 리포트 데이터
 */
export interface ProjectReportData {
  /** 프로젝트명 */
  projectName: string;
  /** 스프린트 번호 */
  sprintNumber: number;
  /** 시작일 (YYYY-MM-DD) */
  startDate: string;
  /** 종료일 (YYYY-MM-DD) */
  endDate: string;
  /** 작업 목록 */
  tasks: TaskData[];
  /** 번다운 데이터 */
  burndown: BurndownData[];
  /** 리소스 할당 데이터 */
  resources: ResourceData[];
}

/**
 * 작업 데이터
 */
export interface TaskData {
  /** 작업 ID */
  id: string;
  /** 작업 제목 */
  title: string;
  /** 작업 상태 */
  status: 'pending' | 'in_progress' | 'completed';
  /** 담당자 */
  assignee: string;
  /** 예상 시간 */
  estimatedHours: number;
  /** 실제 시간 */
  actualHours: number;
}

/**
 * 번다운 차트 데이터
 */
export interface BurndownData {
  /** 날짜 (YYYY-MM-DD) */
  date: string;
  /** 남은 작업량 */
  remaining: number;
  /** 이상적 진행 (기준선) */
  ideal: number;
}

/**
 * 리소스 할당 데이터
 */
export interface ResourceData {
  /** 담당자 이름 */
  name: string;
  /** 할당된 작업 수 */
  taskCount: number;
  /** 완료된 작업 수 */
  completedCount: number;
  /** 생산성 (%) */
  productivity: number;
}

// ============================================================================
// 상태 라벨 상수
// ============================================================================

/**
 * 작업 상태 한글 라벨
 */
const TASK_STATUS_LABELS: Record<TaskData['status'], string> = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
};

// ============================================================================
// 컬럼 설정
// ============================================================================

/**
 * 스프린트 요약 시트 컬럼 설정
 */
export const summaryColumns: ColumnConfig[] = [
  { key: '프로젝트', header: '프로젝트', width: 25 },
  { key: '스프린트', header: '스프린트', width: 15 },
  { key: '시작일', header: '시작일', width: 15 },
  { key: '종료일', header: '종료일', width: 15 },
  { key: '완료율', header: '완료율', width: 12 },
];

/**
 * 작업 목록 시트 컬럼 설정
 */
export const taskColumns: ColumnConfig[] = [
  { key: 'ID', header: 'ID', width: 15 },
  { key: '제목', header: '제목', width: 40 },
  { key: '상태', header: '상태', width: 12 },
  { key: '담당자', header: '담당자', width: 15 },
  { key: '예상 시간', header: '예상 시간 (h)', width: 15, format: 'number' },
  { key: '실제 시간', header: '실제 시간 (h)', width: 15, format: 'number' },
];

/**
 * 번다운 시트 컬럼 설정
 */
export const burndownColumns: ColumnConfig[] = [
  { key: '날짜', header: '날짜', width: 15 },
  { key: '남은 작업', header: '남은 작업', width: 15, format: 'number' },
  { key: '이상적 진행', header: '이상적 진행', width: 15, format: 'number' },
];

/**
 * 리소스 할당 시트 컬럼 설정
 */
export const resourceColumns: ColumnConfig[] = [
  { key: '담당자', header: '담당자', width: 20 },
  { key: '할당 작업', header: '할당 작업', width: 15, format: 'number' },
  { key: '완료 작업', header: '완료 작업', width: 15, format: 'number' },
  { key: '생산성', header: '생산성', width: 12, format: 'percent' },
];

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 완료율 계산
 *
 * @param tasks - 작업 목록
 * @returns 완료율 문자열 (예: "75.0%")
 */
export function calculateCompletionRate(tasks: TaskData[]): string {
  if (tasks.length === 0) {
    return '0.0%';
  }

  const completedCount = tasks.filter(
    (task) => task.status === 'completed'
  ).length;
  const rate = (completedCount / tasks.length) * 100;

  return `${rate.toFixed(1)}%`;
}

// ============================================================================
// 시트 생성 함수
// ============================================================================

/**
 * 프로젝트 리포트 시트 생성
 *
 * 4개 시트 생성:
 * 1. 스프린트 요약 - 프로젝트명, 스프린트번호, 기간, 완료율
 * 2. 작업 목록 - ID, 제목, 상태, 담당자, 예상/실제 시간
 * 3. 번다운 - 날짜, 남은작업, 이상적진행
 * 4. 리소스 할당 - 담당자, 할당작업, 완료작업, 생산성
 *
 * @param data - 프로젝트 리포트 데이터
 * @returns 시트 설정 배열
 *
 * @example
 * ```typescript
 * const reportData: ProjectReportData = {
 *   projectName: 'Minu Build MVP',
 *   sprintNumber: 5,
 *   startDate: '2025-11-18',
 *   endDate: '2025-11-24',
 *   tasks: [
 *     { id: 'TASK-001', title: '로그인 기능', status: 'completed', assignee: '홍길동', estimatedHours: 4, actualHours: 3.5 },
 *   ],
 *   burndown: [
 *     { date: '2025-11-18', remaining: 40, ideal: 40 },
 *     { date: '2025-11-19', remaining: 35, ideal: 32 },
 *   ],
 *   resources: [
 *     { name: '홍길동', taskCount: 5, completedCount: 3, productivity: 85 },
 *   ],
 * };
 *
 * const sheets = generateProjectReportSheets(reportData);
 * // useXlsxExport의 sheets 옵션으로 전달
 * ```
 */
export function generateProjectReportSheets(
  data: ProjectReportData
): SheetConfig[] {
  return [
    // 1. 스프린트 요약 시트
    {
      name: '스프린트 요약',
      data: [
        {
          프로젝트: data.projectName,
          스프린트: `Sprint ${data.sprintNumber}`,
          시작일: data.startDate,
          종료일: data.endDate,
          완료율: calculateCompletionRate(data.tasks),
        },
      ],
      columns: summaryColumns,
    },

    // 2. 작업 목록 시트
    {
      name: '작업 목록',
      data: data.tasks.map((task) => ({
        ID: task.id,
        제목: task.title,
        상태: TASK_STATUS_LABELS[task.status],
        담당자: task.assignee,
        '예상 시간': task.estimatedHours,
        '실제 시간': task.actualHours,
      })),
      columns: taskColumns,
    },

    // 3. 번다운 시트
    {
      name: '번다운',
      data: data.burndown.map((item) => ({
        날짜: item.date,
        '남은 작업': item.remaining,
        '이상적 진행': item.ideal,
      })),
      columns: burndownColumns,
    },

    // 4. 리소스 할당 시트
    {
      name: '리소스 할당',
      data: data.resources.map((resource) => ({
        담당자: resource.name,
        '할당 작업': resource.taskCount,
        '완료 작업': resource.completedCount,
        생산성: `${resource.productivity}%`,
      })),
      columns: resourceColumns,
    },
  ];
}

export default generateProjectReportSheets;
