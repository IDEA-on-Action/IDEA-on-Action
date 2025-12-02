import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery'

describe('useMediaQuery', () => {
  let mediaQueryListeners: Map<string, (e: MediaQueryListEvent) => void>

  beforeEach(() => {
    mediaQueryListeners = new Map()

    // matchMedia 모킹
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        const mql = {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
            if (event === 'change') {
              mediaQueryListeners.set(query, listener)
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }
        return mql
      }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    mediaQueryListeners.clear()
  })

  it('초기값으로 미디어 쿼리 결과를 반환해야 함', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(typeof result.current).toBe('boolean')
    expect(result.current).toBe(false) // 모킹된 초기값
  })

  it('미디어 쿼리가 매칭되면 true를 반환해야 함', () => {
    // 매칭되는 미디어 쿼리 모킹
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(result.current).toBe(true)
  })

  it('미디어 쿼리가 매칭되지 않으면 false를 반환해야 함', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1920px)'))

    expect(result.current).toBe(false)
  })

  it('미디어 쿼리 변경 시 결과가 업데이트되어야 함', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(result.current).toBe(false)

    // 미디어 쿼리 변경 시뮬레이션
    act(() => {
      const listener = mediaQueryListeners.get('(min-width: 768px)')
      if (listener) {
        listener({
          matches: true,
          media: '(min-width: 768px)',
        } as MediaQueryListEvent)
      }
    })

    expect(result.current).toBe(true)
  })

  it('여러 미디어 쿼리를 동시에 처리할 수 있어야 함', () => {
    const { result: result1 } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    const { result: result2 } = renderHook(() => useMediaQuery('(max-width: 640px)'))

    expect(result1.current).toBe(false)
    expect(result2.current).toBe(false)
  })

  it('addEventListener를 지원하는 브라우저에서 정상 작동해야 함', () => {
    const addEventListenerMock = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerMock,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('레거시 브라우저의 addListener를 폴백으로 사용해야 함', () => {
    const addListenerMock = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: addListenerMock,
        removeListener: vi.fn(),
        addEventListener: undefined, // 미지원
        removeEventListener: undefined,
        dispatchEvent: vi.fn(),
      })),
    })

    renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(addListenerMock).toHaveBeenCalledWith(expect.any(Function))
  })

  it('언마운트 시 이벤트 리스너를 제거해야 함', () => {
    const removeEventListenerMock = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
      })),
    })

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    unmount()

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('쿼리 변경 시 이전 리스너를 제거하고 새 리스너를 등록해야 함', () => {
    const removeEventListenerMock = vi.fn()
    const addEventListenerMock = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
      })),
    })

    const { rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      {
        initialProps: { query: '(min-width: 768px)' },
      }
    )

    // 쿼리 변경
    rerender({ query: '(min-width: 1024px)' })

    // 이전 리스너 제거 확인
    expect(removeEventListenerMock).toHaveBeenCalled()
    // 새 리스너 등록 확인
    expect(addEventListenerMock).toHaveBeenCalledTimes(2) // 초기 + 변경
  })
})

describe('useIsMobile', () => {
  it('모바일 크기 (max-width: 640px)를 감지해야 함', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 640px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })
})

describe('useIsTablet', () => {
  it('태블릿 크기 (641px-1024px)를 감지해야 함', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(min-width: 641px) and (max-width: 1024px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { result } = renderHook(() => useIsTablet())

    expect(result.current).toBe(true)
  })
})

describe('useIsDesktop', () => {
  it('데스크톱 크기 (min-width: 1025px)를 감지해야 함', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(min-width: 1025px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { result } = renderHook(() => useIsDesktop())

    expect(result.current).toBe(true)
  })
})
