/**
 * useTemplateEditor Hook
 *
 * 템플릿 에디터 상태 관리 훅
 * - useReducer 기반 상태 관리
 * - 저장/불러오기/내보내기
 * - 변경 사항 추적 (isDirty)
 * - 자동 저장 (30초)
 *
 * @module hooks/useTemplateEditor
 */

import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import {
  TemplateEditorState,
  TemplateEditorAction,
  UseTemplateEditorOptions,
  UseTemplateEditorResult,
  TemplateSection,
  TemplateField,
} from '@/types/template-editor.types';

// ============================================================================
// Initial State
// ============================================================================

/**
 * 초기 에디터 상태
 */
const getInitialState = (
  initialState?: Partial<TemplateEditorState>
): TemplateEditorState => ({
  sections: [],
  activeSection: null,
  activeField: null,
  isDirty: false,
  lastSaved: null,
  ...initialState,
});

// ============================================================================
// Reducer
// ============================================================================

/**
 * 고유 ID 생성
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 템플릿 에디터 리듀서
 */
function templateEditorReducer(
  state: TemplateEditorState,
  action: TemplateEditorAction
): TemplateEditorState {
  switch (action.type) {
    case 'ADD_SECTION': {
      const newSection: TemplateSection = {
        ...action.payload.section,
        id: generateId(),
        order: state.sections.length,
        fields: action.payload.section.fields || [],
      };
      return {
        ...state,
        sections: [...state.sections, newSection],
        isDirty: true,
      };
    }

    case 'UPDATE_SECTION': {
      const { sectionId, updates } = action.payload;
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === sectionId ? { ...section, ...updates } : section
        ),
        isDirty: true,
      };
    }

    case 'REMOVE_SECTION': {
      const { sectionId } = action.payload;
      return {
        ...state,
        sections: state.sections.filter((s) => s.id !== sectionId),
        activeSection: state.activeSection === sectionId ? null : state.activeSection,
        isDirty: true,
      };
    }

    case 'REORDER_SECTIONS': {
      const { sectionIds } = action.payload;
      const reordered = sectionIds
        .map((id) => state.sections.find((s) => s.id === id))
        .filter((s): s is TemplateSection => s !== undefined)
        .map((section, index) => ({ ...section, order: index }));
      return {
        ...state,
        sections: reordered,
        isDirty: true,
      };
    }

    case 'ADD_FIELD': {
      const { sectionId, field } = action.payload;
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id === sectionId) {
            const newField: TemplateField = {
              ...field,
              id: generateId(),
              order: section.fields.length,
            };
            return {
              ...section,
              fields: [...section.fields, newField],
            };
          }
          return section;
        }),
        isDirty: true,
      };
    }

    case 'UPDATE_FIELD': {
      const { sectionId, fieldId, updates } = action.payload;
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id === sectionId) {
            return {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, ...updates } : field
              ),
            };
          }
          return section;
        }),
        isDirty: true,
      };
    }

    case 'REMOVE_FIELD': {
      const { sectionId, fieldId } = action.payload;
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id === sectionId) {
            return {
              ...section,
              fields: section.fields.filter((f) => f.id !== fieldId),
            };
          }
          return section;
        }),
        activeField: state.activeField === fieldId ? null : state.activeField,
        isDirty: true,
      };
    }

    case 'REORDER_FIELDS': {
      const { sectionId, fieldIds } = action.payload;
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id === sectionId) {
            const reordered = fieldIds
              .map((id) => section.fields.find((f) => f.id === id))
              .filter((f): f is TemplateField => f !== undefined)
              .map((field, index) => ({ ...field, order: index }));
            return {
              ...section,
              fields: reordered,
            };
          }
          return section;
        }),
        isDirty: true,
      };
    }

    case 'SET_ACTIVE_SECTION': {
      return {
        ...state,
        activeSection: action.payload.sectionId,
      };
    }

    case 'SET_ACTIVE_FIELD': {
      return {
        ...state,
        activeField: action.payload.fieldId,
      };
    }

    case 'RESET_STATE': {
      return action.payload.state;
    }

    case 'SET_DIRTY': {
      return {
        ...state,
        isDirty: action.payload.isDirty,
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 템플릿 에디터 훅
 */
export function useTemplateEditor(
  options: UseTemplateEditorOptions = {}
): UseTemplateEditorResult {
  const {
    initialState,
    autoSave = true,
    autoSaveInterval = 30000, // 30초
    onSave,
    onLoad,
  } = options;

  const [state, dispatch] = useReducer(
    templateEditorReducer,
    getInitialState(initialState)
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Actions
  // ============================================================================

  const addSection = useCallback((section: Omit<TemplateSection, 'id' | 'order'>) => {
    dispatch({ type: 'ADD_SECTION', payload: { section } });
  }, []);

  const updateSection = useCallback(
    (sectionId: string, updates: Partial<Omit<TemplateSection, 'id' | 'fields'>>) => {
      dispatch({ type: 'UPDATE_SECTION', payload: { sectionId, updates } });
    },
    []
  );

  const removeSection = useCallback((sectionId: string) => {
    dispatch({ type: 'REMOVE_SECTION', payload: { sectionId } });
  }, []);

  const reorderSections = useCallback((sectionIds: string[]) => {
    dispatch({ type: 'REORDER_SECTIONS', payload: { sectionIds } });
  }, []);

  const addField = useCallback(
    (sectionId: string, field: Omit<TemplateField, 'id' | 'order'>) => {
      dispatch({ type: 'ADD_FIELD', payload: { sectionId, field } });
    },
    []
  );

  const updateField = useCallback(
    (sectionId: string, fieldId: string, updates: Partial<Omit<TemplateField, 'id'>>) => {
      dispatch({ type: 'UPDATE_FIELD', payload: { sectionId, fieldId, updates } });
    },
    []
  );

  const removeField = useCallback((sectionId: string, fieldId: string) => {
    dispatch({ type: 'REMOVE_FIELD', payload: { sectionId, fieldId } });
  }, []);

  const reorderFields = useCallback((sectionId: string, fieldIds: string[]) => {
    dispatch({ type: 'REORDER_FIELDS', payload: { sectionId, fieldIds } });
  }, []);

  // ============================================================================
  // Save / Load / Export / Import
  // ============================================================================

  /**
   * 저장
   */
  const save = useCallback(async () => {
    if (!onSave) {
      console.warn('onSave callback not provided');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(state);
      dispatch({
        type: 'RESET_STATE',
        payload: {
          state: {
            ...state,
            isDirty: false,
            lastSaved: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('저장 실패');
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [state, onSave]);

  /**
   * 불러오기
   */
  const load = useCallback(async () => {
    if (!onLoad) {
      console.warn('onLoad callback not provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedState = await onLoad();
      if (loadedState) {
        dispatch({ type: 'RESET_STATE', payload: { state: loadedState } });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('불러오기 실패');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onLoad]);

  /**
   * JSON 내보내기
   */
  const exportJSON = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  /**
   * JSON 가져오기
   */
  const importJSON = useCallback((json: string) => {
    try {
      const importedState = JSON.parse(json) as TemplateEditorState;
      dispatch({ type: 'RESET_STATE', payload: { state: importedState } });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('JSON 파싱 실패');
      setError(error);
      throw error;
    }
  }, []);

  // ============================================================================
  // Auto-save
  // ============================================================================

  useEffect(() => {
    if (!autoSave || !state.isDirty || !onSave) {
      return;
    }

    // 기존 타이머 클리어
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 새 타이머 설정
    autoSaveTimerRef.current = setTimeout(() => {
      save().catch((err) => {
        console.error('Auto-save failed:', err);
      });
    }, autoSaveInterval);

    // 클린업
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [state.isDirty, autoSave, autoSaveInterval, onSave, save]);

  // ============================================================================
  // Initial Load
  // ============================================================================

  useEffect(() => {
    if (onLoad) {
      load().catch((err) => {
        console.error('Initial load failed:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    state,
    dispatch,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    addField,
    updateField,
    removeField,
    reorderFields,
    save,
    load,
    exportJSON,
    importJSON,
    isLoading,
    isSaving,
    error,
  };
}
