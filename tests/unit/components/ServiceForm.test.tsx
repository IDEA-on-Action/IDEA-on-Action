import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ServiceForm', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockCategories = [
    { id: '1', name: 'AI 솔루션', slug: 'ai-solution', description: 'AI 기반 솔루션' },
    { id: '2', name: '컨설팅', slug: 'consulting', description: '전문 컨설팅' },
  ];

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('빈 폼이 렌더링되어야 함', () => {
    // Execute
    render(
      <ServiceForm
        categories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    );

    // Assert
    expect(screen.getByLabelText('제목')).toBeInTheDocument();
    expect(screen.getByLabelText('설명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /저장/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument();
  });

  it('기존 서비스 데이터로 폼이 채워져야 함', () => {
    // Setup
    const mockService = {
      id: '1',
      title: '테스트 서비스',
      description: '테스트 설명입니다',
      category_id: '1',
      price: 100000,
      status: 'active' as const,
      images: ['https://example.com/image1.jpg'],
      features: [{ title: '기능 1', description: '', icon: '' }],
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    // Execute
    render(
      <ServiceForm
        service={mockService}
        categories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    );

    // Assert
    expect(screen.getByDisplayValue('테스트 서비스')).toBeInTheDocument();
    expect(screen.getByDisplayValue('테스트 설명입니다')).toBeInTheDocument();
  });

  it('제목이 비어있으면 제출 시 에러가 표시되어야 함', async () => {
    // Setup
    const user = userEvent.setup();

    render(
      <ServiceForm
        categories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    );

    // Execute
    const submitButton = screen.getByRole('button', { name: /저장/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/제목을 입력하세요/i)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('설명이 10자 미만이면 에러가 표시되어야 함', async () => {
    // Setup
    const user = userEvent.setup();

    render(
      <ServiceForm
        categories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    );

    // Execute
    const titleInput = screen.getByLabelText(/제목/i);
    const descInput = screen.getByLabelText(/설명/i);

    await user.type(titleInput, '테스트 제목');
    await user.type(descInput, '짧음');

    const submitButton = screen.getByRole('button', { name: /저장/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/설명은 최소 10자 이상이어야 합니다/i)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('유효한 데이터로 폼 제출이 성공해야 함', async () => {
    // Setup
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <ServiceForm
        categories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    );

    // Execute
    const titleInput = screen.getByLabelText('제목');
    const descInput = screen.getByLabelText('설명');

    await user.type(titleInput, '새로운 서비스');
    await user.type(descInput, '이것은 충분히 긴 설명입니다.');

    const submitButton = screen.getByRole('button', { name: /저장/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('취소 버튼 클릭 시 onCancel이 호출되어야 함', async () => {
    // Setup
    const user = userEvent.setup();

    render(
      <ServiceForm
        categories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    );

    // Execute
    const cancelButton = screen.getByRole('button', { name: /취소/i });
    await user.click(cancelButton);

    // Assert
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('Feature 추가 버튼이 작동해야 함', async () => {
    // Setup
    const user = userEvent.setup();

    render(
      <ServiceForm
        categories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    );

    // 초기 feature input 개수 확인
    const initialFeatureInputs = screen.getAllByPlaceholderText(/기능 제목/i);
    const initialCount = initialFeatureInputs.length;

    // Execute
    const addFeatureButtons = screen.getAllByRole('button', { name: /추가/i });
    const featureAddButton = addFeatureButtons[0]; // 첫 번째 추가 버튼 (Features 섹션)
    await user.click(featureAddButton);

    // Assert
    const updatedFeatureInputs = screen.getAllByPlaceholderText(/기능 제목/i);
    expect(updatedFeatureInputs.length).toBe(initialCount + 1);
  });

  it('Feature 삭제 버튼이 작동해야 함', async () => {
    // Setup
    const user = userEvent.setup();

    const mockService = {
      id: '1',
      title: '테스트 서비스',
      description: '테스트 설명입니다',
      category_id: '1',
      price: 100000,
      status: 'active' as const,
      images: [],
      features: [
        { title: '기능 1', description: '', icon: '' },
        { title: '기능 2', description: '', icon: '' }
      ],
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(
      <ServiceForm
        service={mockService}
        categories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    );

    // 초기 개수 확인
    const initialFeatureInputs = screen.getAllByDisplayValue(/기능/i);
    const initialCount = initialFeatureInputs.length;

    // Execute - 첫 번째 삭제 버튼 클릭
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i });
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);

      // Assert
      const updatedFeatureInputs = screen.queryAllByDisplayValue(/기능/i);
      expect(updatedFeatureInputs.length).toBeLessThan(initialCount);
    }
  });
});
