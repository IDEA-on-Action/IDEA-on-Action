'use client'

import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('vibe-working-theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    handleChange()

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setResolvedTheme(systemTheme)
      root.classList.toggle('dark', systemTheme === 'dark')
      root.setAttribute('data-theme', systemTheme)
    } else {
      setResolvedTheme(theme)
      root.classList.toggle('dark', theme === 'dark')
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  const setAndSaveTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('vibe-working-theme', newTheme)
  }

  return {
    theme,
    resolvedTheme,
    setTheme: setAndSaveTheme,
    toggleTheme: () => {
      const newTheme = resolvedTheme === 'light' ? 'dark' : 'light'
      setAndSaveTheme(newTheme)
    },
  }
}
