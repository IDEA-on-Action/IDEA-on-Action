import { describe, it, expect, beforeEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ServiceCard } from '@/components/services/ServiceCard';
import type { ServiceWithCategory } from '@/types/database';

describe('ServiceCard', () => {
  const mockService: ServiceWithCategory = {
    id: '1',
    title: '테스트 서비스',
    description: '이것은 테스트 서비스입니다.',
    price: 100000,
    image_url: 'https://example.com/image.jpg',
    category_id: '1',
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    category: {
      id: '1',
      name: 'AI 솔루션',
      slug: 'ai-solution',
      description: 'AI 기반 솔루션',
      created_at: '2024-01-01',
    },
    metrics: {
      users: 1000,
      satisfaction: 4.8,
    },
  };

  // 각 테스트 전 명시적 cleanup
  beforeEach(() => {
    cleanup();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('서비스 제목이 표시되어야 함', () => {
    // Execute
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);

    // Assert - container 범위 내에서만 검색
    expect(within(container).getByText('테스트 서비스')).toBeInTheDocument();
  });

  it('서비스 설명이 표시되어야 함', () => {
    // Execute
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);

    // Assert - container 범위 내에서만 검색
    expect(within(container).getByText('이것은 테스트 서비스입니다.')).toBeInTheDocument();
  });

  it('가격이 한국 통화 형식으로 표시되어야 함', () => {
    // Execute
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);

    // Assert - container 범위 내에서만 검색
    expect(within(container).getByText(/₩100,000/)).toBeInTheDocument();
  });

  it('카테고리 이름이 배지로 표시되어야 함', () => {
    // Execute
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);

    // Assert - container 범위 내에서만 검색
    expect(within(container).getByText('AI 솔루션')).toBeInTheDocument();
  });

  it('사용자 수가 표시되어야 함', () => {
    // Execute
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);

    // Assert - container 범위 내에서만 검색 (정규식 대신 정확한 텍스트)
    expect(within(container).getByText('1,000')).toBeInTheDocument();
  });

  it('만족도가 표시되어야 함', () => {
    // Execute
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);

    // Assert - container 범위 내에서만 검색
    expect(within(container).getByText('4.8')).toBeInTheDocument();
  });

  it('이미지가 없으면 첫 글자가 표시되어야 함', () => {
    // Setup
    const serviceWithoutImage = {
      ...mockService,
      image_url: null,
    };

    // Execute
    const { container } = renderWithRouter(<ServiceCard service={serviceWithoutImage} />);

    // Assert - container 범위 내에서만 검색
    expect(within(container).getByText('테')).toBeInTheDocument();
  });

  it('올바른 링크가 생성되어야 함', () => {
    // Execute
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);

    // Assert
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/services/1');
  });

  it('메트릭이 없으면 표시되지 않아야 함', () => {
    // Setup
    const serviceWithoutMetrics = {
      ...mockService,
      metrics: null,
    };

    // Execute
    const { container } = renderWithRouter(<ServiceCard service={serviceWithoutMetrics} />);

    // Assert - container 범위 내에서만 검색
    expect(within(container).queryByText(/명/)).not.toBeInTheDocument();
  });
});
