import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import Hero from '@/components/Hero';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Hero Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Hero />, { wrapper: TestWrapper });
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('displays the main heading', () => {
    render(<Hero />, { wrapper: TestWrapper });
    expect(screen.getByText('생각을 멈추지 않고,')).toBeInTheDocument();
    expect(screen.getByText('행동으로 옮깁니다')).toBeInTheDocument();
  });

  it('displays the slogan', () => {
    render(<Hero />, { wrapper: TestWrapper });
    expect(screen.getByText('KEEP AWAKE, LIVE PASSIONATE')).toBeInTheDocument();
  });

  it('displays the badge text', () => {
    render(<Hero />, { wrapper: TestWrapper });
    expect(screen.getByText('아이디어 실험실 & 프로덕트 스튜디오')).toBeInTheDocument();
  });

  it('displays CTA buttons', () => {
    render(<Hero />, { wrapper: TestWrapper });
    expect(screen.getByLabelText('서비스 살펴보기')).toBeInTheDocument();
    expect(screen.getByLabelText('프로젝트 보기')).toBeInTheDocument();
  });

  it('displays the logo with proper alt text', () => {
    render(<Hero />, { wrapper: TestWrapper });
    const logo = screen.getByAltText('VIBE WORKING - KEEP AWAKE, LIVE PASSIONATE');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('width', '1920');
    expect(logo).toHaveAttribute('height', '832');
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-hero-class';
    const { container } = render(<Hero className={customClass} />, { wrapper: TestWrapper });
    const heroSection = container.querySelector('section');
    expect(heroSection).toHaveClass(customClass);
  });

  it('has proper semantic structure', () => {
    render(<Hero />, { wrapper: TestWrapper });
    
    // Check for main heading
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    
    // Check for buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('has decorative elements marked as aria-hidden', () => {
    const { container } = render(<Hero />, { wrapper: TestWrapper });
    
    // Check for aria-hidden decorative elements
    const decorativeElements = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorativeElements.length).toBeGreaterThan(0);
  });

  it('meets accessibility standards', async () => {
    const { container } = render(<Hero />, { wrapper: TestWrapper });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper focus management', () => {
    render(<Hero />, { wrapper: TestWrapper });

    // Check that buttons are focusable
    const primaryButton = screen.getByLabelText('서비스 살펴보기');
    const secondaryButton = screen.getByLabelText('프로젝트 보기');

    expect(primaryButton).toBeInTheDocument();
    expect(secondaryButton).toBeInTheDocument();
  });

  it('renders with proper responsive classes', () => {
    render(<Hero />, { wrapper: TestWrapper });
    
    // Check for responsive text classes
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-5xl', 'md:text-7xl');
    
    const slogan = screen.getByText('KEEP AWAKE, LIVE PASSIONATE');
    expect(slogan).toHaveClass('text-2xl', 'md:text-3xl');
  });

  it('has proper animation classes', () => {
    const { container } = render(<Hero />, { wrapper: TestWrapper });

    // Check for animation classes
    const mainContainer = container.querySelector('.animate-fade-in');
    expect(mainContainer).toBeInTheDocument();
  });
});
