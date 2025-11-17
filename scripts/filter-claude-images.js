/**
 * Claude API 이미지 크기 필터링 스크립트
 * 
 * 사용법:
 * 1. Cursor나 다른 도구에서 Claude API를 호출하기 전에 이 함수를 사용
 * 2. messages 배열을 필터링하여 5MB를 초과하는 이미지를 자동으로 제외
 * 
 * 예시:
 * ```javascript
 * const { filteredMessages, skippedCount } = filterOversizedImages(messages)
 * const response = await anthropic.messages.create({
 *   model: "claude-3-5-sonnet-20241022",
 *   messages: filteredMessages
 * })
 * ```
 */

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Base64 이미지 크기 계산
 */
function getBase64ImageSize(base64String) {
  // data:image/...;base64, 부분 제거
  const base64Data = base64String.includes(',')
    ? base64String.split(',')[1]
    : base64String

  // Base64는 원본보다 약 33% 큼 (4/3 비율)
  return Math.ceil((base64Data.length * 3) / 4)
}

/**
 * 이미지 크기를 포맷팅
 */
function formatImageSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * 메시지 배열에서 크기 초과 이미지 필터링
 * 
 * @param {Array} messages - Claude API 메시지 배열
 * @param {Object} options - 옵션
 * @param {boolean} options.skipOversized - 큰 이미지 스킵 (기본: true)
 * @param {boolean} options.logSkipped - 스킵된 이미지 로깅 (기본: true)
 * @returns {Object} 필터링된 메시지와 스킵 정보
 */
function filterOversizedImages(messages, options = {}) {
  const { skipOversized = true, logSkipped = true } = options
  const skippedDetails = []
  let skippedCount = 0

  const filteredMessages = messages.map((message, msgIndex) => {
    // content가 배열인 경우 (멀티모달)
    if (Array.isArray(message.content)) {
      const filteredContent = message.content.filter((item, contentIndex) => {
        // 이미지 타입인지 확인
        if (
          item &&
          typeof item === 'object' &&
          item.type === 'image' &&
          item.source &&
          typeof item.source === 'object'
        ) {
          // source.base64 또는 source.data에서 Base64 추출
          const base64String = item.source.base64 || item.source.data

          if (base64String && typeof base64String === 'string') {
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
        }
        return true // 이미지가 아니거나 크기 제한 내
      })

      return {
        ...message,
        content: filteredContent,
      }
    }

    // content가 문자열인 경우는 그대로 반환
    return message
  })

  if (skippedCount > 0) {
    console.warn(
      `⚠️ 총 ${skippedCount}개의 이미지가 5MB 크기 제한으로 자동 제외되었습니다.`
    )
  }

  return {
    filteredMessages,
    skippedCount,
    skippedDetails,
  }
}

// Node.js 환경에서 사용하는 경우
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { filterOversizedImages, getBase64ImageSize, formatImageSize }
}

// 브라우저 환경에서 사용하는 경우
if (typeof window !== 'undefined') {
  window.filterOversizedImages = filterOversizedImages
  window.getBase64ImageSize = getBase64ImageSize
  window.formatImageSize = formatImageSize
}



