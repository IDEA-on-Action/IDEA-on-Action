/**
 * 이미지 처리 유틸리티
 *
 * Claude API 이미지 크기 제한 (5MB) 처리
 * - 이미지 크기 체크
 * - 자동 압축
 * - 스킵 처리
 *
 * Vision API 지원
 * - 이미지 형식 검증
 * - Base64 인코딩
 * - 파일 크기 검증
 * - 미디어 타입 추출
 *
 * @module lib/image-utils
 */

import type {
  VisionImage,
  ImageMediaType,
  ImageValidationResult,
  ImageSourceType,
  UrlValidationResult,
} from '@/types/ai/vision.types'
import {
  IMAGE_VALIDATION,
  SUPPORTED_MEDIA_TYPES,
  createVisionError,
} from '@/types/ai/vision.types'

// Claude API 이미지 크기 제한 (5MB)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

/**
 * Base64 이미지 크기 계산
 * @param base64String Base64 인코딩된 이미지 문자열
 * @returns 이미지 크기 (bytes)
 */
export function getBase64ImageSize(base64String: string): number {
  // Base64 문자열에서 실제 데이터 부분만 추출
  const base64Data = base64String.includes(',')
    ? base64String.split(',')[1]
    : base64String

  // Base64는 원본보다 약 33% 큼 (4/3 비율)
  // 하지만 정확한 크기는 디코딩된 바이너리 크기로 계산
  return Math.ceil((base64Data.length * 3) / 4)
}

/**
 * 이미지가 크기 제한을 초과하는지 확인
 * @param base64String Base64 인코딩된 이미지 문자열
 * @returns 초과 여부
 */
export function isImageSizeExceeded(base64String: string): boolean {
  return getBase64ImageSize(base64String) > MAX_IMAGE_SIZE
}

/**
 * 이미지 크기를 사람이 읽기 쉬운 형식으로 변환
 * @param bytes 바이트 크기
 * @returns 포맷된 문자열 (예: "5.2 MB")
 */
export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Claude API 메시지에서 Base64 이미지 데이터 추출
 * @param item 콘텐츠 아이템
 * @returns Base64 문자열 또는 null
 */
function extractBase64FromImageItem(item: unknown): string | null {
  if (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'image' &&
    'source' in item &&
    typeof item.source === 'object' &&
    item.source !== null
  ) {
    const source = item.source as Record<string, unknown>
    
    // Claude API는 source.base64 또는 source.data를 사용할 수 있음
    if ('base64' in source && typeof source.base64 === 'string') {
      return source.base64
    }
    if ('data' in source && typeof source.data === 'string') {
      return source.data
    }
  }
  return null
}

/**
 * 메시지 배열에서 크기 초과 이미지 필터링
 * @param messages Claude API 메시지 배열
 * @param options 필터링 옵션
 * @returns 필터링된 메시지 배열
 */
export function filterOversizedImages<T extends { content: unknown }>(
  messages: T[],
  options: {
    skipOversized?: boolean // true: 스킵, false: 에러 발생
    logSkipped?: boolean // 스킵된 이미지 로깅
  } = {}
): {
  filteredMessages: T[]
  skippedCount: number
  skippedDetails: Array<{ messageIndex: number; contentIndex: number; size: number }>
} {
  const { skipOversized = true, logSkipped = true } = options
  const skippedDetails: Array<{ messageIndex: number; contentIndex: number; size: number }> = []
  let skippedCount = 0

  const filteredMessages = messages.map((message, msgIndex) => {
    // content가 배열인 경우 (멀티모달)
    if (Array.isArray(message.content)) {
      const filteredContent = message.content.filter((item, contentIndex) => {
        const base64String = extractBase64FromImageItem(item)
        
        if (base64String) {
          const size = getBase64ImageSize(base64String)

          if (size > MAX_IMAGE_SIZE) {
            skippedCount++
            skippedDetails.push({
              messageIndex: msgIndex,
              contentIndex,
              size,
            })

            if (logSkipped) {
              console.warn(
                `[Image Filter] 메시지 ${msgIndex}, 콘텐츠 ${contentIndex}: 이미지 크기 초과 (${formatImageSize(size)} > ${formatImageSize(MAX_IMAGE_SIZE)}) - 자동으로 제외됩니다.`
              )
            }

            return !skipOversized // false면 필터링 (제거)
          }
        }
        return true // 이미지가 아니거나 크기 제한 내
      })

      return {
        ...message,
        content: filteredContent,
      } as T
    }

    // content가 문자열인 경우는 그대로 반환
    return message
  })

  return {
    filteredMessages,
    skippedCount,
    skippedDetails,
  }
}

