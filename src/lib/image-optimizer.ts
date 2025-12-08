/**
 * Image Optimization Utilities
 *
 * 이미지 최적화를 위한 유틸리티 함수들을 제공합니다.
 * WebP 변환, 이미지 압축, Lazy loading 등을 지원합니다.
 *
 * @module lib/image-optimizer
 * @version 2.34.0
 */

/**
 * 이미지 포맷 타입
 */
export type ImageFormat = 'webp' | 'jpeg' | 'png';

/**
 * 이미지 최적화 옵션
 */
export interface ImageOptimizationOptions {
  /** 출력 포맷 (기본값: 'webp') */
  format?: ImageFormat;
  /** 품질 (0-1, 기본값: 0.85) */
  quality?: number;
  /** 최대 너비 (px) */
  maxWidth?: number;
  /** 최대 높이 (px) */
  maxHeight?: number;
}

/**
 * 이미지 URL을 최적화된 포맷으로 변환합니다.
 *
 * @param url - 원본 이미지 URL
 * @param options - 최적화 옵션
 * @returns 최적화된 이미지 URL (WebP 지원 시)
 *
 * @example
 * ```tsx
 * const optimizedUrl = getOptimizedImageUrl('/images/hero.png', {
 *   format: 'webp',
 *   quality: 0.85,
 *   maxWidth: 1920
 * });
 * ```
 */
export function getOptimizedImageUrl(
  url: string,
  options: ImageOptimizationOptions = {}
): string {
  const { format = 'webp', quality = 0.85, maxWidth, maxHeight } = options;

  // WebP 지원 여부 확인
  const supportsWebP = checkWebPSupport();

  // WebP를 지원하지 않으면 원본 URL 반환
  if (format === 'webp' && !supportsWebP) {
    return url;
  }

  // Supabase Storage URL인 경우 변환 파라미터 추가
  if (url.includes('supabase.co/storage')) {
    const params = new URLSearchParams();

    if (maxWidth) params.append('width', maxWidth.toString());
    if (maxHeight) params.append('height', maxHeight.toString());
    if (format === 'webp') params.append('format', 'webp');
    if (quality !== 0.85) params.append('quality', Math.round(quality * 100).toString());

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  // 로컬 이미지는 원본 URL 반환 (빌드 시 vite가 처리)
  return url;
}

/**
 * 브라우저의 WebP 지원 여부를 확인합니다.
 * 결과는 메모이제이션됩니다.
 *
 * @returns WebP 지원 여부
 */
let webpSupportCache: boolean | null = null;

export function checkWebPSupport(): boolean {
  if (webpSupportCache !== null) {
    return webpSupportCache;
  }

  // SSR 환경에서는 false 반환
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  // Canvas를 사용한 WebP 지원 감지
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const supported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    webpSupportCache = supported;
    return supported;
  } catch {
    webpSupportCache = false;
    return false;
  }
}

/**
 * 이미지 Lazy Loading을 위한 Intersection Observer 생성
 *
 * @param callback - 이미지가 뷰포트에 진입했을 때 실행할 콜백
 * @param options - Intersection Observer 옵션
 * @returns Intersection Observer 인스턴스
 *
 * @example
 * ```tsx
 * const observer = createLazyLoadObserver((entry) => {
 *   const img = entry.target as HTMLImageElement;
 *   img.src = img.dataset.src || '';
 * });
 *
 * observer.observe(imageElement);
 * ```
 */
export function createLazyLoadObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px', // 뷰포트 50px 전에 로딩 시작
    threshold: 0.01,
    ...options,
  };

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, defaultOptions);
}

/**
 * 이미지를 리사이즈합니다 (클라이언트 사이드).
 *
 * @param file - 원본 이미지 파일
 * @param options - 최적화 옵션
 * @returns 리사이즈된 이미지 Blob
 *
 * @example
 * ```tsx
 * const resizedBlob = await resizeImage(file, {
 *   maxWidth: 1920,
 *   maxHeight: 1080,
 *   quality: 0.85
 * });
 * ```
 */
export async function resizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<Blob> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.85, format = 'webp' } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // 비율 유지하며 리사이즈
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 이미지 그리기
      ctx.drawImage(img, 0, 0, width, height);

      // Blob으로 변환
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        format === 'webp' ? 'image/webp' : `image/${format}`,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * 이미지의 실제 크기를 가져옵니다.
 *
 * @param url - 이미지 URL
 * @returns 이미지의 너비와 높이
 *
 * @example
 * ```tsx
 * const { width, height } = await getImageDimensions('/images/hero.png');
 * console.log(`Image size: ${width}x${height}`);
 * ```
 */
export async function getImageDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * srcset 속성을 생성합니다.
 * 반응형 이미지를 위한 여러 크기의 이미지 URL을 생성합니다.
 *
 * @param url - 원본 이미지 URL
 * @param sizes - 생성할 이미지 크기 배열
 * @param options - 최적화 옵션
 * @returns srcset 문자열
 *
 * @example
 * ```tsx
 * const srcset = generateSrcSet('/images/hero.png', [640, 1280, 1920]);
 * // 결과: "/images/hero.png?width=640 640w, /images/hero.png?width=1280 1280w, ..."
 * ```
 */
export function generateSrcSet(
  url: string,
  sizes: number[] = [640, 1280, 1920],
  options: ImageOptimizationOptions = {}
): string {
  return sizes
    .map((size) => {
      const optimizedUrl = getOptimizedImageUrl(url, {
        ...options,
        maxWidth: size,
      });
      return `${optimizedUrl} ${size}w`;
    })
    .join(', ');
}

/**
 * 이미지 프리로딩을 위한 함수
 *
 * @param urls - 프리로드할 이미지 URL 배열
 * @returns 모든 이미지 로딩 완료 Promise
 *
 * @example
 * ```tsx
 * await preloadImages(['/images/hero.png', '/images/logo.png']);
 * console.log('All images loaded');
 * ```
 */
export async function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        })
    )
  );
}

/**
 * 이미지 파일 크기를 확인합니다.
 *
 * @param file - 확인할 이미지 파일
 * @param maxSizeMB - 최대 허용 크기 (MB)
 * @returns 크기 초과 여부
 *
 * @example
 * ```tsx
 * const isValid = checkImageSize(file, 5); // 5MB 제한
 * if (!isValid) {
 *   alert('파일 크기가 너무 큽니다.');
 * }
 * ```
 */
export function checkImageSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * 이미지 파일 타입을 확인합니다.
 *
 * @param file - 확인할 파일
 * @param allowedTypes - 허용할 MIME 타입 배열
 * @returns 허용된 타입 여부
 *
 * @example
 * ```tsx
 * const isValid = checkImageType(file, ['image/jpeg', 'image/png', 'image/webp']);
 * ```
 */
export function checkImageType(
  file: File,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
): boolean {
  return allowedTypes.includes(file.type);
}
