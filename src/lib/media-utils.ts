/**
 * Media Utility Functions
 *
 * CMS Phase 5 - Helper functions for media operations
 *
 * Note: R2 마이그레이션 진행 중
 * - Supabase URL → R2 URL 자동 변환 지원
 * - 새 업로드는 useR2Storage 사용 권장
 */

import { getImageVariant as r2ImageVariant } from '@/lib/storage/url-rewriter';

// =====================================================
// Constants
// =====================================================

export const MEDIA_BUCKET = 'media-library';

// R2 Public URL
export const R2_PUBLIC_URL = 'https://media.ideaonaction.ai';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// =====================================================
// URL Functions
// =====================================================

/**
 * Get public URL for a storage path
 * R2 URL 반환 (Supabase 완전 마이그레이션 완료)
 */
export function getMediaPublicUrl(storagePath: string, _useR2 = true): string {
  // R2 URL 직접 생성 (Supabase 제거)
  return `${R2_PUBLIC_URL}/${MEDIA_BUCKET}/${storagePath}`;
}

/**
 * 모든 스토리지 URL을 R2 URL로 변환
 * Supabase URL도 자동으로 R2 URL로 변환됨
 */
export function normalizeStorageUrl(url: string | null | undefined): string | null {
  return rewriteStorageUrl(url);
}

/**
 * Get thumbnail URL (if exists) or original URL
 */
export function getMediaThumbnailUrl(
  storagePath: string,
  thumbnailPath?: string | null
): string {
  if (thumbnailPath) {
    return getMediaPublicUrl(thumbnailPath);
  }
  return getMediaPublicUrl(storagePath);
}

/**
 * Generate image transform URL (R2 또는 Supabase)
 * R2: Cloudflare Image Resizing 사용
 * Supabase: Storage Image Transformations 사용
 */
export function getMediaTransformUrl(
  storagePath: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png' | 'avif' | 'jpeg';
    resize?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'crop';
  } = {},
  useR2 = true
): string {
  const { width, height, quality = 80, format, resize = 'cover' } = options;

  if (useR2) {
    // R2 URL with Cloudflare Image Resizing
    const baseUrl = `${R2_PUBLIC_URL}/${MEDIA_BUCKET}/${storagePath}`;
    return r2ImageVariant(baseUrl, {
      width,
      height,
      quality,
      format: format === 'jpg' ? 'jpeg' : format as 'webp' | 'avif' | 'jpeg' | 'png' | undefined,
      fit: resize === 'fill' ? 'cover' : resize as 'contain' | 'cover' | 'scale-down' | 'crop' | undefined,
    }) || baseUrl;
  }

  // 레거시 Supabase Storage Transform
  const transforms: string[] = [];
  if (width) transforms.push(`width=${width}`);
  if (height) transforms.push(`height=${height}`);
  if (quality) transforms.push(`quality=${quality}`);
  if (format) transforms.push(`format=${format}`);
  if (resize) transforms.push(`resize=${resize}`);

  const baseUrl = getMediaPublicUrl(storagePath, false);

  if (transforms.length === 0) {
    return baseUrl;
  }

  return `${baseUrl}?${transforms.join('&')}`;
}

// =====================================================
// Validation Functions
// =====================================================

/**
 * Validate file type
 */
export function isValidMediaType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Validate file size
 */
export function isValidMediaSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Validate file for upload
 */
export function validateMediaFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!isValidMediaType(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  if (!isValidMediaSize(file.size)) {
    return {
      valid: false,
      error: `File size (${formatBytes(file.size)}) exceeds maximum (${formatBytes(MAX_FILE_SIZE)})`,
    };
  }

  return { valid: true };
}

// =====================================================
// File Name Functions
// =====================================================

/**
 * Generate unique filename with timestamp and random suffix
 */
export function generateUniqueFilename(originalFilename: string): string {
  const ext = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Sanitize filename (remove special characters)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * Generate storage path for file
 */
export function generateStoragePath(
  userId: string,
  filename: string
): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const uniqueFilename = generateUniqueFilename(filename);
  return `${userId}/${year}/${month}/${uniqueFilename}`;
}

// =====================================================
// Format Functions
// =====================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get file type category from MIME type
 */
export function getFileCategory(mimeType: string): 'image' | 'video' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('application/pdf') || mimeType.startsWith('application/msword')) return 'document';
  return 'other';
}

/**
 * Get human-readable file type
 */
