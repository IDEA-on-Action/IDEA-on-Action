import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCRUD, type BaseEntity } from '@/hooks/useCRUD'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import React from 'react'

// Workers API 클라이언트 모킹
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}))

// useAuth 모킹
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    workersTokens: { accessToken: 'mock-token' },
  }),
}))

// Toast 모킹
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

// 테스트용 엔티티 타입
interface TestEntity extends BaseEntity {
  name: string
  value: number
}

describe('useCRUD', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('useList', () => {
    it('데이터 목록을 조회해야 함', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', value: 10, created_at: '2024-01-01' },
        { id: '2', name: 'Item 2', value: 20, created_at: '2024-01-02' },
      ]

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { data: mockData, count: 2 },
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useList()
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

      expect(result.current.data).toEqual({
        data: mockData,
        count: 2,
        page: 1,
        perPage: 20,
        totalPages: 1,
      })
    })

    it('필터를 적용하여 조회해야 함', async () => {
      const mockData = [{ id: '1', name: 'Filtered', value: 10, created_at: '2024-01-01' }]

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { data: mockData, count: 1 },
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useList({ filters: { name: 'Filtered' } })
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Workers API 호출 시 필터가 URL 파라미터로 전달되는지 확인
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('name=Filtered'),
        expect.objectContaining({ token: 'mock-token' })
      )
    })

    it('검색 기능이 작동해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { data: [], count: 0 },
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useList({
            search: 'test',
            searchColumns: ['name', 'value'],
          })
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isFetched).toBe(true))

      // Workers API 호출 시 검색 파라미터가 전달되는지 확인
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringMatching(/search=test.*search_columns=name,value|search_columns=name,value.*search=test/),
        expect.any(Object)
      )
    })

    it('페이지네이션이 작동해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { data: [], count: 100 },
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useList({ page: 2, perPage: 10 })
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isFetched).toBe(true))

      // Workers API 호출 시 페이지네이션 파라미터가 전달되는지 확인
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringMatching(/page=2.*per_page=10|per_page=10.*page=2/),
        expect.any(Object)
      )
    })

    it('에러 발생 시 null을 반환해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useList()
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isFetched).toBe(true), { timeout: 3000 })

      // 에러 발생 시 null 반환
      expect(result.current.data).toBeNull()
    })
  })

  describe('useGet', () => {
    it('ID로 단일 항목을 조회해야 함', async () => {
      const mockItem = { id: '1', name: 'Test Item', value: 100, created_at: '2024-01-01' }

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockItem,
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useGet('1')
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockItem)
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/test-table/1',
        expect.objectContaining({ token: 'mock-token' })
      )
    })

    it('ID가 없으면 쿼리가 비활성화되어야 함', () => {
      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useGet('')
        },
        { wrapper }
      )

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('Not Found 에러는 토스트를 표시하지 않아야 함', async () => {
      const { toast } = await import('sonner')

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Item not found',
        status: 404,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useGet('999')
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isFetched).toBe(true))

      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('useCreate', () => {
    it('새 항목을 생성해야 함', async () => {
      const newItem = { name: 'New Item', value: 50 }
      const createdItem = { id: '3', ...newItem, created_at: '2024-01-03' }

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: createdItem,
        error: null,
        status: 201,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useCreate()
        },
        { wrapper }
      )

      const mutationResult = await result.current.mutateAsync(newItem)

      expect(mutationResult).toEqual(createdItem)
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/test-table',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-token',
          body: newItem,
        })
      )
    })

    it('생성 성공 시 캐시를 무효화해야 함', async () => {
      const createdItem = { id: '3', name: 'New', value: 50, created_at: '2024-01-03' }

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: createdItem,
        error: null,
        status: 201,
      })

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useCreate()
        },
        { wrapper }
      )

      await result.current.mutateAsync({ name: 'New', value: 50 })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['test', 'list'],
      })
    })
  })

  describe('useUpdate', () => {
    it('항목을 수정해야 함', async () => {
      const updatedItem = { id: '1', name: 'Updated', value: 999, created_at: '2024-01-01' }

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: updatedItem,
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useUpdate()
        },
        { wrapper }
      )

      const mutationResult = await result.current.mutateAsync({
        id: '1',
        values: { name: 'Updated', value: 999 },
      })

      expect(mutationResult).toEqual(updatedItem)
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/test-table/1',
        expect.objectContaining({
          method: 'PATCH',
          token: 'mock-token',
          body: { name: 'Updated', value: 999 },
        })
      )
    })

    it('낙관적 업데이트가 작동해야 함', async () => {
      const originalItem = { id: '1', name: 'Original', value: 100, created_at: '2024-01-01' }

      // 캐시에 원본 항목 설정
      queryClient.setQueryData(['test', 'detail', '1'], originalItem)

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { ...originalItem, name: 'Updated' },
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useUpdate()
        },
        { wrapper }
      )

      result.current.mutate({
        id: '1',
        values: { name: 'Updated' },
      })

      // 뮤테이션 완료 대기
      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

      // 낙관적 업데이트 확인
      const cachedData = queryClient.getQueryData<TestEntity>(['test', 'detail', '1'])
      expect(cachedData?.name).toBe('Updated')
    })
  })

  describe('useDelete', () => {
    it('항목을 삭제해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: null,
        status: 204,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useDelete()
        },
        { wrapper }
      )

      const mutationResult = await result.current.mutateAsync('1')

      expect(mutationResult).toBe('1')
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/test-table/1',
        expect.objectContaining({
          method: 'DELETE',
          token: 'mock-token',
        })
      )
    })

    it('삭제 성공 시 캐시에서 제거해야 함', async () => {
      const item = { id: '1', name: 'To Delete', value: 100, created_at: '2024-01-01' }

      // 캐시에 항목 설정
      queryClient.setQueryData(['test', 'detail', '1'], item)

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: null,
        status: 204,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useDelete()
        },
        { wrapper }
      )

      await result.current.mutateAsync('1')

      await waitFor(() => {
        const cachedData = queryClient.getQueryData(['test', 'detail', '1'])
        expect(cachedData).toBeUndefined()
      })
    })
  })

  describe('useBulkDelete', () => {
    it('여러 항목을 일괄 삭제해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: null,
        status: 204,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useBulkDelete()
        },
        { wrapper }
      )

      const ids = ['1', '2', '3']
      const mutationResult = await result.current.mutateAsync(ids)

      expect(mutationResult).toEqual(ids)
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/test-table/bulk-delete',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-token',
          body: { ids },
        })
      )
    })
  })

  describe('useBulkUpdate', () => {
    it('여러 항목을 일괄 수정해야 함', async () => {
      const updatedItems = [
        { id: '1', name: 'Updated', value: 999, created_at: '2024-01-01' },
        { id: '2', name: 'Updated', value: 999, created_at: '2024-01-02' },
      ]

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: updatedItems,
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useBulkUpdate()
        },
        { wrapper }
      )

      const mutationResult = await result.current.mutateAsync({
        ids: ['1', '2'],
        data: { name: 'Updated', value: 999 },
      })

      expect(mutationResult).toEqual(updatedItems)
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/test-table/bulk-update',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-token',
          body: { ids: ['1', '2'], data: { name: 'Updated', value: 999 } },
        })
      )
    })
  })

  describe('useCount', () => {
    it('레코드 수를 조회해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { count: 42 },
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useCount()
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBe(42)
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test-table/count'),
        expect.objectContaining({ token: 'mock-token' })
      )
    })

    it('필터를 적용하여 카운트해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { count: 10 },
        error: null,
        status: 200,
      })

      const { result } = renderHook(
        () => {
          const crud = useCRUD<TestEntity>({
            table: 'test_table',
            queryKey: 'test',
          })
          return crud.useCount({ status: 'active' })
        },
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      )
    })
  })
})
