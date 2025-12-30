import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// next-themes 모킹 상태
const mockState = {
  theme: 'system' as string | undefined,
  resolvedTheme: 'light' as string | undefined,
  systemTheme: undefined as 'light' | 'dark' | undefined,
  setTheme: vi.fn(),
}

vi.mock('next-themes', () => ({
  useTheme: () => ({
    get theme() { return mockState.theme },
    get resolvedTheme() { return mockState.resolvedTheme },
    get systemTheme() { return mockState.systemTheme },
    setTheme: (newTheme: string) => {
      mockState.setTheme(newTheme)
      mockState.theme = newTheme
      if (newTheme === 'system') {
        mockState.resolvedTheme = mockState.systemTheme || 'light'
      } else {
        mockState.resolvedTheme = newTheme
      }
    },
  }),
}))

// 훅 import는 mock 후에 해야 함
import { useTheme } from '@/hooks/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    // 초기 상태 리셋
    mockState.theme = 'system'
    mockState.resolvedTheme = 'light'
    mockState.systemTheme = undefined
    mockState.setTheme.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('초기 테마는 system이어야 함', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('저장된 테마를 불러와야 함', () => {
    // dark 테마 상태로 설정
    mockState.theme = 'dark'
    mockState.resolvedTheme = 'dark'

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('테마를 변경해야 함', () => {
    const { result, rerender } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(mockState.setTheme).toHaveBeenCalledWith('dark')

    // rerender 후 상태 확인
    rerender()
    expect(result.current.theme).toBe('dark')
  })

  it('toggleTheme이 light와 dark를 전환해야 함', () => {
    const { result, rerender } = renderHook(() => useTheme())

    // 초기 상태: light (resolvedTheme 기준)
    expect(result.current.resolvedTheme).toBe('light')

    // dark로 전환
    act(() => {
      result.current.toggleTheme()
    })

    expect(mockState.setTheme).toHaveBeenCalledWith('dark')

    // rerender 후 상태 확인
    rerender()
    expect(result.current.theme).toBe('dark')

    // light로 다시 전환
    act(() => {
      result.current.toggleTheme()
    })

    expect(mockState.setTheme).toHaveBeenCalledWith('light')

    rerender()
    expect(result.current.theme).toBe('light')
  })

  it('system 테마는 시스템 설정을 따라야 함', () => {
    // 시스템이 dark 모드일 때
    mockState.systemTheme = 'dark'
    mockState.theme = 'system'
    mockState.resolvedTheme = 'dark'

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(result.current.systemTheme).toBe('dark')
  })

  it('system 테마 설정 시 resolvedTheme이 시스템 테마를 반영해야 함', () => {
    mockState.systemTheme = 'dark'

    const { result, rerender } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('system')
    })

    expect(mockState.setTheme).toHaveBeenCalledWith('system')

    rerender()
    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('light 테마 설정이 동작해야 함', () => {
    const { result, rerender } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    expect(mockState.setTheme).toHaveBeenCalledWith('light')

    rerender()
    expect(result.current.theme).toBe('light')
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('dark 테마 설정이 동작해야 함', () => {
    const { result, rerender } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(mockState.setTheme).toHaveBeenCalledWith('dark')

    rerender()
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('theme 값이 없으면 기본값 system을 반환해야 함', () => {
    mockState.theme = undefined

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('system')
  })

  it('resolvedTheme 값이 없으면 기본값 light를 반환해야 함', () => {
    mockState.resolvedTheme = undefined

    const { result } = renderHook(() => useTheme())

    expect(result.current.resolvedTheme).toBe('light')
  })
})
