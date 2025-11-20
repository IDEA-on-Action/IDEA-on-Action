/**
 * File Utility Functions
 *
 * Provides file validation and formatting utilities.
 */

// ===================================================================
// Type Definitions
// ===================================================================

/**
 * File validation error
 */
export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

// ===================================================================
// File Size Utilities
// ===================================================================

/**
 * Convert bytes to human-readable format
 *
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.5 MB")
 *
 * @example
 * formatBytes(1024) // "1.00 KB"
 * formatBytes(1536, 0) // "2 KB"
 * formatBytes(1048576) // "1.00 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Convert megabytes to bytes
 *
 * @param mb - Size in megabytes
 * @returns Size in bytes
 */
export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

/**
 * Convert bytes to megabytes
 *
 * @param bytes - Size in bytes
 * @returns Size in megabytes
 */
export function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

// ===================================================================
// File Type Utilities
// ===================================================================

/**
 * Check if MIME type matches accepted types
 *
 * @param mimeType - File MIME type (e.g., "image/png")
 * @param acceptedTypes - Array of accepted types (e.g., ["image/*", "application/pdf"])
 * @returns True if type is accepted
 *
 * @example
 * isFileTypeAccepted("image/png", ["image/*"]) // true
 * isFileTypeAccepted("video/mp4", ["image/*", "video/*"]) // true
 * isFileTypeAccepted("text/plain", ["image/*"]) // false
 */
export function isFileTypeAccepted(mimeType: string, acceptedTypes: string[]): boolean {
  if (acceptedTypes.length === 0) return true;

  return acceptedTypes.some(acceptType => {
    // Wildcard check (e.g., "image/*")
    if (acceptType.endsWith('/*')) {
      const baseType = acceptType.split('/')[0];
      return mimeType.startsWith(`${baseType}/`);
    }

    // Exact match
    return mimeType === acceptType;
  });
}

/**
 * Get file extension from filename
 *
 * @param filename - File name
 * @returns File extension (without dot)
 *
 * @example
 * getFileExtension("document.pdf") // "pdf"
 * getFileExtension("image.png") // "png"
 * getFileExtension("file") // ""
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Check if file is an image
 *
 * @param file - File or MIME type string
 * @returns True if file is an image
 */
export function isImageFile(file: File | string): boolean {
  const mimeType = typeof file === 'string' ? file : file.type;
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a video
 *
 * @param file - File or MIME type string
 * @returns True if file is a video
 */
export function isVideoFile(file: File | string): boolean {
  const mimeType = typeof file === 'string' ? file : file.type;
  return mimeType.startsWith('video/');
}

/**
 * Check if file is an audio
 *
 * @param file - File or MIME type string
 * @returns True if file is an audio
 */
export function isAudioFile(file: File | string): boolean {
  const mimeType = typeof file === 'string' ? file : file.type;
  return mimeType.startsWith('audio/');
}

/**
 * Check if file is a PDF
 *
 * @param file - File or MIME type string
 * @returns True if file is a PDF
 */
export function isPdfFile(file: File | string): boolean {
  const mimeType = typeof file === 'string' ? file : file.type;
  return mimeType === 'application/pdf';
}

// ===================================================================
// File Validation
// ===================================================================

/**
 * Validate file size
 *
 * @param file - File to validate
 * @param maxSizeMb - Maximum size in MB
 * @throws FileValidationError if file is too large
 */
export function validateFileSize(file: File, maxSizeMb: number): void {
  const fileSizeMb = bytesToMb(file.size);

  if (fileSizeMb > maxSizeMb) {
    throw new FileValidationError(
      `File size (${formatBytes(file.size)}) exceeds maximum allowed size (${maxSizeMb} MB)`
    );
  }
}

/**
 * Validate file type
 *
 * @param file - File to validate
 * @param acceptedTypes - Array of accepted MIME types
 * @throws FileValidationError if file type is not accepted
 */
export function validateFileType(file: File, acceptedTypes: string[]): void {
  if (acceptedTypes.length === 0) return;

  if (!isFileTypeAccepted(file.type, acceptedTypes)) {
    throw new FileValidationError(
      `File type "${file.type}" is not accepted. Accepted types: ${acceptedTypes.join(', ')}`
    );
  }
}

/**
 * Validate a file
 *
 * @param file - File to validate
 * @param maxSizeMb - Maximum size in MB (optional)
 * @param acceptedTypes - Array of accepted MIME types (optional)
 * @throws FileValidationError if validation fails
 *
 * @example
 * try {
 *   validateFile(file, 10, ['image/*']);
 * } catch (error) {
 *   if (error instanceof FileValidationError) {
 *     console.error(error.message);
 *   }
 * }
 */
export function validateFile(
  file: File,
  maxSizeMb?: number,
  acceptedTypes?: string[]
): void {
  // Validate size
  if (maxSizeMb !== undefined) {
    validateFileSize(file, maxSizeMb);
  }

  // Validate type
  if (acceptedTypes !== undefined && acceptedTypes.length > 0) {
    validateFileType(file, acceptedTypes);
  }
}

// ===================================================================
// File Name Utilities
// ===================================================================

/**
 * Sanitize filename for safe storage
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 *
 * @example
 * sanitizeFilename("My File (1).pdf") // "my-file-1.pdf"
 * sanitizeFilename("Image #2.png") // "image-2.png"
 */
export function sanitizeFilename(filename: string): string {
  const ext = getFileExtension(filename);
  const nameWithoutExt = filename.slice(0, filename.length - ext.length - 1);

  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return ext ? `${sanitized}.${ext}` : sanitized;
}

/**
 * Generate unique filename with timestamp
 *
 * @param originalFilename - Original filename
 * @param prefix - Optional prefix
 * @returns Unique filename
 *
 * @example
 * generateUniqueFilename("photo.jpg") // "1699876543210-photo.jpg"
 * generateUniqueFilename("photo.jpg", "avatar") // "avatar-1699876543210-photo.jpg"
 */
export function generateUniqueFilename(originalFilename: string, prefix?: string): string {
  const ext = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(originalFilename);

  if (prefix) {
    return `${prefix}-${timestamp}-${sanitized}`;
  }

  return `${timestamp}-${sanitized}`;
}

// ===================================================================
// File Preview Utilities
// ===================================================================

/**
 * Create a preview URL for a file
 *
 * @param file - File to create preview for
 * @returns Promise resolving to preview URL
 */
export function createFilePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to create preview'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Revoke a preview URL
 *
 * @param url - Preview URL to revoke
 */
export function revokeFilePreview(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

// ===================================================================
// Common Accept Types
// ===================================================================

/**
 * Predefined accept type patterns
 */
export const ACCEPT_TYPES = {
  IMAGES: ['image/*'],
  VIDEOS: ['video/*'],
  AUDIO: ['audio/*'],
  PDF: ['application/pdf'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALL: ['*/*'],
} as const;
