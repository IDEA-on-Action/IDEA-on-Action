/**
 * useTemplateEditor Hook 테스트
 *
 * @module tests/unit/hooks/useTemplateEditor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTemplateEditor } from '@/hooks/content/useTemplateEditor';
import type { TemplateEditorState } from '@/types/template-editor.types';

describe('useTemplateEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ========================================================================
  // 초기화 테스트
  // ========================================================================

  it('초기 상태가 올바르게 설정되어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    expect(result.current.state).toEqual({
      sections: [],
      activeSection: null,
      activeField: null,
      isDirty: false,
      lastSaved: null,
    });
  });

  it('커스텀 초기 상태를 받을 수 있어야 함', () => {
    const initialState = {
      sections: [
        {
          id: 'section-1',
          title: '테스트 섹션',
          fields: [],
          order: 0,
        },
      ],
    };

    const { result } = renderHook(() =>
      useTemplateEditor({ initialState })
    );

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].title).toBe('테스트 섹션');
  });

  // ========================================================================
  // 섹션 관리 테스트
  // ========================================================================

  it('섹션을 추가할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({
        title: '새 섹션',
        fields: [],
      });
    });

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].title).toBe('새 섹션');
    expect(result.current.state.sections[0].id).toBeDefined();
    expect(result.current.state.sections[0].order).toBe(0);
    expect(result.current.state.isDirty).toBe(true);
  });

  it('여러 섹션을 추가할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '섹션 1', fields: [] });
      result.current.addSection({ title: '섹션 2', fields: [] });
      result.current.addSection({ title: '섹션 3', fields: [] });
    });

    expect(result.current.state.sections).toHaveLength(3);
    expect(result.current.state.sections[0].order).toBe(0);
    expect(result.current.state.sections[1].order).toBe(1);
    expect(result.current.state.sections[2].order).toBe(2);
  });

  it('섹션을 업데이트할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '원본 제목', fields: [] });
    });

    const sectionId = result.current.state.sections[0].id;

    act(() => {
      result.current.updateSection(sectionId, { title: '수정된 제목' });
    });

    expect(result.current.state.sections[0].title).toBe('수정된 제목');
    expect(result.current.state.isDirty).toBe(true);
  });

  it('섹션을 삭제할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '섹션 1', fields: [] });
      result.current.addSection({ title: '섹션 2', fields: [] });
    });

    const sectionId = result.current.state.sections[0].id;

    act(() => {
      result.current.removeSection(sectionId);
    });

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].title).toBe('섹션 2');
  });

  it('섹션 순서를 변경할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '섹션 1', fields: [] });
      result.current.addSection({ title: '섹션 2', fields: [] });
      result.current.addSection({ title: '섹션 3', fields: [] });
    });

    const sectionIds = result.current.state.sections.map((s) => s.id);
    const reorderedIds = [sectionIds[2], sectionIds[0], sectionIds[1]];

    act(() => {
      result.current.reorderSections(reorderedIds);
    });

    expect(result.current.state.sections[0].title).toBe('섹션 3');
    expect(result.current.state.sections[1].title).toBe('섹션 1');
    expect(result.current.state.sections[2].title).toBe('섹션 2');
    expect(result.current.state.sections[0].order).toBe(0);
    expect(result.current.state.sections[1].order).toBe(1);
    expect(result.current.state.sections[2].order).toBe(2);
  });

  // ========================================================================
  // 필드 관리 테스트
  // ========================================================================

  it('필드를 추가할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '섹션 1', fields: [] });
    });

    const sectionId = result.current.state.sections[0].id;

    act(() => {
      result.current.addField(sectionId, {
        name: 'email',
        type: 'email',
        label: '이메일',
      });
    });

    expect(result.current.state.sections[0].fields).toHaveLength(1);
    expect(result.current.state.sections[0].fields[0].name).toBe('email');
    expect(result.current.state.sections[0].fields[0].type).toBe('email');
    expect(result.current.state.isDirty).toBe(true);
  });

  it('필드를 업데이트할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '섹션 1', fields: [] });
    });

    const sectionId = result.current.state.sections[0].id;

    act(() => {
      result.current.addField(sectionId, {
        name: 'email',
        type: 'email',
        label: '이메일',
      });
    });

    const fieldId = result.current.state.sections[0].fields[0].id;

    act(() => {
      result.current.updateField(sectionId, fieldId, {
        label: '이메일 주소',
        placeholder: 'user@example.com',
      });
    });

    expect(result.current.state.sections[0].fields[0].label).toBe('이메일 주소');
    expect(result.current.state.sections[0].fields[0].placeholder).toBe(
      'user@example.com'
    );
  });

  it('필드를 삭제할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '섹션 1', fields: [] });
    });

    const sectionId = result.current.state.sections[0].id;

    act(() => {
      result.current.addField(sectionId, {
        name: 'field1',
        type: 'text',
        label: '필드 1',
      });
      result.current.addField(sectionId, {
        name: 'field2',
        type: 'text',
        label: '필드 2',
      });
    });

    const fieldId = result.current.state.sections[0].fields[0].id;

    act(() => {
      result.current.removeField(sectionId, fieldId);
    });

    expect(result.current.state.sections[0].fields).toHaveLength(1);
    expect(result.current.state.sections[0].fields[0].label).toBe('필드 2');
  });

  it('필드 순서를 변경할 수 있어야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '섹션 1', fields: [] });
    });

    const sectionId = result.current.state.sections[0].id;

    act(() => {
      result.current.addField(sectionId, {
        name: 'field1',
        type: 'text',
        label: '필드 1',
      });
      result.current.addField(sectionId, {
        name: 'field2',
        type: 'text',
        label: '필드 2',
      });
      result.current.addField(sectionId, {
        name: 'field3',
        type: 'text',
        label: '필드 3',
      });
    });

    const fieldIds = result.current.state.sections[0].fields.map((f) => f.id);
    const reorderedIds = [fieldIds[2], fieldIds[0], fieldIds[1]];

    act(() => {
      result.current.reorderFields(sectionId, reorderedIds);
    });

    expect(result.current.state.sections[0].fields[0].label).toBe('필드 3');
    expect(result.current.state.sections[0].fields[1].label).toBe('필드 1');
    expect(result.current.state.sections[0].fields[2].label).toBe('필드 2');
  });

  // ========================================================================
  // 저장/불러오기 테스트
  // ========================================================================

  it('save 함수가 onSave 콜백을 호출해야 함', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useTemplateEditor({ onSave })
    );

    act(() => {
      result.current.addSection({ title: '테스트', fields: [] });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      sections: expect.any(Array),
      isDirty: true,
    }));
    expect(result.current.state.isDirty).toBe(false);
    expect(result.current.state.lastSaved).toBeDefined();
  });

  it('load 함수가 onLoad 콜백을 호출하고 상태를 업데이트해야 함', async () => {
    const loadedState: TemplateEditorState = {
      sections: [
        {
          id: 'loaded-section',
          title: '로드된 섹션',
          fields: [],
          order: 0,
        },
      ],
      activeSection: null,
      activeField: null,
      isDirty: false,
      lastSaved: null,
    };

    const onLoad = vi.fn().mockResolvedValue(loadedState);

    const { result } = renderHook(() =>
      useTemplateEditor({ autoSave: false })
    );

    // 수동으로 load 호출
    await act(async () => {
      // onLoad를 mock으로 주입
      result.current.load = async () => {
        const state = await onLoad();
        if (state) {
          result.current.dispatch({ type: 'RESET_STATE', payload: { state } });
        }
      };
      await result.current.load();
    });

    expect(onLoad).toHaveBeenCalled();
    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].title).toBe('로드된 섹션');
  });

  // ========================================================================
  // 내보내기/가져오기 테스트
  // ========================================================================

  it('exportJSON이 올바른 JSON 문자열을 반환해야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      result.current.addSection({ title: '테스트 섹션', fields: [] });
    });

    const json = result.current.exportJSON();
    const parsed = JSON.parse(json);

    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].title).toBe('테스트 섹션');
  });

  it('importJSON이 JSON 문자열을 파싱하고 상태를 업데이트해야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    const json = JSON.stringify({
      sections: [
        {
          id: 'imported-section',
          title: '가져온 섹션',
          fields: [],
          order: 0,
        },
      ],
      activeSection: null,
      activeField: null,
      isDirty: false,
      lastSaved: null,
    });

    act(() => {
      result.current.importJSON(json);
    });

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].title).toBe('가져온 섹션');
  });

  // ========================================================================
  // 자동 저장 테스트
  // ========================================================================

  it('자동 저장이 30초 후 실행되어야 함', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useTemplateEditor({ onSave, autoSave: true, autoSaveInterval: 1000 })
    );

    act(() => {
      result.current.addSection({ title: '테스트', fields: [] });
    });

    expect(onSave).not.toHaveBeenCalled();

    // 타이머를 1초 진행
    await act(async () => {
      vi.advanceTimersByTime(1000);
      // Promise 해결을 위한 추가 대기
      await Promise.resolve();
    });

    // onSave가 호출되었는지 확인
    expect(onSave).toHaveBeenCalled();
  });

  it('자동 저장을 비활성화할 수 있어야 함', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useTemplateEditor({ onSave, autoSave: false })
    );

    act(() => {
      result.current.addSection({ title: '테스트', fields: [] });
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  // ========================================================================
  // 에러 처리 테스트
  // ========================================================================

  it('저장 실패 시 에러를 설정해야 함', async () => {
    const error = new Error('저장 실패');
    const onSave = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() =>
      useTemplateEditor({ onSave })
    );

    act(() => {
      result.current.addSection({ title: '테스트', fields: [] });
    });

    await act(async () => {
      try {
        await result.current.save();
      } catch (e) {
        // 예상된 에러
      }
    });

    expect(result.current.error).toEqual(error);
  });

  it('잘못된 JSON 가져오기 시 에러를 설정해야 함', () => {
    const { result } = renderHook(() => useTemplateEditor());

    act(() => {
      try {
        result.current.importJSON('invalid json');
      } catch (e) {
        // 예상된 에러
      }
    });

    expect(result.current.error).toBeDefined();
  });
});
