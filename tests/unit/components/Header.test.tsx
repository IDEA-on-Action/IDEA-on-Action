import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import Header from '@/components/Header';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    signOut: vi.fn()
  })
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({
    data: false
  })
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Header Component', () => {
  beforeEach(() => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0
    });
  });

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays the brand logo and name', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    expect(screen.getByAltText('IDEA on Action Logo')).toBeInTheDocument();
    expect(screen.getByText('IDEA on Action')).toBeInTheDocument();
    expect(screen.getByText('생각과행동')).toBeInTheDocument();
  });

  it('displays navigation items on desktop', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    expect(screen.getByText('서비스')).toBeInTheDocument();
    expect(screen.getByText('기술')).toBeInTheDocument();
    expect(screen.getByText('회사소개')).toBeInTheDocument();
    expect(screen.getByText('문의')).toBeInTheDocument();
  });

  it('displays login button when user is not authenticated', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    expect(screen.getByLabelText('로그인 페이지로 이동')).toBeInTheDocument();
  });

  it('displays mobile menu button on mobile', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    expect(mobileMenuButton).toBeInTheDocument();
    expect(mobileMenuButton).toHaveClass('md:hidden');
  });

  it('toggles mobile menu when button is clicked', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();
    });
  });

  it('displays mobile navigation items when menu is open', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);
    
    await waitFor(() => {
      expect(screen.getByText('서비스')).toBeInTheDocument();
      expect(screen.getByText('기술')).toBeInTheDocument();
      expect(screen.getByText('회사소개')).toBeInTheDocument();
      expect(screen.getByText('문의')).toBeInTheDocument();
    });
  });

  it('closes mobile menu when route changes', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();
    });
    
    // Simulate route change
    fireEvent.click(screen.getByText('서비스'));
    
    await waitFor(() => {
      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-header-class';
    render(
      <TestWrapper>
        <Header className={customClass} />
      </TestWrapper>
    );
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass(customClass);
  });

  it('has proper semantic structure', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    // Check for header element
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    // Check for navigation
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    // Check for proper ARIA labels
    expect(screen.getByLabelText('홈페이지로 이동')).toBeInTheDocument();
    expect(screen.getByLabelText('로그인 페이지로 이동')).toBeInTheDocument();
    expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    mobileMenuButton.focus();
    expect(mobileMenuButton).toHaveFocus();
  });

  it('has proper focus management', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    mobileMenuButton.focus();
    expect(mobileMenuButton).toHaveFocus();
  });

  it('has proper hover and focus states', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const brandLink = screen.getByLabelText('홈페이지로 이동');
    expect(brandLink).toHaveClass('hover:opacity-80');
  });

  it('renders with proper responsive classes', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    // Check for responsive navigation
    const desktopNav = screen.getByText('서비스').closest('div');
    expect(desktopNav).toHaveClass('hidden', 'md:flex');
    
    // Check for mobile menu button
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    expect(mobileMenuButton).toHaveClass('md:hidden');
  });

  it('has proper scroll effect classes', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('transition-all', 'duration-300');
  });

  it('meets accessibility standards', async () => {
    const { container } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper logo attributes', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const logo = screen.getByAltText('IDEA on Action Logo');
    expect(logo).toHaveAttribute('width', '40');
    expect(logo).toHaveAttribute('height', '40');
  });

  it('displays mobile login button when user is not authenticated', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);
    
    await waitFor(() => {
      expect(screen.getByText('로그인')).toBeInTheDocument();
    });
  });

  it('has proper mobile menu structure', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);
    
    await waitFor(() => {
      const mobileMenu = screen.getByLabelText('메뉴 닫기').closest('div')?.parentElement;
      expect(mobileMenu).toHaveClass('md:hidden');
    });
  });

  it('handles scroll effect correctly', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('glass-card');
  });
});
