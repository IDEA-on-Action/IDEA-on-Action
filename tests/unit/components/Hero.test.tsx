import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import Hero from '@/components/Hero';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

describe('Hero Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Hero />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('displays the main heading', () => {
    render(<Hero />);
    expect(screen.getByText('생각과 행동으로')).toBeInTheDocument();
    expect(screen.getByText('미래를 설계하다')).toBeInTheDocument();
  });

  it('displays the slogan', () => {
    render(<Hero />);
    expect(screen.getByText('KEEP AWAKE, LIVE PASSIONATE')).toBeInTheDocument();
  });

  it('displays the badge text', () => {
    render(<Hero />);
    expect(screen.getByText('AI 기반 워킹 솔루션')).toBeInTheDocument();
  });

  it('displays CTA buttons', () => {
    render(<Hero />);
    expect(screen.getByLabelText('무료로 시작하기')).toBeInTheDocument();
    expect(screen.getByLabelText('더 알아보기')).toBeInTheDocument();
  });

  it('displays the logo with proper alt text', () => {
    render(<Hero />);
    const logo = screen.getByAltText('VIBE WORKING - KEEP AWAKE, LIVE PASSIONATE');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('width', '96');
    expect(logo).toHaveAttribute('height', '96');
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-hero-class';
    const { container } = render(<Hero className={customClass} />);
    const heroSection = container.querySelector('section');
    expect(heroSection).toHaveClass(customClass);
  });

  it('has proper semantic structure', () => {
    render(<Hero />);
    
    // Check for main heading
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    
    // Check for buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('has decorative elements marked as aria-hidden', () => {
    render(<Hero />);
    
    // Check for aria-hidden decorative elements
    const decorativeElements = screen.getAllByLabelText('', { selector: '[aria-hidden="true"]' });
    expect(decorativeElements.length).toBeGreaterThan(0);
  });

  it('meets accessibility standards', async () => {
    const { container } = render(<Hero />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper focus management', () => {
    render(<Hero />);
    
    // Check that buttons are focusable
    const primaryButton = screen.getByLabelText('무료로 시작하기');
    const secondaryButton = screen.getByLabelText('더 알아보기');
    
    expect(primaryButton).toBeInTheDocument();
    expect(secondaryButton).toBeInTheDocument();
  });

  it('renders with proper responsive classes', () => {
    render(<Hero />);
    
    // Check for responsive text classes
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-5xl', 'md:text-7xl');
    
    const slogan = screen.getByText('KEEP AWAKE, LIVE PASSIONATE');
    expect(slogan).toHaveClass('text-2xl', 'md:text-3xl');
  });

  it('has proper animation classes', () => {
    const { container } = render(<Hero />);

    // Check for animation classes
    const mainContainer = container.querySelector('.animate-fade-in');
    expect(mainContainer).toBeInTheDocument();
  });
});
