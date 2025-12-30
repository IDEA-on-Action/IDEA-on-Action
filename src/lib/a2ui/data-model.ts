/**
 * A2UI 데이터 모델 관리
 * JSON Pointer 기반 데이터 바인딩
 */

import type { A2UIDataModelUpdate } from './types';

// ============================================================================
// JSON Pointer 유틸리티
// ============================================================================

/**
 * JSON Pointer 경로 파싱
 * @param path JSON Pointer 경로 (예: "/issue/title")
 * @returns 경로 세그먼트 배열
 */
export function parsePath(path: string): string[] {
  if (!path || path === '/') return [];

  // JSON Pointer 이스케이프 처리
  return path
    .split('/')
    .filter(Boolean)
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/**
 * 데이터 모델에서 값 가져오기
 * @param data 데이터 모델
 * @param path JSON Pointer 경로
 * @returns 값 (없으면 undefined)
 */
export function getValue(data: Record<string, unknown>, path: string): unknown {
  const segments = parsePath(path);

  let current: unknown = data;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * 데이터 모델에 값 설정 (불변)
 * @param data 데이터 모델
 * @param path JSON Pointer 경로
 * @param value 새 값
 * @returns 새 데이터 모델
 */
export function setValue(
  data: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const segments = parsePath(path);

  if (segments.length === 0) {
    // 루트 교체
    return typeof value === 'object' && value !== null
      ? { ...value as Record<string, unknown> }
      : data;
  }

  // 불변 업데이트
  const result = { ...data };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const next = current[segment];

    if (typeof next === 'object' && next !== null) {
      current[segment] = Array.isArray(next) ? [...next] : { ...next };
    } else {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }

  const lastSegment = segments[segments.length - 1];
  current[lastSegment] = value;

  return result;
}

/**
 * 데이터 모델에서 값 삭제 (불변)
 * @param data 데이터 모델
 * @param path JSON Pointer 경로
 * @returns 새 데이터 모델
 */
export function removeValue(
  data: Record<string, unknown>,
  path: string
): Record<string, unknown> {
  const segments = parsePath(path);

  if (segments.length === 0) {
    return {};
  }

  // 불변 업데이트
  const result = { ...data };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const next = current[segment];

    if (typeof next === 'object' && next !== null) {
      current[segment] = Array.isArray(next) ? [...next] : { ...next };
      current = current[segment] as Record<string, unknown>;
    } else {
      // 경로가 존재하지 않음
      return result;
    }
  }

  const lastSegment = segments[segments.length - 1];
  delete current[lastSegment];

  return result;
}

// ============================================================================
// 데이터 모델 업데이트 적용
// ============================================================================

/**
 * 데이터 모델 업데이트 적용
 * @param data 현재 데이터 모델
 * @param update 업데이트 정보
 * @returns 새 데이터 모델
 */
export function applyUpdate(
  data: Record<string, unknown>,
  update: Omit<A2UIDataModelUpdate, 'surfaceId'>
): Record<string, unknown> {
  switch (update.op) {
    case 'replace':
    case 'add':
      return setValue(data, update.path, update.value);

    case 'remove':
      return removeValue(data, update.path);

    default:
      return data;
  }
}

/**
 * 여러 업데이트 적용
 * @param data 현재 데이터 모델
 * @param updates 업데이트 배열
 * @returns 새 데이터 모델
 */
export function applyUpdates(
  data: Record<string, unknown>,
  updates: Array<Omit<A2UIDataModelUpdate, 'surfaceId'>>
): Record<string, unknown> {
  return updates.reduce((acc, update) => applyUpdate(acc, update), data);
}

// ============================================================================
// 데이터 바인딩 유틸리티
// ============================================================================

/**
 * 바인딩 경로에서 값 추출
 * @param data 데이터 모델
 * @param bind 바인딩 경로 문자열 (예: "/issue/title")
 * @returns 바인딩된 값
 */
export function resolveBind(data: Record<string, unknown>, bind: string): unknown {
  return getValue(data, bind);
}

/**
 * 컴포넌트 속성에서 바인딩 해결
 * @param props 컴포넌트 속성
 * @param data 데이터 모델
 * @param bindableProps 바인딩 가능한 속성 목록
 * @returns 바인딩이 해결된 속성
 */
export function resolveBindings(
  props: Record<string, unknown>,
  data: Record<string, unknown>,
  bindableProps: string[] = []
): Record<string, unknown> {
  const result = { ...props };

  for (const prop of bindableProps) {
    const bindKey = `${prop}Bind`;
    const bindPath = props[bindKey];

    if (typeof bindPath === 'string') {
      const value = resolveBind(data, bindPath);
      if (value !== undefined) {
        result[prop] = value;
      }
      // 바인딩 키 제거
      delete result[bindKey];
    }
  }

  // bind 속성 처리 (단일 바인딩)
  if (typeof props.bind === 'string') {
    const value = resolveBind(data, props.bind);
    if (value !== undefined) {
      result.value = value;
    }
    delete result.bind;
  }

  return result;
}