/**
 * 이미지 압축 (클라이언트 사이드)
 * @param file 이미지 파일
 * @param maxWidth 최대 너비 (기본값: 1920)
 * @param maxHeight 최대 높이 (기본값: 1080)
 * @param quality JPEG 품질 (0-1, 기본값: 0.8)
 * @returns 압축된 Base64 문자열
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    format?: 'jpeg' | 'webp' | 'png'
  } = {}
): Promise<string> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8, format = 'jpeg' } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // 캔버스 생성
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // 비율 유지하며 리사이즈
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        canvas.width = width
        canvas.height = height

        // 이미지 그리기
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context를 가져올 수 없습니다.'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Base64로 변환
        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
        const base64 = canvas.toDataURL(mimeType, quality)

        // 크기 체크
        const size = getBase64ImageSize(base64)
        if (size > MAX_IMAGE_SIZE) {
          console.warn(
            `[Image Compress] 압축 후에도 크기 제한 초과: ${formatImageSize(size)}. 추가 압축이 필요합니다.`
          )
        }

        resolve(base64)
      }
      img.onerror = () => reject(new Error('이미지 로드 실패'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsDataURL(file)
  })
}

/**
 * 이미지를 자동으로 압축하거나 스킵하는 헬퍼
 * @param base64String 원본 Base64 이미지
 * @param options 옵션
 * @returns 처리된 Base64 문자열 또는 null (스킵된 경우)
 */
export async function processImageForClaude(
  base64String: string,
  options: {
    autoCompress?: boolean // 자동 압축 시도
    skipIfOversized?: boolean // 크기 초과 시 스킵
  } = {}
): Promise<string | null> {
  const { autoCompress = true, skipIfOversized = true } = options

  const size = getBase64ImageSize(base64String)

  // 크기 제한 내면 그대로 반환
  if (size <= MAX_IMAGE_SIZE) {
    return base64String
  }

  // 크기 초과 시 처리
  if (skipIfOversized && !autoCompress) {
    console.warn(
      `[Image Process] 이미지 크기 초과로 스킵: ${formatImageSize(size)} > ${formatImageSize(MAX_IMAGE_SIZE)}`
    )
    return null
  }

  // 자동 압축 시도
  if (autoCompress) {
    try {
      // Base64를 Blob으로 변환
      const response = await fetch(base64String)
      const blob = await response.blob()
      const file = new File([blob], 'image.jpg', { type: blob.type })

      // 압축 시도 (점진적으로 품질 낮춤)
      for (let quality = 0.8; quality >= 0.3; quality -= 0.1) {
        const compressed = await compressImage(file, { quality, maxWidth: 1920, maxHeight: 1080 })
        const compressedSize = getBase64ImageSize(compressed)

        if (compressedSize <= MAX_IMAGE_SIZE) {
          console.log(
            `[Image Process] 압축 성공: ${formatImageSize(size)} → ${formatImageSize(compressedSize)} (품질: ${quality})`
          )
          return compressed
        }
      }

      // 모든 압축 시도 실패
      if (skipIfOversized) {
        console.warn(
          `[Image Process] 압축 실패, 스킵: ${formatImageSize(size)} (최소 크기: ${formatImageSize(getBase64ImageSize(await compressImage(file, { quality: 0.3 })))})`
        )
        return null
      }
    } catch (error) {
      console.error('[Image Process] 압축 중 오류:', error)
      if (skipIfOversized) {
        return null
      }
    }
  }

  // 압축하지 않고 스킵하지 않으면 원본 반환 (에러 발생할 수 있음)
  return base64String
}

