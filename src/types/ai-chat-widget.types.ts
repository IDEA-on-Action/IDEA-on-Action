/**
 * AI 채팅 위젯 타입 정의
 *
 * @description
 * AI 채팅 위젯의 메시지, 상태, 페이지 컨텍스트 타입을 정의합니다.
 */

/**
 * AI 채팅 메시지
 */
export interface AIChatMessage {
  /** 메시지 고유 ID */
  id: string;
  /** 메시지 역할 (사용자 또는 AI) */
  role: 'user' | 'assistant';
  /** 메시지 내용 (마크다운 지원) */
  content: string;
  /** 메시지 생성 시간 */
  timestamp: Date;
  /** 스트리밍 중인지 여부 */
  isStreaming?: boolean;
}

/**
 * AI 채팅 위젯 상태
 */
export interface AIChatState {
  /** 채팅창 열림 여부 */
  isOpen: boolean;
  /** 채팅창 최소화 여부 */
  isMinimized: boolean;
  /** 메시지 목록 */
  messages: AIChatMessage[];
  /** 현재 대화 ID (로그인 시 저장용) */
  conversationId: string | null;
  /** 로딩 상태 */
  isLoading: boolean;
}

/**
 * 페이지 컨텍스트
 *
 * @description
 * 현재 페이지의 URL과 서비스 정보를 추출하여 AI에게 컨텍스트 제공
 */
export interface PageContext {
  /** 현재 페이지 경로 */
  path: string;
  /** 서비스 ID (서비스 페이지인 경우) */
  serviceId?: string;
  /** 서비스 이름 (서비스 페이지인 경우) */
  serviceName?: string;
  /** 페이지 타입 */
  pageType: 'home' | 'service' | 'admin' | 'other';
}

/**
 * AI 채팅 위젯 설정
 */
export interface AIChatConfig {
  /** 위젯 위치 */
  position: 'bottom-right' | 'bottom-left';
  /** 기본 열림 여부 */
  defaultOpen?: boolean;
  /** 시스템 프롬프트 (페이지별 맞춤 가능) */
  systemPrompt?: string;
}

/**
 * AI 채팅 응답 옵션
 */
export interface AIChatResponseOptions {
  /** 스트리밍 활성화 여부 */
  streaming?: boolean;
  /** 최대 토큰 수 */
  maxTokens?: number;
  /** Temperature (0~1) */
  temperature?: number;
}
