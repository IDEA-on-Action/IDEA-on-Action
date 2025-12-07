import { describe, it, expect } from 'vitest'
import { cn, formatFileSize } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('단일 클래스 이름을 반환해야 함', () => {
      expect(cn('class1')).toBe('class1')
    })

    it('여러 클래스 이름을 병합해야 함', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('조건부 클래스를 처리해야 함', () => {
      const condition = false
      expect(cn('class1', condition && 'class2', 'class3')).toBe('class1 class3')
    })

    it('객체 형태의 조건부 클래스를 처리해야 함', () => {
      expect(cn({ class1: true, class2: false, class3: true })).toBe('class1 class3')
    })

    it('배열 형태의 클래스를 처리해야 함', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2')
    })

    it('undefined와 null을 무시해야 함', () => {
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2')
    })

    it('빈 문자열을 무시해야 함', () => {
      expect(cn('class1', '', 'class2')).toBe('class1 class2')
    })

    it('Tailwind CSS 충돌 클래스를 병합해야 함', () => {
      // twMerge는 충돌하는 Tailwind 클래스 중 마지막 것만 유지
      expect(cn('px-2', 'px-4')).toBe('px-4')
    })

    it('복잡한 Tailwind 클래스 조합을 처리해야 함', () => {
      const result = cn(
        'text-base',
        'text-red-500',
        { 'text-blue-500': false },
        ['hover:text-green-500']
      )
      expect(result).toContain('text-red-500')
      expect(result).toContain('hover:text-green-500')
    })

    it('인자가 없을 때 빈 문자열을 반환해야 함', () => {
      expect(cn()).toBe('')
    })
  })

  describe('formatFileSize', () => {
    it('0 바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(500)).toBe('500 Bytes')
    })

    it('킬로바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
    })

    it('메가바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1048576)).toBe('1 MB')
    })

    it('기가바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('테라바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB')
    })

    it('소수점 이하 두 자리까지 표시해야 함', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('소수점 이하가 없으면 정수로 표시해야 함', () => {
      expect(formatFileSize(2048)).toBe('2 KB')
    })

    it('복잡한 크기를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1572864)).toBe('1.5 MB')
    })

    it('아주 작은 KB 값을 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1024 * 0.1)).toBe('102.4 Bytes')
    })

    it('큰 GB 값을 올바르게 포맷해야 함', () => {
      expect(formatFileSize(5368709120)).toBe('5 GB')
    })

    it('소수점 이하 반올림을 올바르게 처리해야 함', () => {
      // 1.234 KB는 1.23 KB로 표시
      expect(formatFileSize(1264)).toBe('1.23 KB')
    })

    it('1바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1)).toBe('1 Bytes')
    })

    it('999바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(999)).toBe('999 Bytes')
    })

    it('1023바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1023)).toBe('1023 Bytes')
    })

    it('매우 큰 값을 TB로 포맷해야 함', () => {
      expect(formatFileSize(5497558138880)).toBe('5 TB')
    })
  })
})
