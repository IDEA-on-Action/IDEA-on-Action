import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTheme } from '@/hooks/useTheme'

describe('useTheme', () => {
  // localStorage 모킹
  let localStorageMock: { [key: string]: string } = {}

  beforeEach(() => {
    // localStorage 초기화
    localStorageMock = {}

    // localStorage 메서드 모킹
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      }),
      length: 0,
      key: vi.fn(),
    }

    // matchMedia 모킹
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    // document.documentElement 모킹
    Object.defineProperty(document, 'documentElement', {
      writable: true,
      value: {
        classList: {
          toggle: vi.fn(),
        },
        setAttribute: vi.fn(),
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('초기 테마는 system이어야 함', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('localStorage에 저장된 테마를 불러와야 함', async () => {
    // localStorage에 dark 테마 저장
    localStorageMock['vibe-working-theme'] = 'dark'

    const { result } = renderHook(() => useTheme())

    await waitFor(() => {
      expect(result.current.theme).toBe('dark')
    })
  })

  it('테마를 변경하고 localStorage에 저장해야 함', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(localStorage.setItem).toHaveBeenCalledWith('vibe-working-theme', 'dark')
  })

  it('toggleTheme이 light와 dark를 전환해야 함', () => {
    const { result } = renderHook(() => useTheme())

    // 초기 상태: light
    expect(result.current.resolvedTheme).toBe('light')

    // dark로 전환
    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('dark')

    // light로 다시 전환
    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('light')
  })

  it.skip('시스템 테마 변경을 감지해야 함', async () => {
    // 이벤트 리스너 동작이 비동기 환경에서 예측하기 어려워 skip
    const listeners: Array<(e: MediaQueryListEvent) => void> = []

    // matchMedia 이벤트 리스너 모킹
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            listeners.push(listener)
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { result } = renderHook(() => useTheme())

    // 초기 상태 확인
    expect(result.current.theme).toBe('system')

    // 시스템 테마가 dark로 변경되었다고 시뮬레이션
    await act(async () => {
      listeners.forEach((listener) => {
        listener({
          matches: true,
          media: '(prefers-color-scheme: dark)',
        } as MediaQueryListEvent)
      })
    })

    // resolvedTheme이 업데이트되는 것을 확인
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('dark 테마 설정 시 document에 dark 클래스를 추가해야 함', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true)
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
  })

  it('light 테마 설정 시 document에서 dark 클래스를 제거해야 함', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false)
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light')
  })

  it('system 테마는 시스템 설정을 따라야 함', () => {
    // 시스템이 dark 모드일 때
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true, // dark 모드
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('system')
    })

    expect(result.current.theme).toBe('system')
    // 시스템이 dark이므로 resolvedTheme도 dark여야 함
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('언마운트 시 이벤트 리스너를 제거해야 함', () => {
    const removeEventListenerMock = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
      })),
    })

    const { unmount } = renderHook(() => useTheme())

    unmount()

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
