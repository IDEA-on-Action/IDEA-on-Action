/**
 * DataTableToolbar Component
 *
 * 테이블 툴바 컴포넌트
 * - 전역 검색 입력창
 * - 필터 버튼 (선택적)
 * - 컬럼 표시/숨김 뷰 옵션
 */

import { Table } from '@tanstack/react-table'
import { X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DataTableViewOptions } from './DataTableViewOptions'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  globalFilter: string
  setGlobalFilter: (value: string) => void
  searchPlaceholder?: string
  enableColumnVisibility?: boolean
}

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  searchPlaceholder = '검색...',
  enableColumnVisibility = true,
}: DataTableToolbarProps<TData>) {
  const isFiltered = globalFilter.length > 0

  return (
    <div className="flex items-center justify-between">
      {/* Search input */}
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10"
          />
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => setGlobalFilter('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">검색 초기화</span>
            </Button>
          )}
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => setGlobalFilter('')}
            className="h-8 px-2 lg:px-3"
          >
            초기화
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* View options (column visibility) */}
      {enableColumnVisibility && <DataTableViewOptions table={table} />}
    </div>
  )
}
