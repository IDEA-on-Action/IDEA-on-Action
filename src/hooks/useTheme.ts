/**
 * useTheme Hook
 * next-themes 래퍼 - 테마 시스템 통일
 * @see https://github.com/pacocoursey/next-themes
 */
'use client'

import { useTheme as useNextTheme } from 'next-themes'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme()

  return {
    theme: (theme || 'system') as Theme,
    resolvedTheme: (resolvedTheme || 'light') as 'light' | 'dark',
    systemTheme: systemTheme as 'light' | 'dark' | undefined,
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    toggleTheme: () => {
      const current = resolvedTheme || 'light'
      setTheme(current === 'light' ? 'dark' : 'light')
    },
  }
}
