import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'ko',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock cart hook
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    totalPrice: 0,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

// Custom render with Router and QueryClient wrapper
const render = (ui: React.ReactElement, options = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return rtlRender(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    ),
    ...options,
  });
};

describe('Header Component', () => {
  beforeEach(() => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0
    });
  });

  it('renders without crashing', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays the brand logo and name', () => {
    render(<Header />);

    expect(screen.getByAltText('IDEA on Action Logo')).toBeInTheDocument();
    expect(screen.getByText('IDEA on Action')).toBeInTheDocument();
    expect(screen.getByText('생각과행동')).toBeInTheDocument();
  });

  it('displays navigation items on desktop', () => {
    render(<Header />);

    // Desktop navigation items should be visible
    expect(screen.getByText('홈')).toBeInTheDocument();
    expect(screen.getByText('서비스')).toBeInTheDocument();
    expect(screen.getByText('프로젝트')).toBeInTheDocument();
    expect(screen.getByText('이야기')).toBeInTheDocument();
    expect(screen.getByText('함께하기')).toBeInTheDocument();
  });

  it('displays login button when user is not authenticated', () => {
    render(<Header />);
    
    expect(screen.getByLabelText('로그인 페이지로 이동')).toBeInTheDocument();
  });

  it('displays mobile menu button on mobile', () => {
    render(<Header />);
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    expect(mobileMenuButton).toBeInTheDocument();
    expect(mobileMenuButton).toHaveClass('md:hidden');
  });

  it('toggles mobile menu when button is clicked', async () => {
    render(<Header />);
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();
    });
  });

  it('displays mobile navigation items when menu is open', async () => {
    render(<Header />);

    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);

    await waitFor(() => {
      expect(screen.getAllByText('홈').length).toBeGreaterThan(0);
      expect(screen.getAllByText('서비스').length).toBeGreaterThan(0);
      expect(screen.getAllByText('프로젝트').length).toBeGreaterThan(0);
      expect(screen.getAllByText('이야기').length).toBeGreaterThan(0);
      expect(screen.getAllByText('함께하기').length).toBeGreaterThan(0);
    });
  });

  it('closes mobile menu when route changes', async () => {
    render(<Header />);

    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);

    await waitFor(() => {
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();
    });

    // Simulate route change - use getAllByText and click the mobile menu link
    const serviceLinks = screen.getAllByText('서비스');
    const mobileServiceLink = serviceLinks.find(link =>
      link.closest('[class*="block"]')
    ) || serviceLinks[serviceLinks.length - 1];
    fireEvent.click(mobileServiceLink);

    await waitFor(() => {
      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-header-class';
    render(<Header className={customClass} />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass(customClass);
  });

  it('has proper semantic structure', () => {
    render(<Header />);
    
    // Check for header element
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    // Check for navigation
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<Header />);

    // Check for proper ARIA labels
    expect(screen.getByLabelText('홈 페이지로 이동')).toBeInTheDocument();
    expect(screen.getByLabelText('로그인 페이지로 이동')).toBeInTheDocument();
    expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(<Header />);
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    mobileMenuButton.focus();
    expect(mobileMenuButton).toHaveFocus();
  });

  it('has proper focus management', () => {
    render(<Header />);
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    mobileMenuButton.focus();
    expect(mobileMenuButton).toHaveFocus();
  });

  it('has proper hover and focus states', () => {
    render(<Header />);

    // 브랜드 로고가 포함된 링크를 찾기 (이미지 alt 텍스트로)
    const logo = screen.getByAltText('IDEA on Action Logo');
    const brandLink = logo.closest('a');
    expect(brandLink).toHaveClass('hover:opacity-80');
  });

  it('renders with proper responsive classes', () => {
    render(<Header />);

    // Check for responsive navigation (데스크톱 네비게이션 컨테이너)
    const desktopNavContainer = screen.getByText('홈').closest('div');
    expect(desktopNavContainer).toHaveClass('hidden', 'md:flex');

    // Check for mobile menu button
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    expect(mobileMenuButton).toHaveClass('md:hidden');
  });

  it('has proper scroll effect classes', () => {
    render(<Header />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('transition-all', 'duration-300');
  });

  it('meets accessibility standards', async () => {
    const { container } = render(<Header />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper logo attributes', () => {
    render(<Header />);
    
    const logo = screen.getByAltText('IDEA on Action Logo');
    expect(logo).toHaveAttribute('width', '40');
    expect(logo).toHaveAttribute('height', '40');
  });

  it('displays mobile login button when user is not authenticated', async () => {
    render(<Header />);
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);
    
    await waitFor(() => {
      expect(screen.getAllByText('로그인').length).toBeGreaterThan(0);
    });
  });

  it('has proper mobile menu structure', async () => {
    render(<Header />);
    
    const mobileMenuButton = screen.getByLabelText('메뉴 열기');
    fireEvent.click(mobileMenuButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();
    });
    
    // 모바일 메뉴가 열렸는지 확인 (메뉴 닫기 버튼이 존재하면 메뉴가 열린 것)
    const closeButton = screen.getByLabelText('메뉴 닫기');
    expect(closeButton).toBeInTheDocument();
  });

  it('handles scroll effect correctly', () => {
    render(<Header />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('glass-card');
  });
});
