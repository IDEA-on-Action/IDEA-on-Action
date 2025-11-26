/**
 * useClaudeVision Hook
 *
 * Claude Vision API를 사용한 이미지 분석 기능을 위한 React Hook
 * - React Query mutation 기반
 * - 스트리밍 응답 지원
 * - 로딩/에러 상태 관리
 * - 토큰 사용량 추적
 *
 * @version 1.0.0
 */

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { devError } from '@/lib/errors'
import type {
  VisionRequest,
  VisionResponse,
  VisionError,
  UseClaudeVisionOptions,
  UseClaudeVisionReturn,
  AnalysisType,
  VisionImage,
} from '@/types/vision.types'
import { createVisionError, DEFAULT_VISION_OPTIONS } from '@/types/vision.types'
import type { ClaudeUsage } from '@/types/claude.types'

// ============================================================================
// 상수
// ============================================================================

const SUPABASE_FUNCTION_URL = '/functions/v1/claude-ai'

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 인증 토큰 가져오기
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (err) {
    devError(err, { operation: '인증 토큰 가져오기' })
    return null
  }
}

// ============================================================================
// API 호출 함수
// ============================================================================

/**
 * Vision API 호출 (비스트리밍)
 */
async function callVisionAPI(request: VisionRequest): Promise<VisionResponse> {
  const token = await getAuthToken()
  if (!token) {
    throw createVisionError('UNAUTHORIZED', '인증이 필요합니다. 로그인 후 다시 시도해주세요.')
  }

  const { data, error } = await supabase.functions.invoke('claude-ai/vision', {
    body: {
      images: request.images,
      prompt: request.prompt,
      analysisType: request.analysisType,
      maxTokens: request.maxTokens,
      model: request.model,
      temperature: request.temperature,
    },
  })

  if (error) {
    throw createVisionError('API_ERROR', error.message || 'AI 응답을 받는 중 오류가 발생했습니다.')
  }

  interface APIResponseData {
    success: boolean
    data?: {
      analysis: string
      usage: {
        inputTokens: number
        outputTokens: number
      }
      model?: string
      id?: string
      stopReason?: string
    }
    error?: {
      code: string
      message: string
    }
  }

  const responseData = data as APIResponseData

  if (!responseData.success || !responseData.data) {
    throw createVisionError('API_ERROR', responseData.error?.message || 'AI 응답을 받는 중 오류가 발생했습니다.')
  }

  return responseData.data
}

/**
 * Vision API 스트리밍 호출
 */
