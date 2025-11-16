# Claude API 이미지 크기 제한 해결 가이드

## 문제 상황

Claude API는 이미지 크기를 **5MB**로 제한합니다. 이를 초과하면 다음과 같은 에러가 발생합니다:

```
API Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"messages.19.content.16.image.source.base64: image exceeds 5 MB maximum: 17361144 bytes > 5242880 bytes"}}
```

## 해결 방법

### 방법 1: 자동 필터링 (권장)

API 호출 전에 큰 이미지를 자동으로 제외합니다.

```typescript
import { prepareClaudeMessages } from '@/lib/image-utils'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 메시지 준비 (큰 이미지 자동 제외)
const { messages, skippedCount } = prepareClaudeMessages(yourMessages)

if (skippedCount > 0) {
  console.warn(`⚠️ ${skippedCount}개의 이미지가 크기 제한으로 제외되었습니다.`)
}

// 필터링된 메시지로 API 호출
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: messages, // 필터링된 메시지 사용
})
```

### 방법 2: 수동 필터링

더 세밀한 제어가 필요한 경우:

```typescript
import { filterOversizedImages } from '@/lib/image-utils'

const { filteredMessages, skippedCount, skippedDetails } = filterOversizedImages(
  yourMessages,
  {
    skipOversized: true, // 큰 이미지 자동 스킵
    logSkipped: true,    // 콘솔에 로그 출력
  }
)

// 스킵된 이미지 상세 정보 확인
skippedDetails.forEach((detail) => {
  console.log(
    `메시지 ${detail.messageIndex}, 콘텐츠 ${detail.contentIndex}: ${formatImageSize(detail.size)}`
  )
})
```

### 방법 3: 이미지 압축

큰 이미지를 자동으로 압축합니다:

```typescript
import { processImageForClaude } from '@/lib/image-utils'

// 이미지 처리 (압축 또는 스킵)
const processedImage = await processImageForClaude(base64Image, {
  autoCompress: true,      // 자동 압축 시도
  skipIfOversized: true,   // 압축 실패 시 스킵
})

if (processedImage) {
  // 처리된 이미지 사용
  messages.push({
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: processedImage,
        },
      },
    ],
  })
} else {
  console.warn('이미지가 너무 커서 압축할 수 없습니다. 스킵됩니다.')
}
```

## Cursor/Claude Desktop에서 사용하기

Cursor나 Claude Desktop에서 직접 사용하는 경우, 다음 코드를 복사해서 사용하세요:

```typescript
// 이미지 필터링 헬퍼
function filterOversizedImages(messages: any[]) {
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  let skippedCount = 0

  const filtered = messages.map((msg, msgIdx) => {
    if (!Array.isArray(msg.content)) return msg

    const filteredContent = msg.content.filter((item: any, contentIdx: number) => {
      if (item.type === 'image' && item.source?.data) {
        const base64 = item.source.data.split(',')[1] || item.source.data
        const size = Math.ceil((base64.length * 3) / 4)

        if (size > MAX_SIZE) {
          skippedCount++
          console.warn(`⚠️ 이미지 제외: 메시지 ${msgIdx}, 콘텐츠 ${contentIdx} (${(size / 1024 / 1024).toFixed(2)}MB)`)
          return false // 제외
        }
      }
      return true
    })

    return { ...msg, content: filteredContent }
  })

  if (skippedCount > 0) {
    console.warn(`⚠️ 총 ${skippedCount}개의 이미지가 5MB 제한으로 제외되었습니다.`)
  }

  return filtered
}

// 사용 예시
const filteredMessages = filterOversizedImages(messages)
// filteredMessages를 Claude API에 전달
```

## 프롬프트로는 해결되지 않습니다

⚠️ **중요**: 프롬프트로 "큰 이미지를 무시하라"고 지시해도 **작동하지 않습니다**.

이유:
- API가 요청을 받는 즉시 이미지 크기를 검증합니다
- 5MB를 초과하면 요청 자체가 거부됩니다 (400 에러)
- Claude 모델이 이미지를 처리하기 전에 API 레벨에서 차단됩니다

따라서 **반드시 코드 레벨에서 필터링**해야 합니다.

## 유틸리티 함수 위치

프로젝트의 이미지 처리 유틸리티:
- **파일**: `src/lib/image-utils.ts`
- **주요 함수**:
  - `prepareClaudeMessages()` - 간편한 래퍼 함수
  - `filterOversizedImages()` - 세밀한 제어
  - `processImageForClaude()` - 이미지 압축
  - `getBase64ImageSize()` - 크기 계산
  - `formatImageSize()` - 포맷팅

## 추가 팁

### 이미지 크기 확인

```typescript
import { getBase64ImageSize, formatImageSize } from '@/lib/image-utils'

const size = getBase64ImageSize(base64String)
console.log(`이미지 크기: ${formatImageSize(size)}`)
// 출력: "이미지 크기: 16.56 MB"
```

### 이미지 압축 옵션

```typescript
import { compressImage } from '@/lib/image-utils'

const compressed = await compressImage(file, {
  maxWidth: 1920,   // 최대 너비
  maxHeight: 1080,  // 최대 높이
  quality: 0.8,    // JPEG 품질 (0-1)
  format: 'jpeg',  // 'jpeg' | 'webp' | 'png'
})
```

## 참고

- Claude API 이미지 크기 제한: **5MB**
- Base64 인코딩은 원본보다 약 33% 큽니다
- 큰 이미지는 압축하거나 URL로 전달하는 것을 권장합니다

