/**
 * File Upload Hook with Supabase Storage
 *
 * Provides file upload functionality with validation, optimization, and progress tracking.
 *
 * Features:
 * - Multi-file upload with progress tracking
 * - File validation (size, type)
 * - Image optimization (resize, compress)
 * - Thumbnail generation
 * - Delete file from storage
 * - Upload queue management
 *
 * @example
 * const { uploadFiles, uploading, progress, errors } = useFileUpload({
 *   bucket: 'cms-images',
 *   maxSize: 10, // 10MB
 *   accept: ['image/*'],
 *   onComplete: (file, url) => console.log('Uploaded:', url),
 * });
 *
 * const urls = await uploadFiles(selectedFiles);
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
/** Generate a simple UUID v4 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ===================================================================
// Types
// ===================================================================

/**
 * File upload options
 */
export interface UseFileUploadOptions {
  /** Supabase Storage bucket name */
  bucket: string;

  /** Max file size in MB (default: 10) */
  maxSize?: number;

  /** Accepted file types (e.g., ['image/*', 'application/pdf']) */
  accept?: string[];

  /** Max number of files (default: unlimited) */
  maxFiles?: number;

  /** Progress callback for individual files */
  onProgress?: (file: File, progress: number) => void;

  /** Completion callback for individual files */
  onComplete?: (file: File, url: string) => void;

  /** Error callback for individual files */
  onError?: (file: File, error: Error) => void;

  /** Enable image optimization (default: true for images) */
  optimizeImages?: boolean;

  /** Generate thumbnails for images (default: false) */
  generateThumbnails?: boolean;
}

/**
 * Image optimization options
 */
export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Upload result
 */
export interface UploadResult {
  file: File;
  url: string;
  thumbnailUrl?: string;
}

/**
 * Upload error
 */
export interface UploadError {
  file: File;
  error: Error;
}

// ===================================================================
// File Upload Hook
// ===================================================================

/**
 * Hook for uploading files to Supabase Storage
 *
 * @param options - Upload configuration options
 * @returns Upload functions and state
 */
