import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ServiceCard } from '@/components/services/ServiceCard';
import type { ServiceWithCategory } from '@/types/database';

// 고유 ID 생성 헬퍼 (crypto.randomUUID 폴백)
const generateUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 폴백: 타임스탬프 + 랜덤 문자열
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`;
};

describe('ServiceCard', () => {
  // 테스트마다 고유한 mock 데이터 생성
  const createMockService = (): ServiceWithCategory => {
    const uniqueId = generateUniqueId();
    return {
      id: uniqueId,
      title: `테스트 서비스 ${uniqueId.slice(0, 8)}`,
      description: `서비스 설명 ${uniqueId.slice(0, 8)}`,
      price: 100000 + Math.floor(Math.random() * 1000),
      image_url: 'https://example.com/image.jpg',
      category_id: `cat-${uniqueId}`,
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      category: {
        id: `cat-${uniqueId}`,
        name: `AI 솔루션 ${uniqueId.slice(0, 8)}`,
        slug: `ai-solution-${uniqueId.slice(0, 8)}`,
        description: 'AI 기반 솔루션',
        created_at: '2024-01-01',
      },
      metrics: {
        users: 1000 + Math.floor(Math.random() * 1000),
        satisfaction: 4.5 + Math.random() * 0.5,
      },
    };
  };

  // 테스트 후 cleanup
  afterEach(() => {
    cleanup();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    cleanup(); // 렌더링 전 cleanup
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
    // 정확한 문자열로 검색 (regex 대신)
    expect(getByText(mockService.description)).toBeInTheDocument();
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

  it('메트릭이 없으면 사용자 수가 표시되지 않아야 함', () => {
    const mockService = createMockService();
    const serviceWithoutMetrics = { ...mockService, metrics: null };
    const { container } = renderWithRouter(<ServiceCard service={serviceWithoutMetrics} />);
    // metrics가 null이면 userCount는 0이 되고, 조건부 렌더링으로 표시되지 않음
    // Users 아이콘(svg)이 없어야 함
    const usersIcon = container.querySelector('.lucide-users');
    expect(usersIcon).toBeNull();
  });
});
