import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ServiceCard } from '@/components/services/ServiceCard';
import type { ServiceWithCategory } from '@/types/database';

// 고정된 mock 데이터 (테스트마다 고유한 속성 사용)
const createMockService = (testName: string): ServiceWithCategory => ({
  id: `test-${testName}`,
  title: `테스트 서비스`,
  description: `서비스 설명`,
  price: 100000,
  image_url: 'https://example.com/image.jpg',
  category_id: `cat-${testName}`,
  status: 'active',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  category: {
    id: `cat-${testName}`,
    name: `AI 솔루션`,
    slug: `ai-solution`,
    description: 'AI 기반 솔루션',
    created_at: '2024-01-01',
  },
  metrics: {
    users: 1500,
    satisfaction: 4.8,
  },
});

describe('ServiceCard', () => {
  // 테스트 후 cleanup
  afterEach(() => {
    cleanup();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    cleanup(); // 렌더링 전 cleanup
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('서비스 제목이 표시되어야 함', () => {
    const mockService = createMockService('title');
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);
    const card = within(container);
    expect(card.getByRole('heading', { name: mockService.title })).toBeInTheDocument();
  });

  it('서비스 설명이 표시되어야 함', () => {
    const mockService = createMockService('description');
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);
    const card = within(container);
    expect(card.getByText(mockService.description)).toBeInTheDocument();
  });

  it('가격이 한국 통화 형식으로 표시되어야 함', () => {
    const mockService = createMockService('price');
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);
    const card = within(container);
    const formattedPrice = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(mockService.price);
    expect(card.getByText(formattedPrice)).toBeInTheDocument();
  });

  it('카테고리 이름이 배지로 표시되어야 함', () => {
    const mockService = createMockService('category');
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);
    const card = within(container);
    expect(card.getByText(mockService.category!.name)).toBeInTheDocument();
  });

  it('사용자 수가 표시되어야 함', () => {
    const mockService = createMockService('users');
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);
    const card = within(container);
    const userCount = `${mockService.metrics!.users.toLocaleString()}명`;
    expect(card.getByText(userCount)).toBeInTheDocument();
  });

  it('만족도가 표시되어야 함', () => {
    const mockService = createMockService('satisfaction');
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);
    const card = within(container);
    expect(card.getByText(mockService.metrics!.satisfaction.toFixed(1))).toBeInTheDocument();
  });

  it('이미지가 없으면 첫 글자가 표시되어야 함', () => {
    const mockService = createMockService('no-image');
    const serviceWithoutImage = { ...mockService, image_url: null };
    const { container } = renderWithRouter(<ServiceCard service={serviceWithoutImage} />);
    const card = within(container);
    expect(card.getByText(mockService.title.charAt(0))).toBeInTheDocument();
  });

  it('올바른 링크가 생성되어야 함', () => {
    const mockService = createMockService('link');
    const { container } = renderWithRouter(<ServiceCard service={mockService} />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', `/services/${mockService.id}`);
  });

  it('메트릭이 없으면 사용자 수가 표시되지 않아야 함', () => {
    const mockService = createMockService('no-metrics');
    const serviceWithoutMetrics = { ...mockService, metrics: null };
    const { container } = renderWithRouter(<ServiceCard service={serviceWithoutMetrics} />);
    // metrics가 null이면 userCount는 0이 되고, 조건부 렌더링으로 표시되지 않음
    // Users 아이콘(svg)이 없어야 함
    const usersIcon = container.querySelector('.lucide-users');
    expect(usersIcon).toBeNull();
  });
});
