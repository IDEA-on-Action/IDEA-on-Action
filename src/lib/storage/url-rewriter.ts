/**
 * Storage URL Rewriter
 * Supabase Storage → Cloudflare R2 URL 변환 유틸리티
 *
 * 마이그레이션 기간 동안 기존 Supabase URL을 R2 URL로 자동 변환
 */

// URL 패턴
const SUPABASE_STORAGE_PATTERN = /https:\/\/zykjdneewbzyazfukzyg\.supabase\.co\/storage\/v1\/object\/(public|sign)\/([^?]+)/;
const R2_BASE_URL = 'https://media.ideaonaction.ai';

// 버킷 매핑 (Supabase → R2 경로)
const BUCKET_MAPPING: Record<string, string> = {
  'media-library': 'media-library',
  'avatars': 'avatars',
  'documents': 'documents',
  'uploads': 'uploads',
  'rag-documents': 'rag-documents',
};

/**
 * Supabase Storage URL을 R2 URL로 변환
 *
 * @example
 * ```ts
 * // Before
 * const supabaseUrl = 'https://zykjdneewbzyazfukzyg.supabase.co/storage/v1/object/public/media-library/images/photo.jpg';
 *
 * // After
 * const r2Url = rewriteStorageUrl(supabaseUrl);
 * // 'https://media.ideaonaction.ai/media-library/images/photo.jpg'
 * ```
 */
export function rewriteStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // 이미 R2 URL인 경우 그대로 반환
  if (url.startsWith(R2_BASE_URL)) {
    return url;
  }

  // Supabase Storage URL 패턴 매칭
  const match = url.match(SUPABASE_STORAGE_PATTERN);
  if (!match) {
    // Supabase URL이 아닌 경우 원본 반환
    return url;
  }

  const path = match[2]; // 버킷/경로
  const parts = path.split('/');
  const bucket = parts[0];

  // 버킷 매핑 적용
  const r2Bucket = BUCKET_MAPPING[bucket] || bucket;
  const r2Path = [r2Bucket, ...parts.slice(1)].join('/');

  return `${R2_BASE_URL}/${r2Path}`;
}

/**
 * 이미지 URL에 R2 변환 옵션 추가
 *
 * @example
 * ```ts
 * // 썸네일 생성
 * const thumbnailUrl = getImageVariant(url, { width: 200, height: 200, fit: 'cover' });
 * // 'https://media.ideaonaction.ai/media-library/images/photo.jpg?width=200&height=200&fit=cover'
 * ```
 */
export function getImageVariant(
  url: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'scale-down' | 'crop';
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
  }
): string | null {
  const rewrittenUrl = rewriteStorageUrl(url);
  if (!rewrittenUrl) return null;

  const urlObj = new URL(rewrittenUrl);

  if (options.width) urlObj.searchParams.set('width', String(options.width));
  if (options.height) urlObj.searchParams.set('height', String(options.height));
  if (options.fit) urlObj.searchParams.set('fit', options.fit);
  if (options.quality) urlObj.searchParams.set('quality', String(options.quality));
  if (options.format) urlObj.searchParams.set('format', options.format);

  return urlObj.toString();
}

/**
 * 객체 내 모든 URL 필드를 변환
 *
 * @example
 * ```ts
 * const data = {
 *   avatar_url: 'https://zykjdneewbzyazfukzyg.supabase.co/storage/v1/object/public/avatars/user.jpg',
 *   cover_image: 'https://zykjdneewbzyazfukzyg.supabase.co/storage/v1/object/public/media-library/covers/bg.png',
 * };
 *
 * const rewritten = rewriteObjectUrls(data, ['avatar_url', 'cover_image']);
 * // { avatar_url: 'https://media.ideaonaction.ai/avatars/user.jpg', ... }
 * ```
 */
export function rewriteObjectUrls<T extends Record<string, unknown>>(
  obj: T,
  urlFields: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of urlFields) {
    const value = obj[field];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[field as string] = rewriteStorageUrl(value);
    }
  }

  return result;
}

/**
 * 배열 내 모든 객체의 URL 필드를 변환
 */
export function rewriteArrayUrls<T extends Record<string, unknown>>(
  arr: T[],
  urlFields: (keyof T)[]
): T[] {
  return arr.map((item) => rewriteObjectUrls(item, urlFields));
}

/**
 * R2 URL인지 확인
 */
export function isR2Url(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith(R2_BASE_URL);
}

/**
 * Supabase Storage URL인지 확인
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return SUPABASE_STORAGE_PATTERN.test(url);
}

/**
 * 스토리지 URL 상태 확인
 */
export function getStorageUrlStatus(url: string | null | undefined): 'r2' | 'supabase' | 'external' | 'none' {
  if (!url) return 'none';
  if (isR2Url(url)) return 'r2';
  if (isSupabaseStorageUrl(url)) return 'supabase';
  return 'external';
}

// React Hook용 래퍼 (useCallback 없이 사용 가능)
export const storageUrlUtils = {
  rewrite: rewriteStorageUrl,
  getVariant: getImageVariant,
  rewriteObject: rewriteObjectUrls,
  rewriteArray: rewriteArrayUrls,
  isR2: isR2Url,
  isSupabase: isSupabaseStorageUrl,
  getStatus: getStorageUrlStatus,
} as const;

export default storageUrlUtils;
