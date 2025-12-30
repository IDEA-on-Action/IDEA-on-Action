import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ServiceCard } from '@/components/services/ServiceCard';
import type { ServiceWithCategory } from '@/types/database';

describe('ServiceCard', () => {
  // 테스트마다 고유한 mock 데이터 생성 (랜덤 ID 사용으로 샤드 간 충돌 방지)
  const createMockService = (): ServiceWithCategory => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return {
      id: `test-${uniqueId}`,
      title: `테스트 서비스 ${uniqueId}`,
      description: `이것은 테스트 서비스 ${uniqueId}입니다.`,
      price: 100000 + Math.floor(Math.random() * 1000),
      image_url: 'https://example.com/image.jpg',
      category_id: `cat-${uniqueId}`,
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      category: {
        id: `cat-${uniqueId}`,
        name: `AI 솔루션 ${uniqueId}`,
        slug: `ai-solution-${uniqueId}`,
        description: 'AI 기반 솔루션',
        created_at: '2024-01-01',
      },
      metrics: {
        users: 1000 + Math.floor(Math.random() * 1000),
        satisfaction: 4.5 + Math.random() * 0.5, // 4.5 ~ 5.0 사이
      },
    };
  };

  // 테스트 전후 cleanup
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('서비스 제목이 표시되어야 함', () => {
    const mockService = createMockService();
    const { getByRole } = renderWithRouter(<ServiceCard service={mockService} />);
    expect(getByRole('heading', { name: mockService.title })).toBeInTheDocument();
  });

  it('서비스 설명이 표시되어야 함', () => {
    const mockService = createMockService();
    const { getByText } = renderWithRouter(<ServiceCard service={mockService} />);
    expect(getByText(new RegExp(mockService.description.slice(0, 20)))).toBeInTheDocument();
  });

  it('가격이 한국 통화 형식으로 표시되어야 함', () => {
    const mockService = createMockService();
    const { getByText } = renderWithRouter(<ServiceCard service={mockService} />);
    const formattedPrice = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(mockService.price);
    expect(getByText(formattedPrice)).toBeInTheDocument();
  });

  it('카테고리 이름이 배지로 표시되어야 함', () => {
    const mockService = createMockService();
    const { getByText } = renderWithRouter(<ServiceCard service={mockService} />);
    expect(getByText(mockService.category!.name)).toBeInTheDocument();
  });

  it('사용자 수가 표시되어야 함', () => {
    const mockService = createMockService();
    const { getByText } = renderWithRouter(<ServiceCard service={mockService} />);
    const userCount = `${mockService.metrics!.users.toLocaleString()}명`;
    expect(getByText(userCount)).toBeInTheDocument();
  });

  it('만족도가 표시되어야 함', () => {
    const mockService = createMockService();
    const { getByText } = renderWithRouter(<ServiceCard service={mockService} />);
    expect(getByText(mockService.metrics!.satisfaction.toFixed(1))).toBeInTheDocument();
  });

  it('이미지가 없으면 첫 글자가 표시되어야 함', () => {
    const mockService = createMockService();
    const serviceWithoutImage = { ...mockService, image_url: null };
    const { getByText } = renderWithRouter(<ServiceCard service={serviceWithoutImage} />);
    expect(getByText(mockService.title.charAt(0))).toBeInTheDocument();
  });

  it('올바른 링크가 생성되어야 함', () => {
    const mockService = createMockService();
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', `/services/${mockService.id}`);
  });

  it('메트릭이 없으면 표시되지 않아야 함', () => {
    const mockService = createMockService();
    const serviceWithoutMetrics = { ...mockService, metrics: null };
    const { queryByText } = renderWithRouter(<ServiceCard service={serviceWithoutMetrics} />);
    expect(queryByText(/명/)).not.toBeInTheDocument();
  });
});
