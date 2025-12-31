/**
 * A2UI Form Hooks
 *
 * 폼 데이터 바인딩을 위한 훅
 * - 폼 필드 값 읽기/쓰기
 * - 양방향 데이터 바인딩
 */

import { useContext, useCallback } from 'react';
import A2UIFormContext, { type A2UIFormContextValue } from './A2UIFormContext';

/**
 * A2UI Form Context 사용 훅
 */
export function useA2UIForm(): A2UIFormContextValue {
  const context = useContext(A2UIFormContext);

  if (!context) {
    // Context 없이 사용되는 경우 기본값 반환 (인라인 렌더링 등)
    return {
      formData: {},
      getValue: () => undefined,
      setValue: () => {},
      getFormData: () => ({}),
      surfaceId: '',
    };
  }

  return context;
}

/**
 * 특정 필드에 바인딩된 값과 setter 반환
 */
export function useA2UIFormField(bind?: string) {
  const { getValue, setValue } = useA2UIForm();

  const value = bind ? getValue(bind) : undefined;

  const onChange = useCallback(
    (newValue: unknown) => {
      if (bind) {
        setValue(bind, newValue);
      }
    },
    [bind, setValue]
  );

  return { value, onChange };
}
