/**
 * A2UI 컴포넌트 카탈로그
 * 허용된 컴포넌트와 속성 스키마 정의
 */

// ============================================================================
// 카탈로그 타입
// ============================================================================

/** 컴포넌트 정의 */
export interface ComponentDefinition {
  /** 컴포넌트 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 허용된 속성 */
  allowedProps: string[];
  /** children 허용 여부 */
  allowChildren: boolean;
  /** 허용된 자식 컴포넌트 타입 (null = 모든 타입) */
  allowedChildTypes?: string[] | null;
  /** 데이터 바인딩 지원 속성 */
  bindableProps?: string[];
  /** userAction 트리거 속성 */
  actionProps?: string[];
}

/** 카탈로그 정의 */
export interface ComponentCatalog {
  /** 카탈로그 ID */
  catalogId: string;
  /** 버전 */
  version: string;
  /** 컴포넌트 맵 */
  components: Record<string, ComponentDefinition>;
}

// ============================================================================
// 기본 카탈로그 정의
// ============================================================================

export const DEFAULT_CATALOG: ComponentCatalog = {
  catalogId: 'ideaonaction-chat-v1',
  version: '1.0.0',
  components: {
    // ========================================================================
    // 텍스트 컴포넌트
    // ========================================================================
    Text: {
      name: 'Text',
      description: '텍스트 표시 (마크다운 지원)',
      allowedProps: ['text', 'variant'],
      allowChildren: false,
      bindableProps: ['text'],
    },

    // ========================================================================
    // 버튼 컴포넌트
    // ========================================================================
    Button: {
      name: 'Button',
      description: '클릭 가능한 버튼',
      allowedProps: ['text', 'variant', 'size', 'disabled', 'onClick'],
      allowChildren: false,
      actionProps: ['onClick'],
    },

    // ========================================================================
    // 카드 컴포넌트
    // ========================================================================
    Card: {
      name: 'Card',
      description: '정보 카드 컨테이너',
      allowedProps: ['title', 'description'],
      allowChildren: true,
      allowedChildTypes: null, // 모든 타입 허용
    },

    // ========================================================================
    // 뱃지 컴포넌트
    // ========================================================================
    Badge: {
      name: 'Badge',
      description: '상태/라벨 뱃지',
      allowedProps: ['text', 'variant'],
      allowChildren: false,
      bindableProps: ['text', 'variant'],
    },

    // ========================================================================
    // 알림 컴포넌트
    // ========================================================================
    Alert: {
      name: 'Alert',
      description: '알림 메시지',
      allowedProps: ['title', 'description', 'variant'],
      allowChildren: false,
    },

    // ========================================================================
    // 레이아웃 컴포넌트
    // ========================================================================
    Row: {
      name: 'Row',
      description: '가로 레이아웃',
      allowedProps: ['gap', 'align', 'justify'],
      allowChildren: true,
      allowedChildTypes: null,
    },

    Column: {
      name: 'Column',
      description: '세로 레이아웃',
      allowedProps: ['gap', 'align'],
      allowChildren: true,
      allowedChildTypes: null,
    },

    // ========================================================================
    // 구분선 컴포넌트
    // ========================================================================
    Separator: {
      name: 'Separator',
      description: '구분선',
      allowedProps: ['orientation'],
      allowChildren: false,
    },

    // ========================================================================
    // 폼 컴포넌트
    // ========================================================================
    TextField: {
      name: 'TextField',
      description: '텍스트 입력 필드',
      allowedProps: ['label', 'placeholder', 'value', 'disabled', 'required', 'type', 'bind', 'onChange'],
      allowChildren: false,
      bindableProps: ['value'],
      actionProps: ['onChange'],
    },

    Select: {
      name: 'Select',
      description: '선택 드롭다운',
      allowedProps: ['label', 'placeholder', 'value', 'options', 'disabled', 'required', 'bind', 'onChange'],
      allowChildren: false,
      bindableProps: ['value'],
      actionProps: ['onChange'],
    },

    Checkbox: {
      name: 'Checkbox',
      description: '체크박스',
      allowedProps: ['label', 'checked', 'disabled', 'bind', 'onChange'],
      allowChildren: false,
      bindableProps: ['checked'],
      actionProps: ['onChange'],
    },

    DatePicker: {
      name: 'DatePicker',
      description: '날짜 선택기',
      allowedProps: ['label', 'value', 'disabled', 'required', 'placeholder', 'bind', 'onChange'],
      allowChildren: false,
      bindableProps: ['value'],
      actionProps: ['onChange'],
    },

    Textarea: {
      name: 'Textarea',
      description: '여러 줄 텍스트 입력',
      allowedProps: ['label', 'placeholder', 'value', 'disabled', 'required', 'rows', 'bind', 'onChange'],
      allowChildren: false,
      bindableProps: ['value'],
      actionProps: ['onChange'],
    },

    // ========================================================================
    // 데이터 표시 컴포넌트
    // ========================================================================
    Table: {
      name: 'Table',
      description: '데이터 테이블',
      allowedProps: ['columns', 'rows', 'actions', 'emptyMessage', 'striped', 'hoverable'],
      allowChildren: false,
      actionProps: ['actions'],
    },

    List: {
      name: 'List',
      description: '리스트 컨테이너',
      allowedProps: ['variant', 'gap'],
      allowChildren: true,
      allowedChildTypes: ['ListItem'],
    },

    ListItem: {
      name: 'ListItem',
      description: '리스트 아이템',
      allowedProps: ['title', 'description', 'leading', 'trailing', 'clickable', 'disabled', 'onClick'],
      allowChildren: false,
      actionProps: ['onClick'],
    },

    // ========================================================================
    // 로딩/프로그레스 컴포넌트
    // ========================================================================
    Spinner: {
      name: 'Spinner',
      description: '로딩 스피너',
      allowedProps: ['size', 'label', 'centered'],
      allowChildren: false,
    },

    Progress: {
      name: 'Progress',
      description: '진행률 바',
      allowedProps: ['value', 'max', 'label', 'showPercent', 'size', 'variant'],
      allowChildren: false,
      bindableProps: ['value'],
    },

    Skeleton: {
      name: 'Skeleton',
      description: '스켈레톤 로딩',
      allowedProps: ['variant', 'width', 'height', 'lines', 'noAnimation'],
      allowChildren: false,
    },

    // ========================================================================
    // 차트 컴포넌트
    // ========================================================================
    BarChart: {
      name: 'BarChart',
      description: '막대 차트',
      allowedProps: ['data', 'xAxisKey', 'series', 'title', 'xAxisLabel', 'yAxisLabel', 'showGrid', 'showLegend', 'showTooltip', 'height', 'horizontal'],
      allowChildren: false,
      bindableProps: ['data'],
    },

    LineChart: {
      name: 'LineChart',
      description: '선 차트',
      allowedProps: ['data', 'xAxisKey', 'series', 'title', 'xAxisLabel', 'yAxisLabel', 'showGrid', 'showLegend', 'showTooltip', 'height', 'curveType'],
      allowChildren: false,
      bindableProps: ['data'],
    },

    PieChart: {
      name: 'PieChart',
      description: '파이/도넛 차트',
      allowedProps: ['data', 'title', 'donut', 'centerLabel', 'centerValue', 'showLegend', 'showTooltip', 'height', 'width', 'showLabels'],
      allowChildren: false,
      bindableProps: ['data'],
    },

    // ========================================================================
    // 고급 인터랙션 컴포넌트
    // ========================================================================
    Accordion: {
      name: 'Accordion',
      description: '접이식 패널',
      allowedProps: ['items', 'type', 'defaultValue', 'collapsible'],
      allowChildren: true,
      allowedChildTypes: null,
    },

    Tabs: {
      name: 'Tabs',
      description: '탭 인터페이스',
      allowedProps: ['tabs', 'defaultValue', 'align'],
      allowChildren: true,
      allowedChildTypes: null,
    },

    Modal: {
      name: 'Modal',
      description: '모달 다이얼로그',
      allowedProps: ['title', 'description', 'triggerText', 'triggerVariant', 'content', 'confirmText', 'cancelText', 'onConfirm', 'onCancel', 'size'],
      allowChildren: true,
      allowedChildTypes: null,
      actionProps: ['onConfirm', 'onCancel'],
    },

    Drawer: {
      name: 'Drawer',
      description: '하단 드로어',
      allowedProps: ['title', 'description', 'triggerText', 'triggerVariant', 'content', 'confirmText', 'cancelText', 'onConfirm', 'onCancel'],
      allowChildren: true,
      allowedChildTypes: null,
      actionProps: ['onConfirm', 'onCancel'],
    },

    // ========================================================================
    // 미디어 컴포넌트
    // ========================================================================
    Image: {
      name: 'Image',
      description: '이미지',
      allowedProps: ['src', 'alt', 'width', 'height', 'aspectRatio', 'objectFit', 'rounded', 'caption', 'fallbackText'],
      allowChildren: false,
      bindableProps: ['src'],
    },

    Avatar: {
      name: 'Avatar',
      description: '사용자 아바타',
      allowedProps: ['src', 'alt', 'fallback', 'size', 'status'],
      allowChildren: false,
      bindableProps: ['src', 'status'],
    },

    Video: {
      name: 'Video',
      description: '비디오 플레이어',
      allowedProps: ['src', 'poster', 'title', 'width', 'height', 'aspectRatio', 'controls', 'autoPlay', 'loop', 'muted', 'rounded', 'caption'],
      allowChildren: false,
      bindableProps: ['src'],
    },

    Audio: {
      name: 'Audio',
      description: '오디오 플레이어',
      allowedProps: ['src', 'title', 'artist', 'cover', 'controls', 'autoPlay', 'loop', 'muted', 'compact'],
      allowChildren: false,
      bindableProps: ['src'],
    },
  },
};

