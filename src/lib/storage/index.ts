/**
 * Storage Module Index
 *
 * Cloudflare R2 스토리지 관련 유틸리티 및 클라이언트 통합 export
 */

// URL 변환 유틸리티
export {
  rewriteStorageUrl,
  getImageVariant,
  rewriteObjectUrls,
  rewriteArrayUrls,
  isR2Url,
  isSupabaseStorageUrl,
  getStorageUrlStatus,
  storageUrlUtils,
} from './url-rewriter';

// R2 클라이언트 (integrations에서 re-export)
export {
  storageClient,
  listFiles,
  uploadFile,
  getUploadUrl,
  uploadDirect,
  deleteFile,
  getDownloadUrl,
  getStorageStats,
  getImageUrl,
  formatFileSize,
  R2_PUBLIC_URL,
  ALLOWED_FILE_TYPES,
  ALL_ALLOWED_TYPES,
  MAX_FILE_SIZE,
  type MediaFile,
  type UploadResult,
  type UploadUrlResult,
  type StorageStats,
} from '@/integrations/cloudflare/storage';
