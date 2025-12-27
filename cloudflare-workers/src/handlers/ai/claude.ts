/**
 * Claude AI 핸들러
 * Cloudflare Workers Migration from Supabase Edge Function
 *
 * @endpoint POST /ai/chat - 채팅 요청
 * @endpoint POST /ai/chat/stream - 스트리밍 채팅 요청
 * @endpoint POST /ai/vision - 이미지 분석 요청
 * @endpoint POST /ai/vision/stream - 스트리밍 이미지 분석 요청
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAuth } from '../../middleware/auth';

const claudeAI = new Hono<AppType>();

// =============================================================================
// 상수 정의
// =============================================================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

// Rate Limit 설정
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1분
const RATE_LIMIT_MAX_REQUESTS = 20; // 분당 최대 요청

// =============================================================================
// 타입 정의
// =============================================================================

type MessageRole = 'user' | 'assistant';
type AnalysisType = 'general' | 'ui-design' | 'diagram' | 'screenshot' | 'wireframe';
type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

interface ChatMessage {
  role: MessageRole;
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  system?: string;
  stream?: boolean;
}

interface VisionImage {
  source: 'base64' | 'url';
  data: string;
  mediaType?: ImageMediaType;
}

interface VisionRequest {
  images: VisionImage[];
  prompt: string;
  analysisType?: AnalysisType;
  maxTokens?: number;
  model?: string;
  temperature?: number;
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

// =============================================================================
// Vision 분석 유형별 시스템 프롬프트
// =============================================================================

const ANALYSIS_SYSTEM_PROMPTS: Record<AnalysisType, string> = {
  general: `당신은 이미지 분석 전문가입니다.
주어진 이미지를 상세하게 분석하고 설명해주세요.

분석 항목:
1. 이미지의 주요 내용과 구성 요소
2. 색상, 레이아웃, 시각적 특징
3. 텍스트가 있다면 해당 내용
4. 이미지의 목적이나 맥락 추론

응답은 한국어로 작성하고, 구조화된 형식으로 정리해주세요.`,

  'ui-design': `당신은 UI/UX 디자인 전문가입니다.
주어진 이미지의 UI/UX 디자인을 전문적으로 분석해주세요.

분석 항목:
1. **레이아웃 구조**: 그리드 시스템, 정렬, 공간 활용
2. **시각적 계층**: 타이포그래피, 색상 대비, 강조 요소
3. **UI 컴포넌트**: 버튼, 입력 필드, 카드 등의 디자인 패턴
4. **사용성**: 네비게이션, 접근성, 인터랙션 힌트
5. **브랜딩**: 색상 팔레트, 아이콘 스타일, 전체적인 톤앤매너
6. **개선 제안**: 더 나은 사용자 경험을 위한 구체적인 제안

응답은 한국어로 작성하고, 각 항목별로 구조화하여 정리해주세요.`,

  diagram: `당신은 시스템 아키텍처와 프로세스 분석 전문가입니다.
주어진 다이어그램/플로우차트를 분석해주세요.

분석 항목:
1. **다이어그램 유형**: 플로우차트, 시퀀스 다이어그램, ER 다이어그램 등
2. **구성 요소**: 노드, 연결선, 레이블 등 각 요소의 의미
3. **흐름 분석**: 데이터 흐름, 프로세스 순서, 의사결정 포인트
4. **관계 파악**: 컴포넌트 간 연결, 의존성, 통신 방식
5. **전체 목적**: 다이어그램이 설명하려는 시스템이나 프로세스

응답은 한국어로 작성하고, 기술적 용어는 정확하게 사용해주세요.`,

  screenshot: `당신은 소프트웨어 및 웹 애플리케이션 분석 전문가입니다.
주어진 스크린샷을 분석해주세요.

분석 항목:
1. **애플리케이션 식별**: 어떤 종류의 앱/웹사이트인지
2. **화면 구성**: 헤더, 사이드바, 메인 콘텐츠, 푸터 등
3. **UI 요소**: 버튼, 메뉴, 폼, 테이블, 그래프 등
4. **텍스트 내용**: 보이는 텍스트의 주요 내용 추출
5. **현재 상태**: 어떤 작업이나 화면을 보여주는지
6. **기능 추정**: 이 화면에서 가능한 사용자 액션

응답은 한국어로 작성하고, 실용적인 관점에서 분석해주세요.`,

  wireframe: `당신은 제품 디자인 및 프로토타이핑 전문가입니다.
주어진 와이어프레임/목업을 분석해주세요.

분석 항목:
1. **화면 목적**: 이 와이어프레임이 표현하려는 기능/페이지
2. **정보 구조**: 콘텐츠의 우선순위와 배치
3. **사용자 흐름**: 예상되는 사용자 인터랙션 순서
4. **핵심 기능**: 와이어프레임에 표현된 주요 기능들
5. **컴포넌트 명세**: 각 UI 요소의 상세 설명
6. **구현 고려사항**: 개발 시 고려해야 할 기술적 포인트

응답은 한국어로 작성해주세요.`,
};

// =============================================================================
// Rate Limiting (KV 기반)
// =============================================================================

interface RateLimitInfo {
  requests: number;
  windowStart: number;
}

async function checkRateLimit(
  kv: KVNamespace,
  userId: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:claude:${userId}`;
  const now = Date.now();

  const cached = await kv.get<RateLimitInfo>(key, 'json');

  // 새 윈도우 시작 또는 윈도우 만료
  if (!cached || now - cached.windowStart >= RATE_LIMIT_WINDOW_MS) {
    await kv.put(
      key,
      JSON.stringify({ requests: 1, windowStart: now }),
      { expirationTtl: 120 } // 2분 TTL
    );
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  // 기존 윈도우 내 요청 수 체크
  if (cached.requests >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: cached.windowStart + RATE_LIMIT_WINDOW_MS,
    };
  }

  // 요청 카운트 증가
  await kv.put(
    key,
    JSON.stringify({ requests: cached.requests + 1, windowStart: cached.windowStart }),
    { expirationTtl: 120 }
  );

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - cached.requests - 1,
    resetAt: cached.windowStart + RATE_LIMIT_WINDOW_MS,
  };
}

// =============================================================================
// Claude API 호출
// =============================================================================

async function callClaudeAPI(
  apiKey: string,
  messages: ChatMessage[],
  options: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
    system?: string;
    stream?: boolean;
  }
): Promise<Response> {
  return fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      system: options.system,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: options.stream || false,
    }),
  });
}

async function callVisionAPI(
  apiKey: string,
  images: VisionImage[],
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    analysisType?: AnalysisType;
    stream?: boolean;
  }
): Promise<Response> {
  const systemPrompt = ANALYSIS_SYSTEM_PROMPTS[options.analysisType || 'general'];

  // 이미지 콘텐츠 구성
  const imageContents = images.map((image) => {
    if (image.source === 'url') {
      return {
        type: 'image',
        source: { type: 'url', url: image.data },
      };
    }
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mediaType,
        data: image.data,
      },
    };
  });

  const userContent = [
    ...imageContents,
    { type: 'text', text: prompt },
  ];

  return fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      stream: options.stream || false,
    }),
  });
}

// =============================================================================
// 로깅
// =============================================================================

async function logUsage(
  db: D1Database,
  userId: string,
  requestId: string,
  endpoint: string,
  success: boolean,
  data: {
    inputTokens?: number;
    outputTokens?: number;
    model?: string;
    latencyMs?: number;
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    await db
      .prepare(
        `
        INSERT INTO claude_usage_logs (
          id, user_id, request_id, endpoint, status_code, success,
          input_tokens, output_tokens, total_tokens, model, latency_ms,
          error_code, error_message, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `
      )
      .bind(
        crypto.randomUUID(),
        userId,
        requestId,
        endpoint,
        success ? 200 : 500,
        success ? 1 : 0,
        data.inputTokens || null,
        data.outputTokens || null,
        (data.inputTokens || 0) + (data.outputTokens || 0) || null,
        data.model || null,
        data.latencyMs || null,
        data.errorCode || null,
        data.errorMessage || null
      )
      .run();
  } catch (error) {
    console.error('로깅 오류:', error);
  }
}

// =============================================================================
// 핸들러
// =============================================================================

/**
 * POST /chat - 채팅 요청 (비스트리밍)
 */
