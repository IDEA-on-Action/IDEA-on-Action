/**
 * A2UI 스트리밍 훅
 * 컴포넌트를 점진적으로 추가하며 스트리밍 상태를 관리
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { A2UIComponent, A2UIMessage } from '../types';

export interface StreamingState {
  /** 현재까지 스트리밍된 컴포넌트 */
  components: A2UIComponent[];
  /** 스트리밍 진행 중 여부 */
  isStreaming: boolean;
  /** 스트리밍 완료 여부 */
  isComplete: boolean;
  /** 현재 스트리밍 중인 컴포넌트 ID */
  currentComponentId: string | null;
  /** 스트리밍 진행률 (0-100) */
  progress: number;
}

export interface UseA2UIStreamingOptions {
  /** 컴포넌트 추가 간격 (ms) */
  interval?: number;
  /** 자동 시작 여부 */
  autoStart?: boolean;
  /** 스트리밍 완료 콜백 */
  onComplete?: () => void;
  /** 컴포넌트 추가 콜백 */
  onComponentAdded?: (component: A2UIComponent) => void;
}

export interface UseA2UIStreamingReturn {
  /** 현재 스트리밍 상태 */
  state: StreamingState;
  /** 스트리밍된 메시지 */
  streamedMessage: A2UIMessage | null;
  /** 스트리밍 시작 */
  start: (message: A2UIMessage) => void;
  /** 스트리밍 일시정지 */
  pause: () => void;
  /** 스트리밍 재개 */
  resume: () => void;
  /** 스트리밍 중지 (리셋) */
  stop: () => void;
  /** 즉시 완료 (모든 컴포넌트 표시) */
  complete: () => void;
  /** 컴포넌트 수동 추가 */
  addComponent: (component: A2UIComponent) => void;
  /** 컴포넌트 업데이트 */
  updateComponent: (id: string, updates: Partial<A2UIComponent>) => void;
}

const initialState: StreamingState = {
  components: [],
  isStreaming: false,
  isComplete: false,
  currentComponentId: null,
  progress: 0,
};

export function useA2UIStreaming(
  options: UseA2UIStreamingOptions = {}
): UseA2UIStreamingReturn {
  const {
    interval = 100,
    autoStart = false,
    onComplete,
    onComponentAdded,
  } = options;

  const [state, setState] = useState<StreamingState>(initialState);
  const [streamedMessage, setStreamedMessage] = useState<A2UIMessage | null>(null);

  const fullMessageRef = useRef<A2UIMessage | null>(null);
  const indexRef = useRef(0);
  const timerRef = useRef<number>();
  const isPausedRef = useRef(false);

  // 스트리밍 시작
  const start = useCallback((message: A2UIMessage) => {
    // 리셋
    fullMessageRef.current = message;
    indexRef.current = 0;
    isPausedRef.current = false;

    setState({
      components: [],
      isStreaming: true,
      isComplete: false,
      currentComponentId: null,
      progress: 0,
    });

    setStreamedMessage({
      ...message,
      components: [],
    });

    // 첫 번째 컴포넌트 추가
    const addNext = () => {
      if (!fullMessageRef.current || isPausedRef.current) return;

      const components = fullMessageRef.current.components;
      if (indexRef.current < components.length) {
        const component = components[indexRef.current];
        indexRef.current++;

        setState((prev) => {
          const newComponents = [...prev.components, component];
          const progress = Math.round((newComponents.length / components.length) * 100);

          return {
            ...prev,
            components: newComponents,
            currentComponentId: component.id,
            progress,
          };
        });

        setStreamedMessage((prev) =>
          prev
            ? {
                ...prev,
                components: [...prev.components, component],
              }
            : null
        );

        onComponentAdded?.(component);

        // 다음 컴포넌트 예약
        if (indexRef.current < components.length) {
          timerRef.current = window.setTimeout(addNext, interval);
        } else {
          // 완료
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            isComplete: true,
            currentComponentId: null,
          }));
          onComplete?.();
        }
      }
    };

    timerRef.current = window.setTimeout(addNext, interval);
  }, [interval, onComplete, onComponentAdded]);

  // 일시정지
  const pause = useCallback(() => {
    isPausedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  // 재개
  const resume = useCallback(() => {
    if (!fullMessageRef.current || state.isComplete) return;

    isPausedRef.current = false;
    setState((prev) => ({ ...prev, isStreaming: true }));

    const addNext = () => {
      if (!fullMessageRef.current || isPausedRef.current) return;

      const components = fullMessageRef.current.components;
      if (indexRef.current < components.length) {
        const component = components[indexRef.current];
        indexRef.current++;

        setState((prev) => {
          const newComponents = [...prev.components, component];
          const progress = Math.round((newComponents.length / components.length) * 100);

          return {
            ...prev,
            components: newComponents,
            currentComponentId: component.id,
            progress,
          };
        });

        setStreamedMessage((prev) =>
          prev
            ? {
                ...prev,
                components: [...prev.components, component],
              }
            : null
        );

        onComponentAdded?.(component);

        if (indexRef.current < components.length) {
          timerRef.current = window.setTimeout(addNext, interval);
        } else {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            isComplete: true,
            currentComponentId: null,
          }));
          onComplete?.();
        }
      }
    };

    timerRef.current = window.setTimeout(addNext, interval);
  }, [state.isComplete, interval, onComplete, onComponentAdded]);

  // 중지 (리셋)
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    fullMessageRef.current = null;
    indexRef.current = 0;
    isPausedRef.current = false;
    setState(initialState);
    setStreamedMessage(null);
  }, []);

  // 즉시 완료
  const complete = useCallback(() => {
    if (!fullMessageRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const components = fullMessageRef.current.components;

    setState({
      components,
      isStreaming: false,
      isComplete: true,
      currentComponentId: null,
      progress: 100,
    });

    setStreamedMessage({
      ...fullMessageRef.current,
      components,
    });

    onComplete?.();
  }, [onComplete]);

  // 컴포넌트 수동 추가
  const addComponent = useCallback((component: A2UIComponent) => {
    setState((prev) => ({
      ...prev,
      components: [...prev.components, component],
    }));

    setStreamedMessage((prev) =>
      prev
        ? {
            ...prev,
            components: [...prev.components, component],
          }
        : null
    );

    onComponentAdded?.(component);
  }, [onComponentAdded]);

  // 컴포넌트 업데이트
  const updateComponent = useCallback(
    (id: string, updates: Partial<A2UIComponent>) => {
      setState((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));

      setStreamedMessage((prev) =>
        prev
          ? {
              ...prev,
              components: prev.components.map((c) =>
                c.id === id ? { ...c, ...updates } : c
              ),
            }
          : null
      );
    },
    []
  );

  // 클린업
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    state,
    streamedMessage,
    start,
    pause,
    resume,
    stop,
    complete,
    addComponent,
    updateComponent,
  };
}
