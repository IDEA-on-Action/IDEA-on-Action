/**
 * 이미지 처리 유틸리티
 * 
 * Claude API 이미지 크기 제한 (5MB) 처리
 * - 이미지 크기 체크
 * - 자동 압축
 * - 스킵 처리
 */

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