claudeAI.post('/chat', requireAuth, async (c) => {
  const db = c.env.DB;
  const kv = c.env.RATE_LIMIT;
  const auth = c.get('auth')!;
  const requestId = c.req.header('CF-Ray') || crypto.randomUUID();

  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }, 500);
  }

  // Rate Limiting
  const rateLimit = await checkRateLimit(kv, auth.userId!);
  if (!rateLimit.allowed) {
    return c.json(
      {
        error: 'API 호출 한도를 초과했습니다.',
        retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      429,
      {
        'X-RateLimit-Remaining': '0',
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
      }
    );
  }

  let body: ChatRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '유효하지 않은 JSON 페이로드입니다.' }, 400);
  }

  // 필수 필드 검증
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: 'messages 필드가 필요합니다.' }, 400);
  }

  const startTime = Date.now();

  try {
    const response = await callClaudeAPI(apiKey, body.messages, {
      model: body.model,
      max_tokens: body.max_tokens,
      temperature: body.temperature,
      system: body.system,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API 오류: ${response.status}`);
    }

    const data = (await response.json()) as ClaudeResponse;
    const content = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const latencyMs = Date.now() - startTime;

    // 로깅
    await logUsage(db, auth.userId!, requestId, '/ai/chat', true, {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      model: data.model,
      latencyMs,
    });

    return c.json({
      success: true,
      data: {
        id: data.id,
        content,
        model: data.model,
        usage: {
          input_tokens: data.usage.input_tokens,
          output_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        stop_reason: data.stop_reason,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);

    await logUsage(db, auth.userId!, requestId, '/ai/chat', false, {
      errorCode: 'api_error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    });

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI 응답 생성 중 오류가 발생했습니다.',
      },
      500
    );
  }
});

/**
 * POST /chat/stream - 스트리밍 채팅 요청
 */
claudeAI.post('/chat/stream', requireAuth, async (c) => {
  const db = c.env.DB;
  const kv = c.env.RATE_LIMIT;
  const auth = c.get('auth')!;
  const requestId = c.req.header('CF-Ray') || crypto.randomUUID();

  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }, 500);
  }

  // Rate Limiting
  const rateLimit = await checkRateLimit(kv, auth.userId!);
  if (!rateLimit.allowed) {
    return c.json({ error: 'API 호출 한도를 초과했습니다.' }, 429);
  }

  let body: ChatRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '유효하지 않은 JSON 페이로드입니다.' }, 400);
  }

  if (!body.messages || body.messages.length === 0) {
    return c.json({ error: 'messages 필드가 필요합니다.' }, 400);
  }

  const startTime = Date.now();

  try {
    const response = await callClaudeAPI(apiKey, body.messages, {
      model: body.model,
      max_tokens: body.max_tokens,
      temperature: body.temperature,
      system: body.system,
      stream: true,
    });

    if (!response.ok) {
      throw new Error(`Claude API 오류: ${response.status}`);
    }

    // 스트리밍 응답을 TransformStream으로 변환
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 백그라운드에서 스트리밍 처리
    (async () => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'start', request_id: requestId })}\n\n`));

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  await writer.write(
                    encoder.encode(`data: ${JSON.stringify({ type: 'text', content: parsed.delta.text })}\n\n`)
                  );
                }
                if (parsed.type === 'message_stop') {
                  break;
                }
              } catch {
                // JSON 파싱 실패 무시
              }
            }
          }
        }

        await logUsage(db, auth.userId!, requestId, '/ai/chat/stream', true, {
          model: body.model || DEFAULT_MODEL,
          latencyMs: Date.now() - startTime,
        });

        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      } catch (error) {
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return c.json({ error: 'AI 스트리밍 응답 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * POST /vision - 이미지 분석 (비스트리밍)
 */
claudeAI.post('/vision', requireAuth, async (c) => {
  const db = c.env.DB;
  const kv = c.env.RATE_LIMIT;
  const auth = c.get('auth')!;
  const requestId = c.req.header('CF-Ray') || crypto.randomUUID();

  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }, 500);
  }

  // Rate Limiting
  const rateLimit = await checkRateLimit(kv, auth.userId!);
  if (!rateLimit.allowed) {
    return c.json({ error: 'API 호출 한도를 초과했습니다.' }, 429);
  }

  let body: VisionRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '유효하지 않은 JSON 페이로드입니다.' }, 400);
  }

  // 검증
  if (!body.images || body.images.length === 0) {
    return c.json({ error: '최소 1개의 이미지가 필요합니다.' }, 400);
  }
  if (body.images.length > 10) {
    return c.json({ error: '이미지는 최대 10개까지만 지원됩니다.' }, 400);
  }
  if (!body.prompt) {
    return c.json({ error: '분석 요청 프롬프트가 필요합니다.' }, 400);
  }

  const startTime = Date.now();

  try {
    const response = await callVisionAPI(apiKey, body.images, body.prompt, {
      model: body.model,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      analysisType: body.analysisType,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude Vision API error:', response.status, errorText);
      throw new Error(`Claude Vision API 오류: ${response.status}`);
    }

    const data = (await response.json()) as ClaudeResponse;
    const analysis = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const latencyMs = Date.now() - startTime;

    await logUsage(db, auth.userId!, requestId, '/ai/vision', true, {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      model: data.model,
      latencyMs,
    });

    return c.json({
      success: true,
      data: {
        analysis,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
        },
        model: data.model,
        id: data.id,
        stopReason: data.stop_reason,
      },
    });
  } catch (error) {
    console.error('Vision error:', error);

    await logUsage(db, auth.userId!, requestId, '/ai/vision', false, {
      errorCode: 'api_error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    });

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '이미지 분석 중 오류가 발생했습니다.',
      },
      500
    );
  }
});

