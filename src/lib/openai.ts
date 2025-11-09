/**
 * OpenAI API Client
 *
 * OpenAI GPT 모델을 사용한 채팅 기능
 * - 스트리밍 응답 지원
 * - 컨텍스트 관리
 * - 에러 핸들링
 */

import OpenAI from 'openai'
import { devError } from '@/lib/errors'

// OpenAI 클라이언트 초기화
export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // 브라우저에서 직접 호출 (프로덕션에서는 백엔드 권장)
})

// 모델 설정
export const OPENAI_MODEL = (import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo') as string

// 시스템 프롬프트 (프로젝트 컨텍스트)
export const SYSTEM_PROMPT = `당신은 VIBE WORKING (생각과행동, IdeaonAction)의 AI 어시스턴트입니다.

회사 정보:
- 회사명: 생각과행동 (IdeaonAction)
- 슬로건: KEEP AWAKE, LIVE PASSIONATE
- 목적: AI 기반 워킹 솔루션 제공
- 웹사이트: https://www.ideaonaction.ai/

주요 서비스:
1. AI 기반 업무 자동화 솔루션
2. 데이터 분석 및 인사이트 제공
3. 맞춤형 워크플로우 최적화
4. 실시간 협업 도구

당신의 역할:
- 사용자의 질문에 친절하고 정확하게 답변
- 회사 서비스에 대한 상세 정보 제공
- 기술 문의 및 문제 해결 지원
- 한국어와 영어 모두 지원

답변 스타일:
- 친절하고 전문적인 톤
- 간결하고 명확한 설명
- 필요시 구체적인 예시 제공
- 마크다운 포맷 사용 (코드 블록, 리스트 등)

제한사항:
- 회사 서비스 외 질문은 정중히 안내
- 개인정보 수집 금지
- 부적절한 요청은 거절`

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
}

/**
 * 채팅 완료 요청 (비스트리밍)
 */
export async function createChatCompletion(
  options: ChatCompletionOptions
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      stream: false,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    devError(error, { service: 'OpenAI', operation: '채팅 완료 요청' })
    throw new Error('채팅 응답을 받는 중 오류가 발생했습니다.')
  }
}

/**
 * 채팅 완료 요청 (스트리밍)
 */
export async function* createChatCompletionStream(
  options: ChatCompletionOptions
): AsyncGenerator<string, void, unknown> {
  try {
    const stream = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        yield content
      }
    }
  } catch (error) {
    devError(error, { service: 'OpenAI', operation: '스트리밍 응답' })
    throw new Error('스트리밍 응답 중 오류가 발생했습니다.')
  }
}

/**
 * 메시지 배열에 시스템 프롬프트 추가
 */
export function addSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
  // 이미 시스템 메시지가 있으면 그대로 반환
  if (messages.some((msg) => msg.role === 'system')) {
    return messages
  }

  // 시스템 프롬프트를 첫 번째에 추가
  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    ...messages,
  ]
}

/**
 * 컨텍스트 길이 제한 (최근 N개 메시지만 유지)
 */
export function limitContext(
  messages: ChatMessage[],
  maxMessages: number = 20
): ChatMessage[] {
  // 시스템 메시지는 항상 유지
  const systemMessages = messages.filter((msg) => msg.role === 'system')
  const otherMessages = messages.filter((msg) => msg.role !== 'system')

  // 최근 메시지만 유지
  const recentMessages = otherMessages.slice(-maxMessages)

  return [...systemMessages, ...recentMessages]
}