export function getFileTypeLabel(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'image/svg+xml': 'SVG Image',
    'application/pdf': 'PDF Document',
  };

  return typeMap[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
}

// =====================================================
// Image Dimension Functions
// =====================================================

/**
 * Get image dimensions from File
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Calculate aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

/**
 * Calculate dimensions while maintaining aspect ratio
 */
export function calculateScaledDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width / maxWidth > height / maxHeight) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }
  }

  return { width, height };
}

// =====================================================
// Preview Functions
// =====================================================

/**
 * Create object URL for file preview
 * Remember to revoke with URL.revokeObjectURL when done
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Read file as Data URL (Base64)
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// =====================================================
// Image Optimization Functions
// =====================================================

/**
 * Options for image optimization
 */
export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Optimize image by resizing and compressing
 * @param file Original image file
 * @param options Optimization options
 * @returns Optimized image as File
 */
export async function optimizeImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<File> {
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 0.85,
    format = 'jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        const { width, height } = calculateScaledDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context를 가져올 수 없습니다.'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        const mimeType = format === 'png'
          ? 'image/png'
          : format === 'webp'
            ? 'image/webp'
            : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 변환에 실패했습니다.'));
              return;
            }

            // Create new file with optimized content
            const optimizedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, `.${format}`),
              { type: mimeType, lastModified: Date.now() }
            );

            resolve(optimizedFile);
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('이미지를 불러올 수 없습니다.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate thumbnail from image file
 * @param file Original image file
 * @param size Thumbnail size (default: 300)
 * @returns Thumbnail image as File
 */
export async function generateThumbnail(
  file: File,
  size = 300
): Promise<File> {
  return optimizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.8,
    format: 'jpeg',
  });
}

// =====================================================
// Validation Functions (Extended)
// =====================================================

/**
 * Validate files for batch upload
 * @param files Array of files to validate
 * @returns Validation result with valid and invalid files
 */
export function validateFilesForUpload(files: File[]): {
  validFiles: File[];
  invalidFiles: Array<{ file: File; error: string }>;
} {
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; error: string }> = [];

  for (const file of files) {
    const result = validateMediaFile(file);
    if (result.valid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, error: result.error || '알 수 없는 오류' });
    }
  }

  return { validFiles, invalidFiles };
}

/**
 * Check if file is an animated image (GIF, WebP animation)
 */
export function isAnimatedImage(file: File): boolean {
  return file.type === 'image/gif' || file.type === 'image/webp';
}

/**
 * Check if file is SVG
 */
export function isSvgImage(file: File): boolean {
  return file.type === 'image/svg+xml';
}

// =====================================================
// URL Extraction Functions
// =====================================================

/**
 * Extract storage path from Supabase or R2 public URL
 * @param url Storage URL (Supabase or R2)
 * @returns Storage path
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // R2 URL 패턴: https://media.ideaonaction.ai/{bucket}/{path}
    if (url.includes('media.ideaonaction.ai')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        return pathParts.slice(1).join('/'); // 버킷 제외한 경로
      }
    }

    // Supabase URL 패턴
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a legacy Supabase storage URL (for migration compatibility)
 * @deprecated R2 스토리지로 마이그레이션 완료, 레거시 URL 변환용으로만 사용
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('supabase.co/storage/v1/object');
}

/**
 * Check if URL is an R2 storage URL
 */
export function isR2StorageUrl(url: string): boolean {
  return url.includes('media.ideaonaction.ai');
}

// =====================================================
// Format Functions (Extended)
// =====================================================

/**
 * Get file icon based on mime type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'file-text';
  return 'file';
}

/**
 * Get color for file type badge
 */
export function getFileTypeColor(mimeType: string): string {
  const colorMap: Record<string, string> = {
    'image/jpeg': 'bg-amber-500',
    'image/png': 'bg-blue-500',
    'image/gif': 'bg-purple-500',
    'image/webp': 'bg-green-500',
    'image/svg+xml': 'bg-pink-500',
    'application/pdf': 'bg-red-500',
  };

  return colorMap[mimeType] || 'bg-gray-500';
}

/**
 * Format bytes with locale support
 */
export function formatBytesLocalized(
  bytes: number,
  locale: 'ko' | 'en' = 'ko'
): string {
  if (bytes === 0) return locale === 'ko' ? '0 바이트' : '0 Bytes';

  const k = 1024;
  const sizes = locale === 'ko'
    ? ['바이트', 'KB', 'MB', 'GB', 'TB']
    : ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  return `${value} ${sizes[i]}`;
}