// ============================================================================
// 카탈로그 유틸리티
// ============================================================================

/** 허용된 컴포넌트 목록 */
export const ALLOWED_COMPONENTS = new Set(Object.keys(DEFAULT_CATALOG.components));

/** 컴포넌트가 허용되었는지 확인 */
export function isAllowedComponent(name: string): boolean {
  return ALLOWED_COMPONENTS.has(name);
}

/** 컴포넌트 정의 가져오기 */
export function getComponentDefinition(name: string): ComponentDefinition | undefined {
  return DEFAULT_CATALOG.components[name];
}

/** 속성이 허용되었는지 확인 */
export function isAllowedProp(componentName: string, propName: string): boolean {
  const definition = getComponentDefinition(componentName);
  if (!definition) return false;

  // children은 항상 허용 (allowChildren이 true인 경우)
  if (propName === 'children') return definition.allowChildren;

  // id, component는 기본 속성
  if (propName === 'id' || propName === 'component') return true;

  return definition.allowedProps.includes(propName);
}

/** 속성 필터링 (허용된 속성만 반환) */
export function filterAllowedProps(
  componentName: string,
  props: Record<string, unknown>
): Record<string, unknown> {
  const definition = getComponentDefinition(componentName);
  if (!definition) return {};

  return Object.fromEntries(
    Object.entries(props).filter(([key]) => isAllowedProp(componentName, key))
  );
}

// ============================================================================
// 액션 검증
// ============================================================================

/** 허용된 액션 목록 */
export const ALLOWED_ACTIONS = new Set([
  // 조회 액션
  'view_issue',
  'view_event',
  'view_project',
  'view_service',

  // 생성 액션
  'create_issue',
  'create_event',

  // 수정 액션
  'update_issue',
  'update_event',

  // UI 액션
  'navigate',
  'refresh',
  'dismiss',
  'expand',
  'collapse',

  // 폼 액션
  'submit',
  'cancel',
  'reset',
]);

/** 액션이 허용되었는지 확인 */
export function isAllowedAction(action: string): boolean {
  return ALLOWED_ACTIONS.has(action);
}
