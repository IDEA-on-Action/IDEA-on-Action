/**
 * Media Utility Functions
 *
 * CMS Phase 5 - Helper functions for media operations
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// Constants
// =====================================================

export const MEDIA_BUCKET = 'media-library';

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
 */
export function getMediaPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
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
 * Generate a Supabase Storage transform URL for on-the-fly resizing
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export function getMediaTransformUrl(
  storagePath: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
    resize?: 'cover' | 'contain' | 'fill';
  } = {}
): string {
  const { width, height, quality = 80, format, resize = 'cover' } = options;

  // Build transform query params
  const transforms: string[] = [];
  if (width) transforms.push(`width=${width}`);
  if (height) transforms.push(`height=${height}`);
  if (quality) transforms.push(`quality=${quality}`);
  if (format) transforms.push(`format=${format}`);
  if (resize) transforms.push(`resize=${resize}`);

  const baseUrl = getMediaPublicUrl(storagePath);

  if (transforms.length === 0) {
    return baseUrl;
  }

  // Add render/image transform endpoint
  // Note: Requires Supabase Pro plan for image transformations
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
