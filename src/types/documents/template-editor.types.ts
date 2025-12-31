/**
 * Template Editor 타입 정의
 *
 * 관리자 UI에서 템플릿을 직접 편집하기 위한 타입
 *
 * @module types/template-editor
 */

// ============================================================================
// Field Types
// ============================================================================

/**
 * 필드 타입
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'email'
  | 'url'
  | 'tel';

/**
 * 필드 검증 규칙
 */
export interface FieldValidation {
  /** 필수 여부 */
  required?: boolean;
  /** 최소 길이 (text, textarea) */
  minLength?: number;
  /** 최대 길이 (text, textarea) */
  maxLength?: number;
  /** 최솟값 (number) */
  min?: number;
  /** 최댓값 (number) */
  max?: number;
  /** 정규식 패턴 */
  pattern?: string;
  /** 커스텀 검증 메시지 */
  message?: string;
}

/**
 * 선택 옵션 (select, radio)
 */
export interface FieldOption {
  /** 옵션 값 */
  value: string;
  /** 옵션 라벨 */
  label: string;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * 템플릿 필드
 */
export interface TemplateField {
  /** 필드 고유 ID */
  id: string;
  /** 필드 이름 (키) */
  name: string;
  /** 필드 타입 */
  type: FieldType;
  /** 필드 라벨 */
  label: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 기본값 */
  defaultValue?: string | number | boolean;
  /** 도움말 텍스트 */
  helpText?: string;
  /** 검증 규칙 */
  validation?: FieldValidation;
  /** 선택 옵션 (select, radio) */
  options?: FieldOption[];
  /** 순서 (정렬용) */
  order: number;
  /** 비활성화 여부 */
  disabled?: boolean;
}

// ============================================================================
// Section Types
// ============================================================================

/**
 * 템플릿 섹션
 */
export interface TemplateSection {
  /** 섹션 고유 ID */
  id: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 설명 */
  description?: string;
  /** 필드 목록 */
  fields: TemplateField[];
  /** 접을 수 있는지 여부 */
  collapsible?: boolean;
  /** 기본 접힘 상태 */
  defaultCollapsed?: boolean;
  /** 순서 (정렬용) */
  order: number;
}

// ============================================================================
// Editor State Types
// ============================================================================

/**
 * 템플릿 에디터 상태
 */
export interface TemplateEditorState {
  /** 섹션 목록 */
  sections: TemplateSection[];
  /** 활성 섹션 ID */
  activeSection: string | null;
  /** 활성 필드 ID */
  activeField: string | null;
  /** 변경 사항 여부 */
  isDirty: boolean;
  /** 마지막 저장 시간 */
  lastSaved: string | null;
}

// ============================================================================
// Editor Action Types
// ============================================================================

/**
 * 섹션 추가 액션
 */
export interface AddSectionAction {
  type: 'ADD_SECTION';
  payload: {
    section: Omit<TemplateSection, 'id' | 'order'>;
  };
}

/**
 * 섹션 업데이트 액션
 */
export interface UpdateSectionAction {
  type: 'UPDATE_SECTION';
  payload: {
    sectionId: string;
    updates: Partial<Omit<TemplateSection, 'id' | 'fields'>>;
  };
}

/**
 * 섹션 삭제 액션
 */
export interface RemoveSectionAction {
  type: 'REMOVE_SECTION';
  payload: {
    sectionId: string;
  };
}

/**
 * 섹션 순서 변경 액션
 */
export interface ReorderSectionsAction {
  type: 'REORDER_SECTIONS';
  payload: {
    sectionIds: string[];
  };
}

/**
 * 필드 추가 액션
 */
export interface AddFieldAction {
  type: 'ADD_FIELD';
  payload: {
    sectionId: string;
    field: Omit<TemplateField, 'id' | 'order'>;
  };
}

/**
 * 필드 업데이트 액션
 */
export interface UpdateFieldAction {
  type: 'UPDATE_FIELD';
  payload: {
    sectionId: string;
    fieldId: string;
    updates: Partial<Omit<TemplateField, 'id'>>;
  };
}

/**
 * 필드 삭제 액션
 */
export interface RemoveFieldAction {
  type: 'REMOVE_FIELD';
  payload: {
    sectionId: string;
    fieldId: string;
  };
}

/**
 * 필드 순서 변경 액션
 */
export interface ReorderFieldsAction {
  type: 'REORDER_FIELDS';
  payload: {
    sectionId: string;
    fieldIds: string[];
  };
}

/**
 * 활성 섹션 설정 액션
 */
export interface SetActiveSectionAction {
  type: 'SET_ACTIVE_SECTION';
  payload: {
    sectionId: string | null;
  };
}

/**
 * 활성 필드 설정 액션
 */
export interface SetActiveFieldAction {
  type: 'SET_ACTIVE_FIELD';
  payload: {
    fieldId: string | null;
  };
}

/**
 * 상태 초기화 액션
 */
export interface ResetStateAction {
  type: 'RESET_STATE';
  payload: {
    state: TemplateEditorState;
  };
}

/**
 * Dirty 상태 설정 액션
 */
export interface SetDirtyAction {
  type: 'SET_DIRTY';
  payload: {
    isDirty: boolean;
  };
}

/**
 * 템플릿 에디터 액션 유니온 타입
 */
export type TemplateEditorAction =
  | AddSectionAction
  | UpdateSectionAction
  | RemoveSectionAction
  | ReorderSectionsAction
  | AddFieldAction
  | UpdateFieldAction
  | RemoveFieldAction
  | ReorderFieldsAction
  | SetActiveSectionAction
  | SetActiveFieldAction
  | ResetStateAction
  | SetDirtyAction;

// ============================================================================
// Hook Types
// ============================================================================

/**
 * useTemplateEditor 훅 옵션
 */
export interface UseTemplateEditorOptions {
  /** 템플릿 ID */
  templateId?: string;
  /** 초기 상태 */
  initialState?: Partial<TemplateEditorState>;
  /** 자동 저장 여부 (기본: true) */
  autoSave?: boolean;
  /** 자동 저장 간격 (밀리초, 기본: 30000) */
  autoSaveInterval?: number;
  /** 저장 콜백 */
  onSave?: (state: TemplateEditorState) => Promise<void>;
  /** 로드 콜백 */
  onLoad?: () => Promise<TemplateEditorState | null>;
}

/**
 * useTemplateEditor 훅 반환 타입
 */
export interface UseTemplateEditorResult {
  /** 현재 상태 */
  state: TemplateEditorState;
  /** 액션 디스패치 */
  dispatch: React.Dispatch<TemplateEditorAction>;
  /** 섹션 추가 */
  addSection: (section: Omit<TemplateSection, 'id' | 'order'>) => void;
  /** 섹션 업데이트 */
  updateSection: (sectionId: string, updates: Partial<Omit<TemplateSection, 'id' | 'fields'>>) => void;
  /** 섹션 삭제 */
  removeSection: (sectionId: string) => void;
  /** 섹션 순서 변경 */
  reorderSections: (sectionIds: string[]) => void;
  /** 필드 추가 */
  addField: (sectionId: string, field: Omit<TemplateField, 'id' | 'order'>) => void;
  /** 필드 업데이트 */
  updateField: (sectionId: string, fieldId: string, updates: Partial<Omit<TemplateField, 'id'>>) => void;
  /** 필드 삭제 */
  removeField: (sectionId: string, fieldId: string) => void;
  /** 필드 순서 변경 */
  reorderFields: (sectionId: string, fieldIds: string[]) => void;
  /** 저장 */
  save: () => Promise<void>;
  /** 불러오기 */
  load: () => Promise<void>;
  /** 내보내기 (JSON) */
  exportJSON: () => string;
  /** 가져오기 (JSON) */
  importJSON: (json: string) => void;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 저장 중 상태 */
  isSaving: boolean;
  /** 에러 */
  error: Error | null;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * TemplateEditor 컴포넌트 Props
 */
export interface TemplateEditorProps {
  /** 템플릿 ID */
  templateId?: string;
  /** 초기 상태 */
  initialState?: Partial<TemplateEditorState>;
  /** 저장 핸들러 */
  onSave?: (state: TemplateEditorState) => Promise<void>;
  /** 클래스명 */
  className?: string;
}

/**
 * TemplateFieldEditor 컴포넌트 Props
 */
export interface TemplateFieldEditorProps {
  /** 필드 데이터 */
  field: TemplateField;
  /** 업데이트 핸들러 */
  onUpdate: (updates: Partial<Omit<TemplateField, 'id'>>) => void;
  /** 삭제 핸들러 */
  onRemove: () => void;
  /** 클래스명 */
  className?: string;
}

/**
 * TemplateSectionEditor 컴포넌트 Props
 */
export interface TemplateSectionEditorProps {
  /** 섹션 데이터 */
  section: TemplateSection;
  /** 활성 상태 */
  isActive: boolean;
  /** 섹션 선택 핸들러 */
  onSelect: () => void;
  /** 섹션 업데이트 핸들러 */
  onUpdate: (updates: Partial<Omit<TemplateSection, 'id' | 'fields'>>) => void;
  /** 섹션 삭제 핸들러 */
  onRemove: () => void;
  /** 필드 추가 핸들러 */
  onAddField: (field: Omit<TemplateField, 'id' | 'order'>) => void;
  /** 필드 업데이트 핸들러 */
  onUpdateField: (fieldId: string, updates: Partial<Omit<TemplateField, 'id'>>) => void;
  /** 필드 삭제 핸들러 */
  onRemoveField: (fieldId: string) => void;
  /** 필드 순서 변경 핸들러 */
  onReorderFields: (fieldIds: string[]) => void;
  /** 클래스명 */
  className?: string;
}

/**
 * TemplatePreview 컴포넌트 Props
 */
export interface TemplatePreviewProps {
  /** 섹션 목록 */
  sections: TemplateSection[];
  /** 클래스명 */
  className?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 필드 타입별 라벨 맵
 */
export const FIELD_TYPE_LABEL_MAP: Record<FieldType, string> = {
  text: '텍스트',
  textarea: '텍스트 영역',
  number: '숫자',
  date: '날짜',
  select: '선택',
  checkbox: '체크박스',
  radio: '라디오',
  email: '이메일',
  url: 'URL',
  tel: '전화번호',
};

/**
 * 필드 타입별 아이콘 맵 (Lucide 아이콘 이름)
 */
export const FIELD_TYPE_ICON_MAP: Record<FieldType, string> = {
  text: 'Type',
  textarea: 'AlignLeft',
  number: 'Hash',
  date: 'Calendar',
  select: 'ChevronDown',
  checkbox: 'CheckSquare',
  radio: 'Circle',
  email: 'Mail',
  url: 'Link',
  tel: 'Phone',
};

/**
 * 기본 필드 검증 규칙
 */
export const DEFAULT_VALIDATION: Record<FieldType, Partial<FieldValidation>> = {
  text: { maxLength: 255 },
  textarea: { maxLength: 2000 },
  number: {},
  date: {},
  select: {},
  checkbox: {},
  radio: {},
  email: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
  url: { pattern: '^https?:\\/\\/.+' },
  tel: { pattern: '^[0-9-+()\\s]+$' },
};