/**
 * Claude API 호출 전에 메시지를 필터링하는 래퍼 함수
 * 
 * 사용 예시:
 * ```typescript
 * import { filterOversizedImages } from '@/lib/image-utils'
 * 
 * // API 호출 전에 필터링
 * const { filteredMessages, skippedCount } = filterOversizedImages(messages)
 * 
 * if (skippedCount > 0) {
 *   console.warn(`${skippedCount}개의 이미지가 크기 제한으로 제외되었습니다.`)
 * }
 * 
 * // 필터링된 메시지로 API 호출
 * const response = await anthropic.messages.create({
 *   model: "claude-3-5-sonnet-20241022",
 *   max_tokens: 1024,
 *   messages: filteredMessages
 * })
 * ```
 * 
 * @param messages Claude API 메시지 배열
 * @returns 필터링된 메시지와 스킵 정보
 */
export function prepareClaudeMessages<T extends { content: unknown }>(
  messages: T[]
): {
  messages: T[]
  skippedCount: number
  skippedDetails: Array<{ messageIndex: number; contentIndex: number; size: number }>
} {
  const result = filterOversizedImages(messages, {
    skipOversized: true,
    logSkipped: true,
  })

  if (result.skippedCount > 0) {
    console.warn(
      `⚠️ ${result.skippedCount}개의 이미지가 5MB 크기 제한으로 자동 제외되었습니다.`
    )
    result.skippedDetails.forEach((detail) => {
      console.warn(
        `  - 메시지 ${detail.messageIndex}, 콘텐츠 ${detail.contentIndex}: ${formatImageSize(detail.size)}`
      )
    })
  }

  return {
    messages: result.filteredMessages,
    skippedCount: result.skippedCount,
    skippedDetails: result.skippedDetails,
  }
}

// ============================================================================
// Vision API 지원 함수들
// ============================================================================

/**
 * 지원하는 이미지 형식 목록
 */
export const SUPPORTED_FORMATS: ImageMediaType[] = SUPPORTED_MEDIA_TYPES

/**
 * 최대 파일 크기 (5MB) - Vision API용
 */
export const MAX_FILE_SIZE = IMAGE_VALIDATION.MAX_FILE_SIZE

/**
 * MIME 타입 - 확장자 매핑
 */
const MIME_TO_EXTENSION: Record<ImageMediaType, string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
}

/**
 * 확장자 - MIME 타입 매핑
 */
const EXTENSION_TO_MIME: Record<string, ImageMediaType> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

/**
 * 이미지 파일 유효성 검증
 *
 * @param file - 검증할 File 객체
 * @returns 검증 결과
 *
 * @example
 * ```ts
 * const result = validateImage(file);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateImage(file: File): ImageValidationResult {
  // 파일 존재 여부
  if (!file) {
    return {
      valid: false,
      error: '파일이 없습니다',
      errorCode: 'INVALID_IMAGE',
    }
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다 (${sizeMB}MB). 최대 5MB까지 지원됩니다.`,
      errorCode: 'FILE_TOO_LARGE',
    }
  }

  // 파일 크기가 0인 경우
  if (file.size === 0) {
    return {
      valid: false,
      error: '빈 파일입니다',
      errorCode: 'INVALID_IMAGE',
    }
  }

  // MIME 타입 검증
  const mediaType = file.type as ImageMediaType
  if (!SUPPORTED_FORMATS.includes(mediaType)) {
    return {
      valid: false,
      error: `지원하지 않는 이미지 형식입니다 (${file.type}). PNG, JPEG, GIF, WebP만 지원됩니다.`,
      errorCode: 'UNSUPPORTED_FORMAT',
    }
  }

  return { valid: true }
}

/**
 * 여러 이미지 파일 유효성 검증
 *
 * @param files - 검증할 File 배열
 * @returns 검증 결과
 */
export function validateImages(files: File[]): ImageValidationResult {
  // 이미지 개수 검증
  if (files.length === 0) {
    return {
      valid: false,
      error: '최소 1개의 이미지가 필요합니다',
      errorCode: 'INVALID_IMAGE',
    }
  }

  if (files.length > IMAGE_VALIDATION.MAX_IMAGES) {
    return {
      valid: false,
      error: `이미지는 최대 ${IMAGE_VALIDATION.MAX_IMAGES}개까지만 업로드할 수 있습니다`,
      errorCode: 'TOO_MANY_IMAGES',
    }
  }

  // 각 파일 검증
  for (let i = 0; i < files.length; i++) {
    const result = validateImage(files[i])
    if (!result.valid) {
      return {
        ...result,
        error: `이미지 ${i + 1}: ${result.error}`,
      }
    }
  }

  return { valid: true }
}

