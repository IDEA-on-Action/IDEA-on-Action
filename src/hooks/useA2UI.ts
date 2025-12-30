/**
 * A2UI 상태 관리 훅
 *
 * Surface별 상태와 데이터 모델을 관리합니다.
 */

import { useState, useCallback, useMemo } from 'react';
import type { A2UIMessage, A2UISurface, A2UISurfaceType, A2UIUserAction, A2UIActionHandler } from '@/lib/a2ui/types';
import { applyUpdate } from '@/lib/a2ui/data-model';

// ============================================================================
// 타입 정의
// ============================================================================

/** 사이드 패널 상태 */
export interface SidePanelState {
  /** 열림 여부 */
  isOpen: boolean;
  /** A2UI 메시지 */
  message: A2UIMessage | null;
  /** 패널 제목 */
  title: string;
  /** 패널 크기 */
  size: 'sm' | 'md' | 'lg' | 'xl';
}

export interface UseA2UIOptions {
  /** 초기 메시지 */
  initialMessages?: A2UIMessage[];
  /** 액션 핸들러 */
  onAction?: A2UIActionHandler;
}

export interface UseA2UIReturn {
  /** Surface 맵 */
  surfaces: Map<string, A2UISurface>;
  /** 메시지 추가 */
  addMessage: (message: A2UIMessage, surfaceType?: A2UISurfaceType) => void;
  /** 데이터 모델 업데이트 */
  updateData: (surfaceId: string, path: string, value: unknown) => void;
  /** Surface 제거 */
  removeSurface: (surfaceId: string) => void;
  /** 모든 Surface 초기화 */
  clearAll: () => void;
  /** 액션 핸들러 */
  handleAction: A2UIActionHandler;
  /** 사이드 패널 상태 */
  sidePanel: SidePanelState;
  /** 사이드 패널 열기 */
  openSidePanel: (message: A2UIMessage, title?: string, size?: SidePanelState['size']) => void;
  /** 사이드 패널 닫기 */
  closeSidePanel: () => void;
}

// ============================================================================
// 훅 구현
// ============================================================================

export function useA2UI(options: UseA2UIOptions = {}): UseA2UIReturn {
  const { initialMessages = [], onAction } = options;

  // 사이드 패널 상태
  const [sidePanel, setSidePanel] = useState<SidePanelState>({
    isOpen: false,
    message: null,
    title: '상세 정보',
    size: 'md',
  });

  // Surface 상태
  const [surfaces, setSurfaces] = useState<Map<string, A2UISurface>>(() => {
    const map = new Map<string, A2UISurface>();

    for (const message of initialMessages) {
      map.set(message.surfaceId, {
        surfaceId: message.surfaceId,
        type: 'inline',
        catalogId: message.catalogId || 'ideaonaction-chat-v1',
        components: message.components,
        data: message.data || {},
      });
    }

    return map;
  });

  // 사이드 패널 열기
  const openSidePanel = useCallback(
    (message: A2UIMessage, title?: string, size?: SidePanelState['size']) => {
      setSidePanel({
        isOpen: true,
        message,
        title: title || '상세 정보',
        size: size || 'md',
      });
    },
    []
  );

  // 사이드 패널 닫기
  const closeSidePanel = useCallback(() => {
    setSidePanel((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // 메시지 추가 (Surface 생성/업데이트)
  const addMessage = useCallback(
    (message: A2UIMessage, surfaceType: A2UISurfaceType = 'inline') => {
      // 사이드 패널로 렌더링하는 경우
      if (surfaceType === 'sidePanel') {
        const title = (message.data?.title as string) || '상세 정보';
        const size = (message.data?.size as SidePanelState['size']) || 'md';
        openSidePanel(message, title, size);
        return;
      }

      // 인라인 Surface로 추가
      setSurfaces((prev) => {
        const next = new Map(prev);

        // 기존 Surface 업데이트 또는 새로 생성
        const existing = next.get(message.surfaceId);

        next.set(message.surfaceId, {
          surfaceId: message.surfaceId,
          type: surfaceType,
          catalogId: message.catalogId || existing?.catalogId || 'ideaonaction-chat-v1',
          components: message.components,
          data: {
            ...(existing?.data || {}),
            ...(message.data || {}),
          },
        });

        return next;
      });
    },
    [openSidePanel]
  );

  // 데이터 모델 업데이트
  const updateData = useCallback((surfaceId: string, path: string, value: unknown) => {
    setSurfaces((prev) => {
      const surface = prev.get(surfaceId);
      if (!surface) {
        console.warn(`[useA2UI] Surface를 찾을 수 없습니다: ${surfaceId}`);
        return prev;
      }

      const next = new Map(prev);
      const updatedData = applyUpdate(surface.data, { path, op: 'replace', value });

      next.set(surfaceId, {
        ...surface,
        data: updatedData,
      });

      return next;
    });
  }, []);

  // Surface 제거
  const removeSurface = useCallback((surfaceId: string) => {
    setSurfaces((prev) => {
      const next = new Map(prev);
      next.delete(surfaceId);
      return next;
    });
  }, []);

  // 모든 Surface 초기화
  const clearAll = useCallback(() => {
    setSurfaces(new Map());
  }, []);

  // 액션 핸들러
  const handleAction = useCallback((action: A2UIUserAction) => {
    console.log('[useA2UI] 액션:', action);

    // 외부 핸들러 호출
    if (onAction) {
      onAction(action);
    }

    // 기본 액션 처리
    switch (action.action) {
      case 'dismiss':
        if (action.componentId) {
          // 특정 Surface 닫기 (surfaceId가 componentId에 포함된 경우)
          const surfaceId = action.data?.surfaceId as string;
          if (surfaceId) {
            removeSurface(surfaceId);
          }
        }
        break;

      case 'refresh':
        // 새로고침 로직 (필요시 구현)
        break;

      default:
        // 다른 액션은 외부 핸들러에서 처리
        break;
    }
  }, [onAction, removeSurface]);

  return useMemo(
    () => ({
      surfaces,
      addMessage,
      updateData,
      removeSurface,
      clearAll,
      handleAction,
      sidePanel,
      openSidePanel,
      closeSidePanel,
    }),
    [surfaces, addMessage, updateData, removeSurface, clearAll, handleAction, sidePanel, openSidePanel, closeSidePanel]
  );
}

export default useA2UI;
