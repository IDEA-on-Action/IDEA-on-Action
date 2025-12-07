import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useGitHubStats,
  useGitHubReleases,
  useGitHubLatestRelease,
  formatGitHubStatsSummary,
} from '@/hooks/useGitHubStats'
import * as githubApi from '@/lib/github-api'

// Mock GitHub API
vi.mock('@/lib/github-api', () => ({
  getRepoStats: vi.fn(),
  getReleases: vi.fn(),
  getLatestRelease: vi.fn(),
  parseGitHubUrl: vi.fn(),
}))

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useGitHubStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useGitHubStats', () => {
    it('유효한 GitHub URL로 저장소 통계를 조회해야 함', async () => {
      const mockStats = {
        stars: 12345,
        forks: 678,
        contributors: 42,
        openIssues: 10,
        watchers: 200,
        description: 'Test repo',
        language: 'TypeScript',
      }

      vi.mocked(githubApi.parseGitHubUrl).mockReturnValue({
        owner: 'facebook',
        repo: 'react',
      })
      vi.mocked(githubApi.getRepoStats).mockResolvedValue(mockStats)

      const { result } = renderHook(
        () => useGitHubStats('https://github.com/facebook/react'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
      expect(githubApi.getRepoStats).toHaveBeenCalledWith('facebook', 'react')
    })

    it('null URL은 null을 반환해야 함', async () => {
      const { result } = renderHook(() => useGitHubStats(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(false)
      })
    })

    it('빈 URL은 null을 반환해야 함', async () => {
      const { result } = renderHook(() => useGitHubStats(''), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(false)
      })
    })

    it('잘못된 GitHub URL은 null을 반환해야 함', async () => {
      vi.mocked(githubApi.parseGitHubUrl).mockReturnValue(null)

      const { result } = renderHook(
        () => useGitHubStats('https://invalid-url.com'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()
    })

    it('API 오류를 처리해야 함', async () => {
      vi.mocked(githubApi.parseGitHubUrl).mockReturnValue({
        owner: 'owner',
        repo: 'repo',
      })
      vi.mocked(githubApi.getRepoStats).mockRejectedValue(
        new Error('API Error')
      )

      const { result } = renderHook(
        () => useGitHubStats('https://github.com/owner/repo'),
        { wrapper: createWrapper() }
      )

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true)
        },
        { timeout: 10000 }
      )

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  describe('useGitHubReleases', () => {
    it('릴리즈 목록을 조회해야 함', async () => {
      const mockReleases = [
        {
          version: 'v1.0.0',
          name: 'Release 1.0.0',
          publishedAt: '2024-01-01',
          htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.0.0',
          body: 'Release notes',
        },
        {
          version: 'v0.9.0',
          name: 'Release 0.9.0',
          publishedAt: '2023-12-01',
          htmlUrl: 'https://github.com/owner/repo/releases/tag/v0.9.0',
          body: 'Release notes',
        },
      ]

      vi.mocked(githubApi.parseGitHubUrl).mockReturnValue({
        owner: 'owner',
        repo: 'repo',
      })
      vi.mocked(githubApi.getReleases).mockResolvedValue(mockReleases)

      const { result } = renderHook(
        () => useGitHubReleases('https://github.com/owner/repo', 10),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockReleases)
      expect(githubApi.getReleases).toHaveBeenCalledWith('owner', 'repo', 10)
    })

    it('limit 파라미터의 기본값은 10이어야 함', async () => {
      vi.mocked(githubApi.parseGitHubUrl).mockReturnValue({
        owner: 'owner',
        repo: 'repo',
      })
      vi.mocked(githubApi.getReleases).mockResolvedValue([])

      const { result } = renderHook(
        () => useGitHubReleases('https://github.com/owner/repo'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(githubApi.getReleases).toHaveBeenCalledWith('owner', 'repo', 10)
    })

    it('null URL은 빈 배열을 반환해야 함', async () => {
      const { result } = renderHook(() => useGitHubReleases(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(false)
      })
    })

    it('잘못된 URL은 빈 배열을 반환해야 함', async () => {
      vi.mocked(githubApi.parseGitHubUrl).mockReturnValue(null)

      const { result } = renderHook(
        () => useGitHubReleases('https://invalid-url.com'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('useGitHubLatestRelease', () => {
    it('최신 릴리즈를 조회해야 함', async () => {
      const mockRelease = {
        version: 'v2.0.0',
        name: 'Latest Release',
        publishedAt: '2024-01-15',
        htmlUrl: 'https://github.com/owner/repo/releases/tag/v2.0.0',
        body: 'Latest release notes',
      }

      vi.mocked(githubApi.parseGitHubUrl).mockReturnValue({
        owner: 'owner',
        repo: 'repo',
      })
      vi.mocked(githubApi.getLatestRelease).mockResolvedValue(mockRelease)

      const { result } = renderHook(
        () => useGitHubLatestRelease('https://github.com/owner/repo'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockRelease)
      expect(githubApi.getLatestRelease).toHaveBeenCalledWith('owner', 'repo')
    })

    it('null URL은 null을 반환해야 함', async () => {
      const { result } = renderHook(() => useGitHubLatestRelease(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(false)
      })
    })

    it('릴리즈가 없으면 null을 반환해야 함', async () => {
      vi.mocked(githubApi.parseGitHubUrl).mockReturnValue({
        owner: 'owner',
        repo: 'repo',
      })
      vi.mocked(githubApi.getLatestRelease).mockResolvedValue(null)

      const { result } = renderHook(
        () => useGitHubLatestRelease('https://github.com/owner/repo'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()
    })
  })

  describe('formatGitHubStatsSummary', () => {
    it('통계 요약을 올바르게 포맷해야 함', () => {
      const stats = {
        stars: 1234,
        forks: 567,
        contributors: 42,
        openIssues: 10,
        watchers: 200,
        description: 'Test',
        language: 'TypeScript',
      }

      const summary = formatGitHubStatsSummary(stats)

      expect(summary).toContain('⭐ 1.2K')
      expect(summary).toContain('🍴 567')
      expect(summary).toContain('👥 42')
    })

    it('큰 숫자를 K 단위로 포맷해야 함', () => {
      const stats = {
        stars: 5500,
        forks: 1200,
        contributors: 50,
        openIssues: 0,
        watchers: 0,
        description: '',
        language: '',
      }

      const summary = formatGitHubStatsSummary(stats)

      expect(summary).toContain('5.5K')
      expect(summary).toContain('1.2K')
    })

    it('매우 큰 숫자를 M 단위로 포맷해야 함', () => {
      const stats = {
        stars: 2500000,
        forks: 1000000,
        contributors: 100,
        openIssues: 0,
        watchers: 0,
        description: '',
        language: '',
      }

      const summary = formatGitHubStatsSummary(stats)

      expect(summary).toContain('2.5M')
      expect(summary).toContain('1.0M')
    })

    it('0인 값은 제외해야 함', () => {
      const stats = {
        stars: 100,
        forks: 0,
        contributors: 0,
        openIssues: 0,
        watchers: 0,
        description: '',
        language: '',
      }

      const summary = formatGitHubStatsSummary(stats)

      expect(summary).toContain('⭐ 100')
      expect(summary).not.toContain('🍴')
      expect(summary).not.toContain('👥')
    })

    it('null 통계는 빈 문자열을 반환해야 함', () => {
      expect(formatGitHubStatsSummary(null)).toBe('')
    })

    it('undefined 통계는 빈 문자열을 반환해야 함', () => {
      expect(formatGitHubStatsSummary(undefined)).toBe('')
    })

    it('모든 값이 0이면 빈 문자열을 반환해야 함', () => {
      const stats = {
        stars: 0,
        forks: 0,
        contributors: 0,
        openIssues: 0,
        watchers: 0,
        description: '',
        language: '',
      }

      expect(formatGitHubStatsSummary(stats)).toBe('')
    })
  })
})
