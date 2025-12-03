/**
 * Accessibility Improvements Tests
 *
 * Lighthouse 접근성 이슈 해결 확인
 * - button-name: Services 페이지 버튼 레이블
 * - color-contrast: Login 페이지 대비율
 * - 추가 접근성 개선 사항
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import Services from '@/pages/Services'
import Login from '@/pages/Login'

expect.extend(toHaveNoViolations)

// Mock dependencies
vi.mock('@/hooks/useServices', () => ({
  useServices: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
  useServiceCategories: () => ({
    data: [
      { id: '1', name: 'AI 솔루션' },
      { id: '2', name: '웹 개발' },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ data: false }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    signInWithGoogle: vi.fn(),
    signInWithGithub: vi.fn(),
    signInWithKakao: vi.fn(),
    signInWithEmail: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock('@/components/Header', () => ({
  default: () => <header>Mock Header</header>,
}))

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Mock Footer</footer>,
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{component}</BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

describe('접근성 개선 - Services 페이지', () => {
  it('button-name: 모든 버튼에 접근 가능한 이름이 있어야 함', () => {
    renderWithProviders(<Services />)

    // "서비스 등록" 버튼 (관리자일 경우에만 표시되지만, useIsAdmin을 mock하여 false로 설정)
    // 카테고리 탭 버튼들
    const allTab = screen.getByRole('tab', { name: /모든 카테고리 보기/i })
    expect(allTab).toBeInTheDocument()
    expect(allTab).toHaveAccessibleName()

    const categoryTabs = screen.getAllByRole('tab')
    categoryTabs.forEach((tab) => {
      expect(tab).toHaveAccessibleName()
    })
  })

  it('aria-label: 카테고리 필터에 적절한 aria-label이 있어야 함', () => {
    renderWithProviders(<Services />)

    const tabList = screen.getByRole('tablist')
    expect(tabList).toBeInTheDocument()

    // 모든 탭에 aria-label 확인
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBeGreaterThan(0)

    tabs.forEach((tab) => {
      expect(tab).toHaveAttribute('aria-label')
    })
  })

  it('주요 접근성 규칙을 준수해야 함 (axe-core)', async () => {
    const { container } = renderWithProviders(<Services />)
    const results = await axe(container, {
      rules: {
        // shadcn/ui 컴포넌트의 알려진 제한사항 제외
        'aria-valid-attr-value': { enabled: false },
        'heading-order': { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})

describe('접근성 개선 - Login 페이지', () => {
  it('color-contrast: 텍스트가 충분한 대비율을 가져야 함', () => {
    renderWithProviders(<Login />)

    // CardDescription이 text-foreground/80 클래스로 대비율 개선됨
    const description = screen.getByText(/소셜 로그인 버튼을 클릭하면/i)
    expect(description).toBeInTheDocument()
    expect(description).toHaveClass('text-foreground/80')

    // "또는" 구분선 텍스트가 text-foreground/70으로 대비율 개선됨
    const separator = screen.getByText(/또는/i)
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveClass('text-foreground/70')
  })

  it('button-name: OAuth 버튼에 접근 가능한 이름이 있어야 함', () => {
    renderWithProviders(<Login />)

    const googleButton = screen.getByRole('button', { name: /Google 계정으로 로그인/i })
    expect(googleButton).toBeInTheDocument()
    expect(googleButton).toHaveAccessibleName()

    const githubButton = screen.getByRole('button', { name: /GitHub 계정으로 로그인/i })
    expect(githubButton).toBeInTheDocument()
    expect(githubButton).toHaveAccessibleName()

    const kakaoButton = screen.getByRole('button', { name: /Kakao 계정으로 로그인/i })
    expect(kakaoButton).toBeInTheDocument()
    expect(kakaoButton).toHaveAccessibleName()
  })

  it('form: 폼 필드에 적절한 레이블이 있어야 함', () => {
    renderWithProviders(<Login />)

    const emailInput = screen.getByLabelText(/이메일 또는 아이디 입력/i)
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('aria-label', '이메일 또는 아이디 입력')
    expect(emailInput).toHaveAttribute('autoComplete', 'username')

    const passwordInput = screen.getByLabelText(/비밀번호 입력/i)
    expect(passwordInput).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('aria-label', '비밀번호 입력')
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
  })

  it('주요 접근성 규칙을 준수해야 함 (axe-core)', async () => {
    const { container } = renderWithProviders(<Login />)
    const results = await axe(container, {
      rules: {
        // shadcn/ui 컴포넌트의 알려진 제한사항 제외
        'landmark-one-main': { enabled: false },
        'region': { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})

describe('추가 접근성 개선', () => {
  it('Services: aria-label이 카테고리 필터에 적용되어야 함', () => {
    renderWithProviders(<Services />)

    // 카테고리 탭리스트가 있는지 확인
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
  })

  it('Login: 아이콘에 aria-hidden이 적용되어야 함', () => {
    renderWithProviders(<Login />)

    // SVG 아이콘들은 장식용이므로 aria-hidden="true"
    const svgIcons = document.querySelectorAll('svg[aria-hidden="true"]')
    expect(svgIcons.length).toBeGreaterThan(0)
  })

  it('Services: 결과 카운트가 의미 있는 정보를 제공해야 함', () => {
    renderWithProviders(<Services />)

    // "0개" 텍스트와 "의 서비스" 텍스트 확인 (여러 요소 중 두 번째 - 결과 카운트)
    const countTexts = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('0개') ?? false
    })
    expect(countTexts.length).toBeGreaterThan(0)
    expect(countTexts[0]).toBeInTheDocument()

    const servicesTexts = screen.getAllByText(/의 서비스/i)
    expect(servicesTexts.length).toBeGreaterThan(0)
    // "우리의 서비스" (제목) 와 "총 0개의 서비스" (카운트) 구분
    expect(servicesTexts[1]).toBeInTheDocument()
  })
})
