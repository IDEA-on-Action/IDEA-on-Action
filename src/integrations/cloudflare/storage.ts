/**
 * Cloudflare R2 Storage 클라이언트
 *
 * 프론트엔드에서 R2 스토리지에 파일 업로드/다운로드를 위한 클라이언트
 */

import { workersApi } from './client';

// Storage API 베이스 URL
const STORAGE_API = '/api/v1/storage';

// R2 공개 URL
export const R2_PUBLIC_URL = 'https://media.ideaonaction.ai';

// 타입 정의
export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string | null;
  folder: string;
  createdAt: string;
}

export interface UploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string | null;
  folder: string;
}

export interface UploadUrlResult {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresIn: number;
}

export interface StorageStats {
  byFolder: Array<{
    folder: string;
    file_count: number;
    total_size: number;
    avg_size: number;
  }>;
  total: {
    total_files: number;
    total_size: number;
    unique_uploaders: number;
  };
}

// 허용된 파일 타입
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  text: ['text/plain', 'text/csv', 'application/json'],
} as const;

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_FILE_TYPES.images,
  ...ALLOWED_FILE_TYPES.documents,
  ...ALLOWED_FILE_TYPES.text,
];

// 최대 파일 크기 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 파일 목록 조회
 */
export async function listFiles(options?: {
  folder?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ files: MediaFile[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (options?.folder) params.set('folder', options.folder);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.cursor) params.set('cursor', options.cursor);

  const response = await workersApi.get<{ files: MediaFile[]; nextCursor: string | null }>(
    `${STORAGE_API}/files?${params.toString()}`
  );

  if (!response.data) {
    throw new Error('파일 목록 조회 실패');
  }

  return response.data;
}

/**
 * 파일 업로드
 */
export async function uploadFile(
  file: File,
  options?: { folder?: string }
): Promise<UploadResult> {
  // 파일 타입 검증
  if (!ALL_ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`허용되지 않는 파일 형식입니다: ${file.type}`);
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`파일 크기가 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다`);
  }

  const formData = new FormData();
  formData.append('file', file);
  if (options?.folder) {
    formData.append('folder', options.folder);
  }

  const response = await workersApi.post<UploadResult>(
    `${STORAGE_API}/upload`,
    formData,
    {
      headers: {
        // Content-Type은 FormData가 자동으로 설정
      },
    }
  );

  if (!response.data) {
    throw new Error('파일 업로드 실패');
  }

  return response.data;
}

/**
 * 서명된 업로드 URL 획득
 */
export async function getUploadUrl(
  filename: string,
  mimeType: string,
  folder?: string
): Promise<UploadUrlResult> {
  const response = await workersApi.post<UploadUrlResult>(`${STORAGE_API}/upload-url`, {
    filename,
    mimeType,
    folder,
  });

  if (!response.data) {
    throw new Error('업로드 URL 생성 실패');
  }

  return response.data;
}

/**
 * 직접 업로드 (서명된 URL 사용)
 */
export async function uploadDirect(
  file: File,
  uploadUrl: string
): Promise<{ id: string; url: string }> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error('직접 업로드 실패');
  }

  return response.json();
}

/**
 * 파일 삭제
 */
export async function deleteFile(fileId: string): Promise<void> {
  await workersApi.delete(`${STORAGE_API}/files/${fileId}`);
}

/**
 * 파일 다운로드 URL 획득
 */
export function getDownloadUrl(fileId: string): string {
  return `${STORAGE_API}/files/${fileId}/download`;
}

/**
 * 스토리지 통계 조회 (관리자용)
 */
export async function getStorageStats(): Promise<StorageStats> {
  const response = await workersApi.get<StorageStats>(`${STORAGE_API}/stats`);

  if (!response.data) {
    throw new Error('스토리지 통계 조회 실패');
  }

  return response.data;
}

/**
 * R2 이미지 변환 URL 생성
 */
export function getImageUrl(
  path: string,
  options?: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'scale-down' | 'crop';
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
  }
): string {
  const url = new URL(`${R2_PUBLIC_URL}/${path}`);

  if (options?.width) url.searchParams.set('width', String(options.width));
  if (options?.height) url.searchParams.set('height', String(options.height));
  if (options?.fit) url.searchParams.set('fit', options.fit);
  if (options?.quality) url.searchParams.set('quality', String(options.quality));
  if (options?.format) url.searchParams.set('format', options.format);

  return url.toString();
}

/**
 * 파일 크기 포맷
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 클라이언트 객체 export
export const storageClient = {
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
} as const;

export default storageClient;
