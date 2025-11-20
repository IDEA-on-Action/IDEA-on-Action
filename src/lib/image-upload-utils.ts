/**
 * Image Upload Utilities
 *
 * General image processing utilities for file uploads and CMS.
 * Complements the existing image-utils.ts (Claude API specific).
 */

import { formatImageSize } from './image-utils';

// ===================================================================
// Types
// ===================================================================

/**
 * Image optimization options
 */
export interface ImageOptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

// ===================================================================
// Image Optimization
// ===================================================================

/**
 * Optimize an image file for upload
 *
 * @param file - Image file to optimize
 * @param options - Optimization options
 * @returns Optimized file
 *
 * @example
 * const optimized = await optimizeImageFile(file, {
 *   maxWidth: 2000,
 *   maxHeight: 2000,
 *   quality: 0.85,
 * });
 */
export async function optimizeImageFile(
  file: File,
  options: ImageOptimizeOptions = {}
): Promise<File> {
  const { maxWidth = 2000, maxHeight = 2000, quality = 0.85, format = 'jpeg' } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            // Create new file
            const optimizedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now(),
            });

            console.log(
              `[Image Optimize] ${file.name}: ${formatImageSize(file.size)} → ${formatImageSize(optimizedFile.size)} (${((1 - optimizedFile.size / file.size) * 100).toFixed(1)}% reduction)`
            );

            resolve(optimizedFile);
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate thumbnail from image file
 *
 * @param file - Image file to generate thumbnail from
 * @param size - Thumbnail size (default: 300x300)
 * @returns Thumbnail file
 *
 * @example
 * const thumbnail = await generateImageThumbnail(file);
 */
export async function generateImageThumbnail(file: File, size: number = 300): Promise<File> {
  return optimizeImageFile(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.8,
  });
}

// ===================================================================
// Image Validation
// ===================================================================

/**
 * Validate image dimensions
 *
 * @param file - Image file to validate
 * @param minWidth - Minimum width (optional)
 * @param minHeight - Minimum height (optional)
 * @param maxWidth - Maximum width (optional)
 * @param maxHeight - Maximum height (optional)
 * @returns Promise resolving to true if valid, false otherwise
 *
 * @example
 * const isValid = await validateImageDimensions(file, 100, 100, 4000, 4000);
 */
export async function validateImageDimensions(
  file: File,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let valid = true;

        if (minWidth && img.width < minWidth) {
          console.warn(`[Image Validate] Width ${img.width} < minimum ${minWidth}`);
          valid = false;
        }

        if (minHeight && img.height < minHeight) {
          console.warn(`[Image Validate] Height ${img.height} < minimum ${minHeight}`);
          valid = false;
        }

        if (maxWidth && img.width > maxWidth) {
          console.warn(`[Image Validate] Width ${img.width} > maximum ${maxWidth}`);
          valid = false;
        }

        if (maxHeight && img.height > maxHeight) {
          console.warn(`[Image Validate] Height ${img.height} > maximum ${maxHeight}`);
          valid = false;
        }

        resolve(valid);
      };

      img.onerror = () => {
        resolve(false);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(false);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from file
 *
 * @param file - Image file
 * @returns Promise resolving to { width, height }
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
