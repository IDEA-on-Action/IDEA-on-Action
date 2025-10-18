import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Zap, Shield, Rocket, Users } from 'lucide-react';
import Features from '@/components/Features';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

describe('Features Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Features />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('displays the section title', () => {
    render(<Features />);
    expect(screen.getByText(/VIBE WORKING.*강점/)).toBeInTheDocument();
  });

  it('displays the section description', () => {
    render(<Features />);
    expect(screen.getByText('최고 수준의 기술력과 경험으로 완벽한 솔루션을 제공합니다')).toBeInTheDocument();
  });

  it('renders all default features', () => {
    render(<Features />);
    
    expect(screen.getByText('빠른 구현')).toBeInTheDocument();
    expect(screen.getByText('안정성')).toBeInTheDocument();
    expect(screen.getByText('확장성')).toBeInTheDocument();
    expect(screen.getByText('협업')).toBeInTheDocument();
  });

  it('renders custom features when provided', () => {
    const customFeatures = [
      {
        id: 'custom-1',
        icon: Zap,
        title: 'Custom Feature 1',
        description: 'Custom description 1'
      },
      {
        id: 'custom-2',
        icon: Shield,
        title: 'Custom Feature 2',
        description: 'Custom description 2'
      }
    ];

    render(<Features features={customFeatures} />);
    
    expect(screen.getByText('Custom Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Custom Feature 2')).toBeInTheDocument();
    expect(screen.queryByText('빠른 구현')).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-features-class';
    const { container } = render(<Features className={customClass} />);
    const featuresSection = container.querySelector('section');
    expect(featuresSection).toHaveClass(customClass);
  });

  it('has proper semantic structure', () => {
    render(<Features />);
    
    // Check for main heading
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    
    // Check for feature articles
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(4);
  });

  it('has proper accessibility attributes', () => {
    render(<Features />);
    
    // Check for proper ARIA labels
    const articles = screen.getAllByRole('article');
    articles.forEach((article, index) => {
      expect(article).toHaveAttribute('aria-labelledby', `feature-title-fast-implementation`);
    });
  });

  it('supports keyboard navigation', () => {
    render(<Features />);
    
    const featureCards = screen.getAllByRole('article');
    featureCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  it('has focus management', () => {
    render(<Features />);
    
    const firstCard = screen.getAllByRole('article')[0];
    firstCard.focus();
    expect(firstCard).toHaveFocus();
  });

  it('has proper hover and focus states', () => {
    render(<Features />);
    
    const featureCards = screen.getAllByRole('article');
    featureCards.forEach(card => {
      expect(card).toHaveClass('hover:border-primary/40');
      expect(card).toHaveClass('focus-within:ring-2');
    });
  });

  it('renders with proper responsive classes', () => {
    const { container } = render(<Features />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('has proper animation delays', () => {
    render(<Features />);
    
    const featureCards = screen.getAllByRole('article');
    featureCards.forEach((card, index) => {
      expect(card).toHaveStyle(`animation-delay: ${index * 0.1}s`);
    });
  });

  it('meets accessibility standards', async () => {
    const { container } = render(<Features />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('handles empty features array gracefully', () => {
    const { container } = render(<Features features={[]} />);

    expect(container.querySelector('section')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('has proper icon rendering', () => {
    render(<Features />);
    
    const icons = screen.getAllByLabelText('', { selector: '[aria-hidden="true"]' });
    expect(icons.length).toBeGreaterThan(0);
  });

  it('supports custom feature data structure', () => {
    const customFeature = {
      id: 'test-feature',
      icon: Users,
      title: 'Test Feature',
      description: 'Test description'
    };

    render(<Features features={[customFeature]} />);
    
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });
});
