/**
 * Storage URL Hook
 *
 * Supabase Storage URL을 R2 URL로 자동 변환하는 훅
 * 마이그레이션 기간 동안 호환성 유지를 위해 사용
 *
 * @example
 * const { url, thumbnailUrl, status } = useStorageUrl(supabaseUrl);
 * const { url: optimizedUrl } = useStorageUrl(url, { width: 400, format: 'webp' });
 */

import { useMemo } from 'react';
import {
  rewriteStorageUrl,
  getImageVariant,
  getStorageUrlStatus,
  isR2Url,
  isSupabaseStorageUrl,
} from '@/lib/storage/url-rewriter';

// =====================================================
// Types
// =====================================================

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'scale-down' | 'crop';
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}

export type StorageUrlStatus = 'r2' | 'supabase' | 'external' | 'none';

export interface UseStorageUrlResult {
  /** 변환된 URL (R2 또는 원본) */
  url: string | null;
  /** 원본 URL */
  originalUrl: string | null;
  /** URL 상태 */
  status: StorageUrlStatus;
  /** R2 URL 여부 */
  isR2: boolean;
  /** Supabase Storage URL 여부 */
  isSupabase: boolean;
  /** 변환 발생 여부 */
  wasRewritten: boolean;
}

// =====================================================
// Main Hook
// =====================================================

/**
 * 스토리지 URL 변환 훅
 *
 * @param url - 원본 URL (Supabase Storage 또는 R2)
 * @param options - 이미지 변환 옵션 (선택)
 * @returns 변환된 URL 및 상태 정보
 */
export function useStorageUrl(
  url: string | null | undefined,
  options?: ImageTransformOptions
): UseStorageUrlResult {
  const width = options?.width;
  const height = options?.height;
  const fit = options?.fit;
  const quality = options?.quality;
  const format = options?.format;

  return useMemo(() => {
    if (!url) {
      return {
        url: null,
        originalUrl: null,
        status: 'none' as const,
        isR2: false,
        isSupabase: false,
        wasRewritten: false,
      };
    }

    const urlStatus = getStorageUrlStatus(url);
    const wasSupabase = urlStatus === 'supabase';

    // 이미지 변환 옵션이 있으면 적용
    const hasOptions = width || height || fit || quality || format;
    const rewrittenUrl = hasOptions
      ? getImageVariant(url, { width, height, fit, quality, format })
      : rewriteStorageUrl(url);

    const finalStatus = getStorageUrlStatus(rewrittenUrl);

    return {
      url: rewrittenUrl,
      originalUrl: url,
      status: finalStatus,
      isR2: finalStatus === 'r2',
      isSupabase: finalStatus === 'supabase',
      wasRewritten: wasSupabase && finalStatus === 'r2',
    };
  }, [url, width, height, fit, quality, format]);
}

// =====================================================
// Convenience Hooks
// =====================================================

/**
 * 썸네일 URL 훅
 */
export function useThumbnailUrl(
  url: string | null | undefined,
  size: number = 200
): string | null {
  const result = useStorageUrl(url, {
    width: size,
    height: size,
    fit: 'cover',
    format: 'webp',
  });
  return result.url;
}

/**
 * 최적화된 이미지 URL 훅
 */
export function useOptimizedImageUrl(
  url: string | null | undefined,
  width?: number,
  quality: number = 80
): string | null {
  const result = useStorageUrl(url, {
    width,
    quality,
    format: 'webp',
  });
  return result.url;
}

/**
 * 아바타 URL 훅 (원형 프로필 이미지)
 */
export function useAvatarUrl(
  url: string | null | undefined,
  size: number = 80
): string | null {
  const result = useStorageUrl(url, {
    width: size,
    height: size,
    fit: 'cover',
    format: 'webp',
    quality: 85,
  });
  return result.url;
}

/**
 * 커버 이미지 URL 훅 (배너/헤더 이미지)
 */
export function useCoverImageUrl(
  url: string | null | undefined,
  width: number = 1200
): string | null {
  const result = useStorageUrl(url, {
    width,
    fit: 'cover',
    format: 'webp',
    quality: 85,
  });
  return result.url;
}

// =====================================================
// Batch Processing Hooks
// =====================================================

/**
 * 여러 URL 일괄 변환 훅
 */
export function useStorageUrls(urls: (string | null | undefined)[]): (string | null)[] {
  const urlsKey = urls.join(',');
  return useMemo(() => {
    return urls.map((url) => rewriteStorageUrl(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey]);
}

/**
 * 객체의 URL 필드들을 일괄 변환하는 훅
 */
export function useRewrittenObject<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  urlFields: (keyof T)[]
): T | null {
  const fieldsKey = urlFields.join(',');
  return useMemo(() => {
    if (!obj) return null;

    const result = { ...obj };
    for (const field of urlFields) {
      const value = obj[field];
      if (typeof value === 'string') {
        (result as Record<string, unknown>)[field as string] = rewriteStorageUrl(value);
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj, fieldsKey]);
}

// =====================================================
// Export Utils for Direct Use
// =====================================================

export {
  rewriteStorageUrl,
  getImageVariant,
  getStorageUrlStatus,
  isR2Url,
  isSupabaseStorageUrl,
};

export default useStorageUrl;
