import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Brain, Workflow, BarChart3 } from 'lucide-react';
import Services from '@/components/Services';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

describe('Services Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Services />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('displays the section title', () => {
    render(<Services />);
    expect(screen.getByText('혁신적인')).toBeInTheDocument();
    expect(screen.getByText('솔루션')).toBeInTheDocument();
  });

  it('displays the section description', () => {
    render(<Services />);
    expect(screen.getByText('AI 기반의 첨단 기술로 비즈니스의 모든 단계를 지원합니다')).toBeInTheDocument();
  });

  it('renders all default services', () => {
    render(<Services />);
    
    expect(screen.getByText('AI 컨설팅')).toBeInTheDocument();
    expect(screen.getByText('워크플로우 자동화')).toBeInTheDocument();
    expect(screen.getByText('데이터 분석')).toBeInTheDocument();
  });

  it('renders custom services when provided', () => {
    const customServices = [
      {
        id: 'custom-1',
        icon: Brain,
        title: 'Custom Service 1',
        description: 'Custom description 1',
        features: ['Feature 1', 'Feature 2']
      },
      {
        id: 'custom-2',
        icon: Workflow,
        title: 'Custom Service 2',
        description: 'Custom description 2',
        features: ['Feature 3', 'Feature 4']
      }
    ];

    render(<Services services={customServices} />);
    
    expect(screen.getByText('Custom Service 1')).toBeInTheDocument();
    expect(screen.getByText('Custom Service 2')).toBeInTheDocument();
    expect(screen.queryByText('AI 컨설팅')).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-services-class';
    const { container } = render(<Services className={customClass} />);
    const servicesSection = container.querySelector('section');
    expect(servicesSection).toHaveClass(customClass);
  });

  it('displays loading state correctly', () => {
    const { container } = render(<Services isLoading={true} />);
    
    // Check for loading skeleton elements
    const loadingElements = screen.getAllByRole('region');
    expect(loadingElements).toHaveLength(1);
    
    // Check for skeleton animation classes
    const skeletonElements = container.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('displays error state correctly', () => {
    const errorMessage = 'Failed to load services';
    render(<Services error={errorMessage} />);
    
    expect(screen.getByText('서비스를 불러오는 중 오류가 발생했습니다.')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    render(<Services />);
    
    // Check for main heading
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    
    // Check for service articles
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });

  it('has proper accessibility attributes', () => {
    render(<Services />);
    
    // Check for proper ARIA labels
    const articles = screen.getAllByRole('article');
    articles.forEach((article) => {
      expect(article).toHaveAttribute('aria-labelledby');
      expect(article).toHaveAttribute('tabIndex', '0');
    });
  });

  it('supports keyboard navigation', () => {
    render(<Services />);
    
    const serviceCards = screen.getAllByRole('article');
    serviceCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  it('has focus management', () => {
    render(<Services />);
    
    const firstCard = screen.getAllByRole('article')[0];
    firstCard.focus();
    expect(firstCard).toHaveFocus();
  });

  it('has proper hover and focus states', () => {
    render(<Services />);
    
    const serviceCards = screen.getAllByRole('article');
    serviceCards.forEach(card => {
      expect(card).toHaveClass('hover:border-primary/40');
      expect(card).toHaveClass('focus-within:ring-2');
    });
  });

  it('renders with proper responsive classes', () => {
    const { container } = render(<Services />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('md:grid-cols-3');
  });

  it('has proper animation delays', () => {
    render(<Services />);
    
    const serviceCards = screen.getAllByRole('article');
    serviceCards.forEach((card, index) => {
      expect(card).toHaveStyle(`animation-delay: ${index * 0.1}s`);
    });
  });

  it('renders service features correctly', () => {
    render(<Services />);
    
    // Check for feature lists
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(3);
    
    // Check for specific features
    expect(screen.getByText('AI 전략 수립')).toBeInTheDocument();
    expect(screen.getByText('프로세스 자동화')).toBeInTheDocument();
    expect(screen.getByText('데이터 시각화')).toBeInTheDocument();
  });

  it('has proper icon rendering', () => {
    const { container } = render(<Services />);
    
    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('meets accessibility standards', async () => {
    const { container } = render(<Services />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('handles empty services array gracefully', () => {
    const { container } = render(<Services services={[]} />);

    expect(container.querySelector('section')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('supports custom service data structure', () => {
    const customService = {
      id: 'test-service',
      icon: BarChart3,
      title: 'Test Service',
      description: 'Test description',
      features: ['Test Feature 1', 'Test Feature 2']
    };

    render(<Services services={[customService]} />);
    
    expect(screen.getByText('Test Service')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Test Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Test Feature 2')).toBeInTheDocument();
  });

  it('renders loading skeleton with correct structure', () => {
    const { container } = render(<Services isLoading={true} />);
    
    // Check for skeleton cards
    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('displays error message with proper styling', () => {
    const errorMessage = 'Network error';
    render(<Services error={errorMessage} />);
    
    const errorContainer = screen.getByText('서비스를 불러오는 중 오류가 발생했습니다.').closest('div');
    expect(errorContainer).toHaveClass('bg-destructive/10', 'border-destructive/20');
  });
});
