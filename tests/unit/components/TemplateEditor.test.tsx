/**
 * TemplateEditor Component 테스트
 *
 * @module tests/unit/components/TemplateEditor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from '@/components/admin/TemplateEditor';

// Mock dependencies
vi.mock('@/hooks/useTemplateEditor');

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((arr, from, to) => {
    const newArr = [...arr];
    const [moved] = newArr.splice(from, 1);
    newArr.splice(to, 0, moved);
    return newArr;
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

// Import the mocked hook
import { useTemplateEditor } from '@/hooks/useTemplateEditor';

describe('TemplateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본 mock 설정
    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      exportJSON: vi.fn(() => '{}'),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });
  });

  // ========================================================================
  // 렌더링 테스트
  // ========================================================================

  it('컴포넌트가 정상적으로 렌더링되어야 함', () => {
    render(<TemplateEditor />);

    expect(screen.getByText('템플릿 에디터')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /에디터/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /미리보기/i })).toBeInTheDocument();
  });

  it('로딩 중일 때 스피너를 표시해야 함', () => {
    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: true,
      isSaving: false,
      error: null,
    });

    render(<TemplateEditor />);

    expect(screen.queryByText('템플릿 에디터')).not.toBeInTheDocument();
  });

  it('에러가 있을 때 에러 메시지를 표시해야 함', () => {
    const error = new Error('테스트 에러');

    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error,
    });

    render(<TemplateEditor />);

    expect(screen.getByText('테스트 에러')).toBeInTheDocument();
  });

  // ========================================================================
  // 섹션 관리 테스트
  // ========================================================================

  it('섹션 추가 버튼을 클릭하면 addSection이 호출되어야 함', async () => {
    const addSection = vi.fn();

    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection,
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<TemplateEditor />);

    // "섹션 관리" 헤더 근처에 있는 첫 번째 "섹션 추가" 버튼 클릭
    const addButtons = screen.getAllByRole('button', { name: /섹션 추가|첫 섹션 추가/i });
    await user.click(addButtons[0]);

    expect(addSection).toHaveBeenCalledWith({
      title: '새 섹션',
      description: '',
      fields: [],
      collapsible: true,
      defaultCollapsed: false,
    });
  });

  it('섹션이 있을 때 섹션 목록을 표시해야 함', () => {
    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [
          {
            id: 'section-1',
            title: '테스트 섹션',
            description: '섹션 설명',
            fields: [],
            order: 0,
          },
        ],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });

    render(<TemplateEditor />);

    expect(screen.getByDisplayValue('테스트 섹션')).toBeInTheDocument();
  });

  // ========================================================================
  // 저장 테스트
  // ========================================================================

  it('저장 버튼을 클릭하면 save가 호출되어야 함', async () => {
    const save = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: true,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save,
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<TemplateEditor />);

    const saveButton = screen.getByRole('button', { name: /저장/i });
    await user.click(saveButton);

    expect(save).toHaveBeenCalled();
  });

  it('변경 사항이 없을 때 저장 버튼이 비활성화되어야 함', () => {
    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });

    render(<TemplateEditor />);

    const saveButton = screen.getByRole('button', { name: /저장/i });
    expect(saveButton).toBeDisabled();
  });

  it('저장 중일 때 저장 버튼이 비활성화되어야 함', () => {
    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: true,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: true,
      error: null,
    });

    render(<TemplateEditor />);

    const saveButton = screen.getByRole('button', { name: /저장/i });
    expect(saveButton).toBeDisabled();
  });

  // ========================================================================
  // 내보내기/가져오기 테스트
  // ========================================================================

  it('내보내기 버튼이 렌더링되어야 함', () => {
    const exportJSON = vi.fn(() => '{"sections":[]}');

    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON,
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });

    render(<TemplateEditor />);

    const exportButton = screen.getByRole('button', { name: /내보내기/i });
    expect(exportButton).toBeInTheDocument();
  });

  it('가져오기 버튼이 렌더링되어야 함', () => {
    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });

    render(<TemplateEditor />);

    const importButton = screen.getByRole('button', { name: /가져오기/i });
    expect(importButton).toBeInTheDocument();
  });

  // ========================================================================
  // 탭 전환 테스트
  // ========================================================================

  it('미리보기 탭이 렌더링되어야 함', () => {
    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });

    render(<TemplateEditor />);

    const previewTab = screen.getByRole('tab', { name: /미리보기/i });
    expect(previewTab).toBeInTheDocument();
  });

  it('에디터 탭이 기본 활성 상태여야 함', () => {
    vi.mocked(useTemplateEditor).mockReturnValue({
      state: {
        sections: [],
        activeSection: null,
        activeField: null,
        isDirty: false,
        lastSaved: null,
      },
      addSection: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      reorderSections: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      save: vi.fn(),
      exportJSON: vi.fn(),
      importJSON: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
    });

    render(<TemplateEditor />);

    const editorTab = screen.getByRole('tab', { name: /에디터/i });
    expect(editorTab).toHaveAttribute('data-state', 'active');
  });
});
