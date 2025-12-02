import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('초기값이 즉시 반환되어야 함', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))

    expect(result.current).toBe('initial')
  })

  it('지연 시간 전에는 값이 업데이트되지 않아야 함', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    )

    expect(result.current).toBe('initial')

    // 값 변경
    rerender({ value: 'updated', delay: 500 })

    // 지연 시간 전에는 이전 값 유지
    expect(result.current).toBe('initial')
  })

  it('지연 시간 후에 값이 업데이트되어야 함', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    )

    expect(result.current).toBe('initial')

    // 값 변경
    rerender({ value: 'updated', delay: 300 })

    // 타이머 진행 (act로 감싸서 상태 업데이트 대기)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current).toBe('updated')
  })

  it('연속된 값 변경 시 마지막 값만 반영되어야 함 (디바운스)', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    )

    // 여러 번 빠르게 값 변경
    rerender({ value: 'first', delay: 500 })
    await vi.advanceTimersByTimeAsync(100)

    rerender({ value: 'second', delay: 500 })
    await vi.advanceTimersByTimeAsync(100)

    rerender({ value: 'third', delay: 500 })
    await vi.advanceTimersByTimeAsync(100)

    // 아직 초기값 유지
    expect(result.current).toBe('initial')

    // 마지막 변경 후 지연 시간 진행
    await vi.advanceTimersByTimeAsync(500)

    // 마지막 값만 반영
    expect(result.current).toBe('third')
  })

  it('기본 지연 시간은 300ms여야 함', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value), // delay 미지정
      {
        initialProps: { value: 'initial' },
      }
    )

    rerender({ value: 'updated' })

    // 300ms 전에는 업데이트 안 됨
    await vi.advanceTimersByTimeAsync(200)
    expect(result.current).toBe('initial')

    // 300ms 후에는 업데이트됨
    await vi.advanceTimersByTimeAsync(100)

    expect(result.current).toBe('updated')
  })

  it('숫자 값도 디바운스되어야 함', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 0, delay: 300 },
      }
    )

    expect(result.current).toBe(0)

    rerender({ value: 100, delay: 300 })

    await vi.advanceTimersByTimeAsync(300)

    expect(result.current).toBe(100)
  })

  it('객체 값도 디바운스되어야 함', async () => {
    const initialObj = { name: 'John', age: 30 }
    const updatedObj = { name: 'Jane', age: 25 }

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 300 },
      }
    )

    expect(result.current).toEqual(initialObj)

    rerender({ value: updatedObj, delay: 300 })

    await vi.advanceTimersByTimeAsync(300)

    expect(result.current).toEqual(updatedObj)
  })

  it('배열 값도 디바운스되어야 함', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: [1, 2, 3], delay: 300 },
      }
    )

    expect(result.current).toEqual([1, 2, 3])

    rerender({ value: [4, 5, 6], delay: 300 })

    await vi.advanceTimersByTimeAsync(300)

    expect(result.current).toEqual([4, 5, 6])
  })

  it('지연 시간이 변경되면 새로운 지연 시간이 적용되어야 함', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    )

    rerender({ value: 'updated', delay: 500 })

    // 500ms보다 적은 시간 진행
    await vi.advanceTimersByTimeAsync(300)

    // 지연 시간을 100ms로 변경
    rerender({ value: 'updated', delay: 100 })

    // 100ms 후 업데이트
    await vi.advanceTimersByTimeAsync(100)

    expect(result.current).toBe('updated')
  })

  it('언마운트 시 타이머가 정리되어야 함', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    )

    rerender({ value: 'updated', delay: 500 })

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