async function* callVisionAPIStream(
  request: VisionRequest
): AsyncGenerator<string, VisionResponse | null, unknown> {
  const token = await getAuthToken()
  if (!token) {
    throw createVisionError('UNAUTHORIZED', '인증이 필요합니다. 로그인 후 다시 시도해주세요.')
  }

  // Supabase Functions URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const functionUrl = `${supabaseUrl}${SUPABASE_FUNCTION_URL}/vision/stream`

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      images: request.images,
      prompt: request.prompt,
      analysisType: request.analysisType,
      maxTokens: request.maxTokens,
      model: request.model,
      temperature: request.temperature,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw createVisionError('API_ERROR', `스트리밍 오류: ${response.status} - ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw createVisionError('NETWORK_ERROR', '응답 스트림을 읽을 수 없습니다.')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE 형식 파싱
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data) as {
              type: 'start' | 'text' | 'done' | 'error'
              content?: string
              error?: string
            }

            // 텍스트 청크
            if (parsed.type === 'text' && parsed.content) {
              fullContent += parsed.content
              yield parsed.content
            }

            // 에러
            if (parsed.type === 'error') {
              throw createVisionError('API_ERROR', parsed.error || '스트리밍 중 오류가 발생했습니다.')
            }
          } catch (parseError) {
            // JSON 파싱 실패는 무시 (불완전한 데이터일 수 있음)
            if (parseError instanceof Error && parseError.message.includes('스트리밍 중 오류')) {
              throw parseError
            }
            continue
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  // 스트리밍에서는 정확한 토큰 수를 알 수 없음
  return {
    analysis: fullContent,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
    },
  }
}

// ============================================================================
// 메인 훅
// ============================================================================

/**
 * useClaudeVision Hook
 *
 * @param options - 훅 옵션
 * @returns Vision API 관련 상태와 함수
 *
 * @example
 * ```tsx
 * const {
 *   analyzeImage,
 *   analyzeImageStream,
 *   isAnalyzing,
 *   error,
 *   reset,
 * } = useClaudeVision({
 *   defaultAnalysisType: 'ui-design',
 *   onSuccess: (response) => console.log('분석 완료:', response.analysis),
 * });
 *
 * // 파일 분석
 * const file = event.target.files[0];
 * const image = await fileToVisionImage(file);
 * await analyzeImage({
 *   images: [image],
 *   prompt: '이 UI를 분석해주세요',
 * });
 * ```
 */
export function useClaudeVision(options: UseClaudeVisionOptions = {}): UseClaudeVisionReturn {
  const {
    defaultAnalysisType = DEFAULT_VISION_OPTIONS.analysisType,
    defaultMaxTokens = DEFAULT_VISION_OPTIONS.maxTokens,
    defaultModel,
    defaultTemperature = DEFAULT_VISION_OPTIONS.temperature,
    onSuccess,
    onError,
    onStreamChunk,
  } = options

  // 상태
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<VisionError | null>(null)
  const [lastResponse, setLastResponse] = useState<VisionResponse | null>(null)
  const [lastUsage, setLastUsage] = useState<ClaudeUsage | null>(null)

  // React Query mutation (비스트리밍용)
  const mutation = useMutation({
    mutationFn: async (request: VisionRequest) => {
      return callVisionAPI({
        ...request,
        analysisType: request.analysisType || defaultAnalysisType,
        maxTokens: request.maxTokens || defaultMaxTokens,
        model: request.model || defaultModel,
        temperature: request.temperature ?? defaultTemperature,
      })
    },
    onSuccess: (data) => {
      setLastResponse(data)
      setLastUsage({
        input_tokens: data.usage.inputTokens,
        output_tokens: data.usage.outputTokens,
      })
      setError(null)
      onSuccess?.(data)
    },
    onError: (err) => {
      const visionError = err as VisionError
      setError(visionError)
      onError?.(visionError)
    },
  })

  /**
   * 이미지 분석 (비스트리밍)
   */
  const analyzeImage = useCallback(
    async (request: VisionRequest): Promise<VisionResponse> => {
      setError(null)

      const result = await mutation.mutateAsync({
        ...request,
        analysisType: request.analysisType || defaultAnalysisType,
        maxTokens: request.maxTokens || defaultMaxTokens,
        model: request.model || defaultModel,
        temperature: request.temperature ?? defaultTemperature,
      })

      return result
    },
    [mutation, defaultAnalysisType, defaultMaxTokens, defaultModel, defaultTemperature]
  )

  /**
   * 이미지 분석 (스트리밍)
   */
  const analyzeImageStream = useCallback(
    async (
      request: VisionRequest,
      onChunk: (text: string) => void
    ): Promise<VisionResponse> => {
      setError(null)
      setIsStreaming(true)

      try {
        const streamRequest = {
          ...request,
          analysisType: request.analysisType || defaultAnalysisType,
          maxTokens: request.maxTokens || defaultMaxTokens,
          model: request.model || defaultModel,
          temperature: request.temperature ?? defaultTemperature,
          stream: true,
        }

        let fullContent = ''

        for await (const chunk of callVisionAPIStream(streamRequest)) {
          if (typeof chunk === 'string') {
            fullContent += chunk
            onChunk(chunk)
            onStreamChunk?.(chunk)
          }
        }

        const response: VisionResponse = {
          analysis: fullContent,
          usage: {
            inputTokens: 0,
            outputTokens: 0,
          },
        }

        setLastResponse(response)
        onSuccess?.(response)

        return response
      } catch (err) {
        const visionError = err as VisionError
        setError(visionError)
        onError?.(visionError)
        throw visionError
      } finally {
        setIsStreaming(false)
      }
    },
    [defaultAnalysisType, defaultMaxTokens, defaultModel, defaultTemperature, onSuccess, onError, onStreamChunk]
  )

  /**
   * 상태 리셋
   */
  const reset = useCallback(() => {
    setError(null)
    setLastResponse(null)
    setLastUsage(null)
    mutation.reset()
  }, [mutation])

  return {
    analyzeImage,
    analyzeImageStream,
    isAnalyzing: mutation.isPending || isStreaming,
    isStreaming,
    error,
    reset,
    lastResponse,
    lastUsage,
  }
}

// ============================================================================
// 편의 훅
// ============================================================================

/**
 * UI 디자인 분석 전용 훅
 */
export function useUIDesignAnalysis(
  options: Omit<UseClaudeVisionOptions, 'defaultAnalysisType'> = {}
): UseClaudeVisionReturn {
  return useClaudeVision({
    ...options,
    defaultAnalysisType: 'ui-design',
  })
}

/**
 * 다이어그램 분석 전용 훅
 */
export function useDiagramAnalysis(
  options: Omit<UseClaudeVisionOptions, 'defaultAnalysisType'> = {}
): UseClaudeVisionReturn {
  return useClaudeVision({
    ...options,
    defaultAnalysisType: 'diagram',
  })
}

/**
 * 스크린샷 분석 전용 훅
 */
export function useScreenshotAnalysis(
  options: Omit<UseClaudeVisionOptions, 'defaultAnalysisType'> = {}
): UseClaudeVisionReturn {
  return useClaudeVision({
    ...options,
    defaultAnalysisType: 'screenshot',
  })
}

/**
 * 와이어프레임 분석 전용 훅
 */
export function useWireframeAnalysis(
  options: Omit<UseClaudeVisionOptions, 'defaultAnalysisType'> = {}
): UseClaudeVisionReturn {
  return useClaudeVision({
    ...options,
    defaultAnalysisType: 'wireframe',
  })
}

/**
 * 기본 내보내기
 */
export default useClaudeVision
