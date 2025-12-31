/**
 * A2UI Form Context
 *
 * 폼 데이터 바인딩을 위한 컨텍스트
 * - 폼 필드 값 읽기/쓰기
 * - 양방향 데이터 바인딩
 * - 폼 전체 데이터 수집
 */

import { createContext, useCallback, useState, useMemo, type ReactNode } from 'react';

// ============================================================================
// 타입 정의
// ============================================================================

export interface A2UIFormContextValue {
  /** 현재 폼 데이터 */
  formData: Record<string, unknown>;
  /** 특정 필드 값 가져오기 */
  getValue: (path: string) => unknown;
  /** 특정 필드 값 설정 */
  setValue: (path: string, value: unknown) => void;
  /** 전체 폼 데이터 가져오기 */
  getFormData: () => Record<string, unknown>;
  /** Surface ID */
  surfaceId: string;
}

export interface A2UIFormProviderProps {
  /** 자식 컴포넌트 */
  children: ReactNode;
  /** 초기 폼 데이터 */
  initialData?: Record<string, unknown>;
  /** Surface ID */
  surfaceId: string;
  /** 값 변경 시 외부 핸들러 */
  onValueChange?: (path: string, value: unknown) => void;
}

// ============================================================================
// 컨텍스트 생성
// ============================================================================

const A2UIFormContext = createContext<A2UIFormContextValue | null>(null);

// ============================================================================
// Provider 컴포넌트
// ============================================================================

export function A2UIFormProvider({
  children,
  initialData = {},
  surfaceId,
  onValueChange,
}: A2UIFormProviderProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);

  // 특정 필드 값 가져오기
  const getValue = useCallback(
    (path: string): unknown => {
      return formData[path];
    },
    [formData]
  );

  // 특정 필드 값 설정
  const setValue = useCallback(
    (path: string, value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        [path]: value,
      }));

      // 외부 핸들러 호출
      if (onValueChange) {
        onValueChange(path, value);
      }
    },
    [onValueChange]
  );

  // 전체 폼 데이터 가져오기
  const getFormData = useCallback(() => {
    return formData;
  }, [formData]);

  const contextValue = useMemo(
    () => ({
      formData,
      getValue,
      setValue,
      getFormData,
      surfaceId,
    }),
    [formData, getValue, setValue, getFormData, surfaceId]
  );

  return (
    <A2UIFormContext.Provider value={contextValue}>
      {children}
    </A2UIFormContext.Provider>
  );
}

export default A2UIFormContext;
