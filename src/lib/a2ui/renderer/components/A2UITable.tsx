/**
 * A2UI Table 컴포넌트
 * 데이터 테이블 표시
 */

import { useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { A2UIActionHandler } from '../../types';

/** 테이블 컬럼 정의 */
export interface A2UITableColumn {
  /** 컬럼 키 (데이터 접근용) */
  key: string;
  /** 컬럼 헤더 텍스트 */
  header: string;
  /** 컬럼 너비 */
  width?: string;
  /** 정렬 */
  align?: 'left' | 'center' | 'right';
}

/** 테이블 액션 정의 */
export interface A2UITableAction {
  /** 액션 ID */
  id: string;
  /** 버튼 텍스트 */
  label: string;
  /** 버튼 variant */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  /** 클릭 시 액션 */
  onClick: {
    action: string;
    data?: Record<string, unknown>;
  };
}

export interface A2UITableProps {
  /** 컬럼 정의 */
  columns?: A2UITableColumn[];
  /** 데이터 행 */
  rows?: Record<string, unknown>[];
  /** 행 액션 (각 행에 표시되는 버튼들) */
  actions?: A2UITableAction[];
  /** 빈 상태 메시지 */
  emptyMessage?: string;
  /** 스트라이프 스타일 */
  striped?: boolean;
  /** 호버 효과 */
  hoverable?: boolean;
}

interface Props extends A2UITableProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

export function A2UITable({
  columns = [],
  rows = [],
  actions = [],
  emptyMessage = '데이터가 없습니다.',
  striped = false,
  hoverable = true,
  className,
  onAction,
}: Props) {
  const handleActionClick = useCallback(
    (action: A2UITableAction, rowData: Record<string, unknown>, rowIndex: number) => {
      if (onAction) {
        onAction({
          action: action.onClick.action,
          data: {
            ...action.onClick.data,
            row: rowData,
            rowIndex,
          },
        });
      }
    },
    [onAction]
  );

  if (rows.length === 0) {
    return (
      <div className={cn('rounded-md border p-8 text-center text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                style={{ width: column.width }}
                className={cn(
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.header}
              </TableHead>
            ))}
            {actions.length > 0 && (
              <TableHead className="text-right">액션</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={cn(
                striped && rowIndex % 2 === 1 && 'bg-muted/50',
                hoverable && 'hover:bg-muted/50'
              )}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {String(row[column.key] ?? '')}
                </TableCell>
              ))}
              {actions.length > 0 && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {actions.map((action) => (
                      <Button
                        key={action.id}
                        variant={action.variant || 'ghost'}
                        size="sm"
                        onClick={() => handleActionClick(action, row, rowIndex)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