/**
 * POST /vision/stream - 스트리밍 이미지 분석
 */
claudeAI.post('/vision/stream', requireAuth, async (c) => {
  const db = c.env.DB;
  const kv = c.env.RATE_LIMIT;
  const auth = c.get('auth')!;
  const requestId = c.req.header('CF-Ray') || crypto.randomUUID();

  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }, 500);
  }

  // Rate Limiting
  const rateLimit = await checkRateLimit(kv, auth.userId!);
  if (!rateLimit.allowed) {
    return c.json({ error: 'API 호출 한도를 초과했습니다.' }, 429);
  }

  let body: VisionRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '유효하지 않은 JSON 페이로드입니다.' }, 400);
  }

  if (!body.images || body.images.length === 0 || !body.prompt) {
    return c.json({ error: '이미지와 프롬프트가 필요합니다.' }, 400);
  }

  const startTime = Date.now();

  try {
    const response = await callVisionAPI(apiKey, body.images, body.prompt, {
      model: body.model,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      analysisType: body.analysisType,
      stream: true,
    });

    if (!response.ok) {
      throw new Error(`Claude Vision API 오류: ${response.status}`);
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'start', request_id: requestId })}\n\n`));

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  await writer.write(
                    encoder.encode(`data: ${JSON.stringify({ type: 'text', content: parsed.delta.text })}\n\n`)
                  );
                }
              } catch {
                // ignore
              }
            }
          }
        }

        await logUsage(db, auth.userId!, requestId, '/ai/vision/stream', true, {
          model: body.model || DEFAULT_MODEL,
          latencyMs: Date.now() - startTime,
        });

        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      } catch (error) {
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    console.error('Vision stream error:', error);
    return c.json({ error: '이미지 스트리밍 분석 중 오류가 발생했습니다.' }, 500);
  }
});

export default claudeAI;
