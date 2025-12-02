import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePageContext } from '@/hooks/usePageContext'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// react-router-dom 모킹
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: vi.fn(),
    useParams: vi.fn(),
  }
})

describe('usePageContext', () => {
  let useLocationSpy: ReturnType<typeof vi.fn>
  let useParamsSpy: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const router = await import('react-router-dom')
    useLocationSpy = vi.spyOn(router, 'useLocation')
    useParamsSpy = vi.spyOn(router, 'useParams')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('홈페이지 컨텍스트를 반환해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/' })
    useParamsSpy.mockReturnValue({})

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/',
      pageType: 'home',
    })
  })

  it('빈 경로도 홈페이지로 인식해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '' })
    useParamsSpy.mockReturnValue({})

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '',
      pageType: 'home',
    })
  })

  it('서비스 상세 페이지 컨텍스트를 반환해야 함 (MVP)', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/mvp' })
    useParamsSpy.mockReturnValue({ slug: 'mvp' })

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/services/mvp',
      pageType: 'service',
      serviceId: 'mvp',
      serviceName: 'MVP 개발',
    })
  })

  it('서비스 상세 페이지 컨텍스트를 반환해야 함 (Fullstack)', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/fullstack' })
    useParamsSpy.mockReturnValue({ slug: 'fullstack' })

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/services/fullstack',
      pageType: 'service',
      serviceId: 'fullstack',
      serviceName: '풀스택 개발',
    })
  })

  it('서비스 상세 페이지 컨텍스트를 반환해야 함 (Design)', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/design' })
    useParamsSpy.mockReturnValue({ slug: 'design' })

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/services/design',
      pageType: 'service',
      serviceId: 'design',
      serviceName: 'UI/UX 디자인',
    })
  })

  it('Minu Navigator 서비스 페이지를 올바르게 인식해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/navigator' })
    useParamsSpy.mockReturnValue({ slug: 'navigator' })

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/services/navigator',
      pageType: 'service',
      serviceId: 'navigator',
      serviceName: 'Minu Find (사업기회 탐색)',
    })
  })

  it('Minu Cartographer 서비스 페이지를 올바르게 인식해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/cartographer' })
    useParamsSpy.mockReturnValue({ slug: 'cartographer' })

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/services/cartographer',
      pageType: 'service',
      serviceId: 'cartographer',
      serviceName: 'Minu Frame (문제정의 & RFP)',
    })
  })

  it('Minu Captain 서비스 페이지를 올바르게 인식해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/captain' })
    useParamsSpy.mockReturnValue({ slug: 'captain' })

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/services/captain',
      pageType: 'service',
      serviceId: 'captain',
      serviceName: 'Minu Build (프로젝트 진행)',
    })
  })

  it('Minu Harbor 서비스 페이지를 올바르게 인식해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/harbor' })
    useParamsSpy.mockReturnValue({ slug: 'harbor' })

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/services/harbor',
      pageType: 'service',
      serviceId: 'harbor',
      serviceName: 'Minu Keep (운영/유지보수)',
    })
  })

  it('매핑되지 않은 서비스 slug는 slug를 그대로 서비스명으로 사용해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/unknown-service' })
    useParamsSpy.mockReturnValue({ slug: 'unknown-service' })

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/services/unknown-service',
      pageType: 'service',
      serviceId: 'unknown-service',
      serviceName: 'unknown-service',
    })
  })

  it('관리자 페이지 컨텍스트를 반환해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/admin' })
    useParamsSpy.mockReturnValue({})

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/admin',
      pageType: 'admin',
    })
  })

  it('관리자 하위 페이지도 admin으로 인식해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/admin/users' })
    useParamsSpy.mockReturnValue({})

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/admin/users',
      pageType: 'admin',
    })
  })

  it('기타 페이지 컨텍스트를 반환해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/about' })
    useParamsSpy.mockReturnValue({})

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/about',
      pageType: 'other',
    })
  })

  it('복잡한 경로도 기타 페이지로 인식해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/blog/posts/123' })
    useParamsSpy.mockReturnValue({})

    const { result } = renderHook(() => usePageContext())

    expect(result.current).toEqual({
      path: '/blog/posts/123',
      pageType: 'other',
    })
  })

  it('경로 변경 시 컨텍스트가 업데이트되어야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/' })
    useParamsSpy.mockReturnValue({})

    const { result, rerender } = renderHook(() => usePageContext())

    expect(result.current.pageType).toBe('home')

    // 경로 변경
    useLocationSpy.mockReturnValue({ pathname: '/admin' })
    rerender()

    expect(result.current.pageType).toBe('admin')
  })

  it('서비스 페이지 간 이동 시 컨텍스트가 업데이트되어야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/mvp' })
    useParamsSpy.mockReturnValue({ slug: 'mvp' })

    const { result, rerender } = renderHook(() => usePageContext())

    expect(result.current.serviceId).toBe('mvp')
    expect(result.current.serviceName).toBe('MVP 개발')

    // 다른 서비스로 이동
    useLocationSpy.mockReturnValue({ pathname: '/services/design' })
    useParamsSpy.mockReturnValue({ slug: 'design' })
    rerender()

    expect(result.current.serviceId).toBe('design')
    expect(result.current.serviceName).toBe('UI/UX 디자인')
  })

  it('useMemo를 사용하여 불필요한 재계산을 방지해야 함', () => {
    useLocationSpy.mockReturnValue({ pathname: '/services/mvp' })
    useParamsSpy.mockReturnValue({ slug: 'mvp' })

    const { result, rerender } = renderHook(() => usePageContext())

    const firstResult = result.current

    // 경로 변경 없이 리렌더
    rerender()

    // 같은 객체 참조여야 함 (메모이제이션)
    expect(result.current).toBe(firstResult)
  })
})
