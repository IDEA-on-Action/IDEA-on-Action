/**
 * A2UI (Agent-to-UI) 타입 정의
 * @see https://a2ui.org/
 */

// ============================================================================
// 기본 타입
// ============================================================================

/** A2UI 컴포넌트 정의 */
export interface A2UIComponent {
  /** 컴포넌트 고유 ID */
  id: string;
  /** 컴포넌트 타입 (Text, Button, Card 등) */
  component: string;
  /** 자식 컴포넌트 ID 배열 */
  children?: string[];
  /** 컴포넌트별 속성 */
  [key: string]: unknown;
}

/** A2UI 메시지 (Claude Tool 결과) */
export interface A2UIMessage {
  /** Surface ID */
  surfaceId: string;
  /** 카탈로그 ID */
  catalogId?: string;
  /** 컴포넌트 배열 */
  components: A2UIComponent[];
  /** 데이터 모델 */
  data?: Record<string, unknown>;
}

/** A2UI Surface 타입 */
export type A2UISurfaceType = 'inline' | 'sidePanel' | 'modal';

/** A2UI Surface 정의 */
export interface A2UISurface {
  /** Surface ID */
  surfaceId: string;
  /** Surface 타입 */
  type: A2UISurfaceType;
  /** 카탈로그 ID */
  catalogId: string;
  /** 현재 컴포넌트 트리 */
  components: A2UIComponent[];
  /** 데이터 모델 */
  data: Record<string, unknown>;
}

// ============================================================================
// 사용자 액션 타입
// ============================================================================

/** 사용자 액션 정의 */
export interface A2UIUserAction {
  /** 액션 타입 */
  action: string;
  /** 액션 데이터 */
  data?: Record<string, unknown>;
  /** 컴포넌트 ID */
  componentId?: string;
  /** 데이터 모델 경로 */
  dataPath?: string;
}

/** 액션 핸들러 타입 */
export type A2UIActionHandler = (action: A2UIUserAction) => void | Promise<void>;

// ============================================================================
// 컴포넌트 속성 타입
// ============================================================================

/** Text 컴포넌트 속성 */
export interface A2UITextProps {
  text: string;
  variant?: 'default' | 'heading' | 'muted' | 'code';
}

/** Button 컴포넌트 속성 */
export interface A2UIButtonProps {
  text: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  onClick?: A2UIUserAction;
}

/** Card 컴포넌트 속성 */
export interface A2UICardProps {
  title?: string;
  description?: string;
  children?: string[];
}

/** Badge 컴포넌트 속성 */
export interface A2UIBadgeProps {
  text: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
}

/** Alert 컴포넌트 속성 */
export interface A2UIAlertProps {
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
}

/** Row 컴포넌트 속성 */
export interface A2UIRowProps {
  gap?: 'none' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  justify?: 'start' | 'center' | 'end' | 'between';
  children?: string[];
}

/** Column 컴포넌트 속성 */
export interface A2UIColumnProps {
  gap?: 'none' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  children?: string[];
}

/** Separator 컴포넌트 속성 */
export interface A2UISeparatorProps {
  orientation?: 'horizontal' | 'vertical';
}

// ============================================================================
// 데이터 바인딩 타입
// ============================================================================

/** 데이터 바인딩 정의 */
export interface A2UIDataBinding {
  /** JSON Pointer 경로 */
  path: string;
  /** 바인딩 모드 */
  mode?: 'read' | 'write' | 'both';
}

/** 데이터 모델 업데이트 */
export interface A2UIDataModelUpdate {
  /** Surface ID */
  surfaceId: string;
  /** JSON Pointer 경로 */
  path: string;
  /** 연산 타입 */
  op: 'replace' | 'add' | 'remove';
  /** 새 값 */
  value?: unknown;
}

// ============================================================================
// 렌더러 타입
// ============================================================================

/** 렌더러 컨텍스트 */
export interface A2UIRendererContext {
  /** Surface ID */
  surfaceId: string;
  /** 데이터 모델 */
  data: Record<string, unknown>;
  /** 액션 핸들러 */
  onAction: A2UIActionHandler;
  /** 컴포넌트 맵 (ID → 컴포넌트) */
  componentMap: Map<string, A2UIComponent>;
}

/** 렌더러 Props */
export interface A2UIRendererProps {
  /** A2UI 메시지 */
  message: A2UIMessage;
  /** 액션 핸들러 */
  onAction?: A2UIActionHandler;
  /** 추가 클래스명 */
  className?: string;
  /** 폼 데이터 (외부에서 관리되는 경우) */
  formData?: Record<string, unknown>;
  /** 폼 값 변경 핸들러 */
  onFormValueChange?: (path: string, value: unknown) => void;
}

// ============================================================================
// Tool 결과 타입
// ============================================================================

/** render_ui Tool 입력 */
export interface RenderUIToolInput {
  /** Surface ID (기본: 자동 생성) */
  surfaceId?: string;
  /** 컴포넌트 배열 */
  components: A2UIComponent[];
  /** 데이터 모델 */
  data?: Record<string, unknown>;
}

/** render_ui Tool 결과 */
export interface RenderUIToolResult {
  /** 결과 타입 */
  type: 'a2ui';
  /** A2UI 메시지 */
  message: A2UIMessage;
}

// ============================================================================
// 채팅 통합 타입
// ============================================================================

/** AI 채팅 A2UI 블록 */
export interface AIChatA2UIBlock {
  /** 블록 ID */
  id: string;
  /** A2UI 메시지 */
  message: A2UIMessage;
  /** 생성 시각 */
  createdAt: Date;
}
