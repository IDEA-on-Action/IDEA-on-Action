/**
 * A2UI 메인 렌더러
 * 평면 컴포넌트 리스트를 React 트리로 변환
 */

import { useMemo, useCallback } from 'react';
import type { A2UIComponent, A2UIMessage, A2UIRendererProps, A2UIUserAction } from '../types';
import { validateMessage, sanitizeMessage } from '../validator';
import { resolveComponentById, findRootComponents, type ResolveOptions } from './ComponentResolver';
import { cn } from '@/lib/utils';

export function A2UIRenderer({ message, onAction, className }: A2UIRendererProps) {
  // 메시지 검증 및 정화
  const { validMessage, errors } = useMemo(() => {
    const validation = validateMessage(message);

    if (!validation.valid) {
      console.error('[A2UI] 메시지 검증 실패:', validation.errors);
      return { validMessage: null, errors: validation.errors };
    }

    // 경고 로깅
    if (validation.warnings.length > 0) {
      console.warn('[A2UI] 경고:', validation.warnings);
    }

    // 정화된 메시지
    const sanitized = sanitizeMessage(message);
    return { validMessage: sanitized, errors: [] };
  }, [message]);

  // 컴포넌트 맵 생성
  const componentMap = useMemo(() => {
    if (!validMessage) return new Map<string, A2UIComponent>();

    return new Map(
      validMessage.components.map(c => [c.id, c])
    );
  }, [validMessage]);

  // 루트 컴포넌트 찾기
  const rootIds = useMemo(() => {
    if (!validMessage) return [];
    return findRootComponents(validMessage.components);
  }, [validMessage]);

  // 액션 핸들러
  const handleAction = useCallback((action: A2UIUserAction) => {
    console.log('[A2UI] 액션 발생:', action);

    if (onAction) {
      onAction(action);
    }
  }, [onAction]);

  // 검증 실패 시 에러 표시
  if (errors.length > 0 || !validMessage) {
    return (
      <div className={cn('p-4 border border-destructive/50 rounded-lg bg-destructive/10', className)}>
        <p className="text-sm text-destructive font-medium">A2UI 렌더링 오류</p>
        <ul className="mt-2 text-xs text-destructive/80 list-disc list-inside">
          {errors.map((error, i) => (
            <li key={i}>{error.message}</li>
          ))}
        </ul>
      </div>
    );
  }

  // 컴포넌트가 없는 경우
  if (rootIds.length === 0) {
    return null;
  }

  // 렌더링 옵션
  const options: ResolveOptions = {
    onAction: handleAction,
    componentMap,
    renderCache: new Map(),
  };

  return (
    <div
      className={cn('a2ui-surface', className)}
      data-surface-id={validMessage.surfaceId}
    >
      {rootIds.map((rootId) => (
        <div key={rootId}>
          {resolveComponentById(rootId, options)}
        </div>
      ))}
    </div>
  );
}

// 렌더러 인덱스 내보내기
export { A2UIRenderer as default };