/**
 * 이미지 URL 유효성 검증
 *
 * @param url - 검증할 URL
 * @returns 검증 결과
 */
export function validateImageUrl(url: string): UrlValidationResult {
  if (!url) {
    return { valid: false, error: 'URL이 없습니다' }
  }

  try {
    const parsed = new URL(url)

    // HTTPS만 허용
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'HTTPS URL만 지원됩니다' }
    }

    // 확장자 확인 (선택적)
    const extension = getUrlExtension(url)
    if (extension && !Object.keys(EXTENSION_TO_MIME).includes(extension)) {
      return {
        valid: false,
        error: '지원하지 않는 이미지 형식입니다',
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: '유효하지 않은 URL입니다' }
  }
}

/**
 * File을 Base64 문자열로 변환
 *
 * @param file - 변환할 File 객체
 * @returns Base64 인코딩된 문자열 (data URL prefix 제외)
 *
 * @example
 * ```ts
 * const base64 = await fileToBase64(file);
 * // 결과: "iVBORw0KGgoAAAANSUhEUgAA..."
 * ```
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result as string
      // data:image/png;base64, 접두사 제거
      const base64 = result.split(',')[1]
      resolve(base64)
    }

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * File에서 미디어 타입 추출
 *
 * @param file - File 객체
 * @returns 이미지 미디어 타입
 * @throws 지원하지 않는 형식인 경우
 */
export function getMediaType(file: File): ImageMediaType {
  const type = file.type as ImageMediaType

  if (!SUPPORTED_FORMATS.includes(type)) {
    // 확장자로 추론 시도
    const extension = getFileExtension(file.name)
    const inferredType = EXTENSION_TO_MIME[extension]

    if (inferredType) {
      return inferredType
    }

    throw createVisionError(
      'UNSUPPORTED_FORMAT',
      `지원하지 않는 형식: ${file.type || file.name}`
    )
  }

  return type
}

/**
 * 파일명에서 확장자 추출
 *
 * @param filename - 파일명
 * @returns 확장자 (소문자, . 포함)
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * URL에서 확장자 추출
 *
 * @param url - URL 문자열
 * @returns 확장자 (소문자, . 포함)
 */
export function getUrlExtension(url: string): string {
  try {
    const parsed = new URL(url)
    return getFileExtension(parsed.pathname)
  } catch {
    return ''
  }
}

/**
 * File을 VisionImage로 변환
 *
 * @param file - 변환할 File 객체
 * @returns VisionImage 객체
 *
 * @example
 * ```ts
 * const visionImage = await fileToVisionImage(file);
 * // 결과: { source: 'base64', data: '...', mediaType: 'image/png' }
 * ```
 */
export async function fileToVisionImage(file: File): Promise<VisionImage> {
  // 검증
  const validation = validateImage(file)
  if (!validation.valid) {
    throw createVisionError(
      validation.errorCode || 'INVALID_IMAGE',
      validation.error
    )
  }

  // 변환
  const base64 = await fileToBase64(file)
  const mediaType = getMediaType(file)

  return {
    source: 'base64',
    data: base64,
    mediaType,
  }
}

/**
 * 여러 File을 VisionImage 배열로 변환
 *
 * @param files - 변환할 File 배열
 * @returns VisionImage 배열
 */
export async function filesToVisionImages(files: File[]): Promise<VisionImage[]> {
  // 전체 검증
  const validation = validateImages(files)
  if (!validation.valid) {
    throw createVisionError(
      validation.errorCode || 'INVALID_IMAGE',
      validation.error
    )
  }

  // 변환
  const images = await Promise.all(files.map(fileToVisionImage))
  return images
}

/**
 * URL을 VisionImage로 변환
 *
 * @param url - 이미지 URL
 * @param mediaType - 미디어 타입 (선택, 자동 추론 시도)
 * @returns VisionImage 객체
 */