export function useFileUpload(options: UseFileUploadOptions) {
  const {
    bucket,
    maxSize = 10,
    accept = [],
    maxFiles,
    onProgress,
    onComplete,
    onError,
    optimizeImages = true,
    generateThumbnails = false,
  } = options;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ===================================================================
  // File Validation
  // ===================================================================

  /**
   * Validate a single file
   */
  const validateFile = useCallback(
    (file: File): void => {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSize) {
        throw new Error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds limit (${maxSize} MB)`);
      }

      // Check file type
      if (accept.length > 0) {
        const fileType = file.type;
        const isAccepted = accept.some(acceptType => {
          if (acceptType.endsWith('/*')) {
            const baseType = acceptType.split('/')[0];
            return fileType.startsWith(`${baseType}/`);
          }
          return fileType === acceptType;
        });

        if (!isAccepted) {
          throw new Error(`File type ${fileType} is not accepted. Accepted types: ${accept.join(', ')}`);
        }
      }
    },
    [maxSize, accept]
  );

  // ===================================================================
  // Image Optimization
  // ===================================================================

  /**
   * Optimize an image file
   */
  const optimizeImage = useCallback(
    async (file: File, opts: OptimizeOptions = {}): Promise<File> => {
      const { maxWidth = 2000, maxHeight = 2000, quality = 0.85 } = opts;

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
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }

                // Create new file
                const optimizedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });

                resolve(optimizedFile);
              },
              file.type,
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
    },
    []
  );

  // ===================================================================
  // Thumbnail Generation
  // ===================================================================

  /**
   * Generate thumbnail for an image
   */
  const generateThumbnail = useCallback(
    async (file: File): Promise<File> => {
      return optimizeImage(file, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.8,
      });
    },
    [optimizeImage]
  );

  // ===================================================================
  // Upload Functions
  // ===================================================================

  /**
   * Generate storage path for file
   */
  const generateStoragePath = (file: File): string => {
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${generateUUID()}.${ext}`;
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    return `${year}/${month}/${filename}`;
  };

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult> => {
      // Validate file
      validateFile(file);

      // Generate path
      const path = generateStoragePath(file);

      // Optimize if needed
      let fileToUpload = file;
      if (optimizeImages && file.type.startsWith('image/')) {
        try {
          fileToUpload = await optimizeImage(file);
          console.log(`[useFileUpload] Optimized ${file.name}: ${file.size} → ${fileToUpload.size} bytes`);
        } catch (error) {
          console.warn('[useFileUpload] Image optimization failed, uploading original:', error);
          fileToUpload = file;
        }
      }

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

      const result: UploadResult = {
        file,
        url: urlData.publicUrl,
      };

      // Generate thumbnail if needed
      if (generateThumbnails && file.type.startsWith('image/')) {
        try {
          const thumbFile = await generateThumbnail(file);
          const thumbPath = path.replace(/(\.[^.]+)$/, '-thumb$1');

          const { error: thumbError } = await supabase.storage
            .from(bucket)
            .upload(thumbPath, thumbFile, {
              cacheControl: '3600',
              upsert: false,
            });

          if (!thumbError) {
            const { data: thumbUrlData } = supabase.storage.from(bucket).getPublicUrl(thumbPath);
            result.thumbnailUrl = thumbUrlData.publicUrl;
          }
        } catch (error) {
          console.warn('[useFileUpload] Thumbnail generation failed:', error);
        }
      }

      // Call onComplete callback
      onComplete?.(file, result.url);

      return result;
    },
    [bucket, validateFile, optimizeImages, generateThumbnails, optimizeImage, generateThumbnail, onComplete]
  );

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      // Validate max files
      if (maxFiles && files.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        throw new Error(`Maximum ${maxFiles} files allowed`);
      }

      setUploading(true);
      setProgress({});
      setErrors({});

      const results: UploadResult[] = [];
      const uploadErrors: UploadError[] = [];

      // Upload files sequentially (or use Promise.all for parallel)
      for (const file of files) {
        try {
          // Update progress
          setProgress(prev => ({ ...prev, [file.name]: 0 }));

          const result = await uploadFile(file);
          results.push(result);

          // Update progress to 100%
          setProgress(prev => ({ ...prev, [file.name]: 100 }));
        } catch (error) {
          const err = error as Error;
          console.error(`[useFileUpload] Failed to upload ${file.name}:`, err);

          uploadErrors.push({ file, error: err });
          setErrors(prev => ({ ...prev, [file.name]: err.message }));

          // Call onError callback
          onError?.(file, err);
        }
      }

      setUploading(false);

      // Show summary toast
      if (results.length > 0) {
        toast.success(`Uploaded ${results.length} file(s) successfully`);
      }

      if (uploadErrors.length > 0) {
        toast.error(`Failed to upload ${uploadErrors.length} file(s)`);
      }

      return results;
    },
    [maxFiles, uploadFile, onError]
  );

  // ===================================================================
  // Delete Functions
  // ===================================================================

  /**
   * Delete a file from storage
   */
  const deleteFile = useCallback(
    async (url: string): Promise<void> => {
      try {
        // Extract path from URL
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/');
        const path = pathSegments.slice(-3).join('/'); // year/month/filename

        // Delete main file
        const { error } = await supabase.storage.from(bucket).remove([path]);

        if (error) {
          throw new Error(`Failed to delete file: ${error.message}`);
        }

        // Also delete thumbnail if exists
        const thumbPath = path.replace(/(\.[^.]+)$/, '-thumb$1');
        await supabase.storage.from(bucket).remove([thumbPath]);

        toast.success('File deleted successfully');
      } catch (error) {
        console.error('[useFileUpload] Delete failed:', error);
        toast.error(`Failed to delete file: ${(error as Error).message}`);
        throw error;
      }
    },
    [bucket]
  );

  // ===================================================================
  // Return API
  // ===================================================================

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    uploading,
    progress,
    errors,
  };
}