export function urlToVisionImage(
  url: string,
  mediaType?: ImageMediaType
): VisionImage {
  const validation = validateImageUrl(url)
  if (!validation.valid) {
    throw createVisionError('INVALID_IMAGE', validation.error)
  }

  // 미디어 타입 추론
  let type = mediaType
  if (!type) {
    const extension = getUrlExtension(url)
    type = EXTENSION_TO_MIME[extension] || 'image/jpeg' // 기본값
  }

  return {
    source: 'url',
    data: url,
    mediaType: type,
  }
}

/**
 * Data URL을 VisionImage로 변환
 *
 * @param dataUrl - Data URL (data:image/png;base64,...)
 * @returns VisionImage 객체
 */
export function dataUrlToVisionImage(dataUrl: string): VisionImage {
  // data:image/png;base64,iVBORw0KGgo... 형식 파싱
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/i)

  if (!match) {
    throw createVisionError('INVALID_IMAGE', '유효하지 않은 Data URL입니다')
  }

  const mediaType = match[1] as ImageMediaType
  const data = match[2]

  if (!SUPPORTED_FORMATS.includes(mediaType)) {
    throw createVisionError(
      'UNSUPPORTED_FORMAT',
      `지원하지 않는 형식: ${mediaType}`
    )
  }

  return {
    source: 'base64',
    data,
    mediaType,
  }
}

/**
 * VisionImage를 Data URL로 변환
 *
 * @param image - VisionImage 객체
 * @returns Data URL 문자열
 */
export function visionImageToDataUrl(image: VisionImage): string {
  if (image.source === 'url') {
    return image.data
  }

  return `data:${image.mediaType};base64,${image.data}`
}

/**
 * 이미지 크기 정보 가져오기 (브라우저 환경)
 *
 * @param file - File 객체
 * @returns 이미지 크기 정보
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 로드할 수 없습니다'))
    }

    img.src = url
  })
}

/**
 * 이미지 리사이즈 (클라이언트 측)
 *
 * @param file - 원본 File 객체
 * @param maxWidth - 최대 너비
 * @param maxHeight - 최대 높이
 * @param quality - JPEG 품질 (0-1, 기본: 0.85)
 * @returns 리사이즈된 이미지 Blob
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 2048,
  maxHeight: number = 2048,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // 원본 크기
      let { width, height } = img

      // 리사이즈 비율 계산
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)
      }

      // Canvas에 그리기
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context를 생성할 수 없습니다'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Blob으로 변환
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('이미지 변환에 실패했습니다'))
          }
        },
        file.type || 'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 로드할 수 없습니다'))
    }

    img.src = url
  })
}

/**
 * Base64 문자열 크기 계산 (bytes) - Vision API용
 *
 * @param base64 - Base64 문자열
 * @returns 크기 (bytes)
 */
export function getBase64Size(base64: string): number {
  // Base64는 원본 데이터의 약 4/3 크기
  const padding = (base64.match(/=/g) || []).length
  return Math.floor((base64.length * 3) / 4) - padding
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 *
 * @param bytes - 바이트 크기
 * @returns 포맷된 문자열 (예: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 이미지 소스 유형 감지
 *
 * @param data - 이미지 데이터
 * @returns 소스 유형
 */
export function detectImageSourceType(data: string): ImageSourceType {
  // URL인지 확인
  try {
    new URL(data)
    return 'url'
  } catch {
    // URL이 아니면 Base64로 간주
    return 'base64'
  }
}

/**
 * 드래그 앤 드롭 이벤트에서 이미지 파일 추출
 *
 * @param event - DragEvent
 * @returns 이미지 File 배열
 */
export function extractImagesFromDrop(event: DragEvent): File[] {
  const files: File[] = []

  if (event.dataTransfer?.files) {
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      const file = event.dataTransfer.files[i]
      if (file.type.startsWith('image/')) {
        files.push(file)
      }
    }
  }

  return files
}

/**
 * 클립보드에서 이미지 추출
 *
 * @param event - ClipboardEvent
 * @returns 이미지 File 또는 null
 */
export function extractImageFromClipboard(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items

  if (!items) return null

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      return item.getAsFile()
    }
  }

  return null
}

