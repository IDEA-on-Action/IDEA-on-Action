# DataTable 컴포넌트 가이드

TanStack Table 기반 고급 테이블 컴포넌트

## 📚 목차

1. [개요](#개요)
2. [설치 및 설정](#설치-및-설정)
3. [기본 사용법](#기본-사용법)
4. [컬럼 정의](#컬럼-정의)
5. [정렬 (Sorting)](#정렬-sorting)
6. [필터링 (Filtering)](#필터링-filtering)
7. [페이지네이션](#페이지네이션)
8. [행 선택 (Row Selection)](#행-선택-row-selection)
9. [컬럼 표시/숨김](#컬럼-표시숨김)
10. [커스텀 셀 렌더링](#커스텀-셀-렌더링)
11. [로딩 상태](#로딩-상태)
12. [빈 상태 (Empty State)](#빈-상태-empty-state)
13. [고급 예제](#고급-예제)
14. [TanStack Table vs 일반 테이블](#tanstack-table-vs-일반-테이블)
15. [API 레퍼런스](#api-레퍼런스)

---

## 개요

**DataTable**은 TanStack Table 라이브러리를 기반으로 구축된 고급 테이블 컴포넌트입니다. 정렬, 필터링, 페이지네이션, 행 선택 등의 기능을 제공하며, 재사용 가능하고 확장 가능한 구조로 설계되었습니다.

### 주요 기능

- ✅ **정렬 (Sorting)**: 오름차순/내림차순 정렬
- ✅ **필터링 (Filtering)**: 전역 검색 및 컬럼별 필터
- ✅ **페이지네이션**: 페이지 크기 선택, 페이지 이동
- ✅ **행 선택**: 체크박스를 통한 다중 행 선택
- ✅ **컬럼 표시/숨김**: 사용자 정의 컬럼 가시성
- ✅ **로딩 상태**: Skeleton UI
- ✅ **빈 상태**: 데이터 없을 때 메시지 표시
- ✅ **반응형 디자인**: 모바일/데스크톱 대응

### 컴포넌트 구조

```
src/components/data-table/
├── DataTable.tsx              # 메인 테이블 컴포넌트
├── DataTablePagination.tsx    # 페이지네이션 UI
├── DataTableToolbar.tsx       # 검색 & 필터 툴바
├── DataTableViewOptions.tsx   # 컬럼 표시/숨김 드롭다운
├── DataTableColumnHeader.tsx  # 정렬 가능한 컬럼 헤더
└── index.ts                   # Export 모음
```

---

## 설치 및 설정

### 1. TanStack Table 설치

```bash
npm install @tanstack/react-table
```

### 2. 컴포넌트 Import

```tsx
import { DataTable } from '@/components/data-table'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'
import { ColumnDef } from '@tanstack/react-table'
```

---

## 기본 사용법

### 최소 예제

```tsx
import { DataTable } from '@/components/data-table'
import { ColumnDef } from '@tanstack/react-table'

type User = {
  id: string
  name: string
  email: string
}

export default function UserList() {
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: '이름',
    },
    {
      accessorKey: 'email',
      header: '이메일',
    },
  ]

  const data: User[] = [
    { id: '1', name: '홍길동', email: 'hong@example.com' },
    { id: '2', name: '김철수', email: 'kim@example.com' },
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="사용자 검색..."
    />
  )
}
```

---

## 컬럼 정의

### 기본 컬럼

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name', // 데이터 키
    header: '이름',      // 헤더 텍스트
  },
  {
    accessorKey: 'email',
    header: '이메일',
  },
]
```

### 정렬 가능한 컬럼

```tsx
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="이름" />
    ),
  },
]
```

### 커스텀 ID 컬럼 (accessor 없음)

```tsx
const columns: ColumnDef<User>[] = [
  {
    id: 'status', // accessorKey 대신 id 사용
    header: '상태',
    cell: ({ row }) => {
      const user = row.original
      return user.isActive ? '활성' : '비활성'
    },
  },
]
```

### 숨길 수 없는 컬럼

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: '이름',
    enableHiding: false, // 컬럼 숨김 비활성화
  },
]
```

---

## 정렬 (Sorting)

### DataTableColumnHeader 사용

```tsx
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="가격" />
    ),
    cell: ({ row }) => `₩${row.getValue('price').toLocaleString()}`,
  },
]
```

### 기능

- **클릭 시 정렬 토글**: 없음 → 오름차순 → 내림차순 → 없음
- **정렬 상태 아이콘**: ArrowUp (오름차순), ArrowDown (내림차순), ArrowUpDown (기본)
- **드롭다운 메뉴**: 오름차순, 내림차순, 숨기기

### 정렬 비활성화

```tsx
const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'thumbnail',
    header: '썸네일',
    enableSorting: false, // 정렬 비활성화
  },
]
```

---

## 필터링 (Filtering)

### 전역 검색 (Global Filter)

DataTable은 기본적으로 전역 검색을 지원합니다.

```tsx
<DataTable
  columns={columns}
  data={data}
  searchPlaceholder="제목 또는 요약 검색..."
/>
```

- **검색 대상**: 모든 컬럼의 텍스트 값
- **검색 로직**: 부분 일치 (대소문자 무시)
- **초기화 버튼**: 검색어 입력 시 자동 표시

### 컬럼별 필터

```tsx
const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'category',
    header: '카테고리',
    filterFn: (row, id, filterValue) => {
      return row.getValue(id) === filterValue
    },
  },
]
```

---

## 페이지네이션

### 기본 설정

```tsx
<DataTable
  columns={columns}
  data={data}
  pageSize={20} // 페이지당 행 개수 (기본값: 10)
/>
```

### 페이지 크기 선택

사용자는 페이지 하단에서 10, 20, 30, 40, 50 중 선택 가능합니다.

### 페이지 이동 버튼

- **첫 페이지**: ChevronsLeft (데스크톱만)
- **이전 페이지**: ChevronLeft
- **다음 페이지**: ChevronRight
- **마지막 페이지**: ChevronsRight (데스크톱만)

---

## 행 선택 (Row Selection)

### 활성화

```tsx
<DataTable
  columns={columns}
  data={data}
  enableRowSelection
  onSelectedRowsChange={(rows) => {
    console.log('선택된 행:', rows)
  }}
/>
```

### 선택 컬럼 추가

```tsx
import { Checkbox } from '@/components/ui/checkbox'

const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="모두 선택"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="행 선택"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  // ... 기타 컬럼
]
```

### 선택된 행 개수 표시

페이지네이션 영역에 자동으로 표시됩니다:

```
3개 행 선택됨 / 50개 중
```

---

## 컬럼 표시/숨김

### 기본 활성화

```tsx
<DataTable
  columns={columns}
  data={data}
  enableColumnVisibility // 기본값: true
/>
```

### 비활성화

```tsx
<DataTable
  columns={columns}
  data={data}
  enableColumnVisibility={false}
/>
```

### 특정 컬럼 숨김 비활성화

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: '이름',
    enableHiding: false, // 이 컬럼은 숨길 수 없음
  },
]
```

---

## 커스텀 셀 렌더링

### 이미지 셀

```tsx
const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'thumbnail',
    header: '썸네일',
    cell: ({ row }) => {
      const thumbnail = row.getValue('thumbnail') as string
      return thumbnail ? (
        <img
          src={thumbnail}
          alt={row.original.title}
          className="w-16 h-16 object-cover rounded"
        />
      ) : (
        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs">
          No Image
        </div>
      )
    },
  },
]
```

### 배지 셀

```tsx
import { Badge } from '@/components/ui/badge'

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'category',
    header: '카테고리',
    cell: ({ row }) => {
      const category = row.getValue('category') as string
      return <Badge variant="outline">{category}</Badge>
    },
  },
]
```

### 스위치 셀

```tsx
import { Switch } from '@/components/ui/switch'

const columns: ColumnDef<Product>[] = [
  {
    id: 'published',
    header: '공개',
    cell: ({ row }) => (
      <Switch
        checked={row.original.published}
        onCheckedChange={() => handleToggle(row.original)}
      />
    ),
  },
]
```

### 액션 셀

```tsx
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

const columns: ColumnDef<Product>[] = [
  {
    id: 'actions',
    header: '작업',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleEdit(row.original)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDelete(row.original)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ),
  },
]
```

---

## 로딩 상태

### 활성화

```tsx
const { data, isLoading } = useQuery(...)

<DataTable
  columns={columns}
  data={data || []}
  loading={isLoading}
/>
```

### Skeleton UI

로딩 중일 때 `pageSize` 개수만큼 Skeleton 행을 표시합니다.

```tsx
{loading ? (
  Array.from({ length: pageSize }).map((_, i) => (
    <TableRow key={`skeleton-${i}`}>
      {columns.map((_, j) => (
        <TableCell key={`skeleton-${i}-${j}`}>
          <Skeleton className="h-6 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
) : (
  // ... 실제 데이터
)}
```

---

## 빈 상태 (Empty State)

### 기본 메시지

데이터가 없을 때 자동으로 표시됩니다.

```tsx
{table.getRowModel().rows?.length === 0 && (
  <TableRow>
    <TableCell colSpan={columns.length} className="h-24 text-center">
      <div className="flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">검색 결과가 없습니다</p>
        {globalFilter && (
          <Button
            variant="link"
            onClick={() => setGlobalFilter('')}
            className="mt-2 text-xs"
          >
            필터 초기화
          </Button>
        )}
      </div>
    </TableCell>
  </TableRow>
)}
```

---

## 고급 예제

### 완전한 예제 (AdminPortfolio)

```tsx
import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

export default function AdminPortfolio() {
  const { data, isLoading } = usePortfolioItems()

  const columns = useMemo<ColumnDef<PortfolioItem>[]>(
    () => [
      {
        accessorKey: 'thumbnail',
        header: '썸네일',
        cell: ({ row }) => {
          const thumbnail = row.getValue('thumbnail') as string
          return thumbnail ? (
            <img src={thumbnail} alt="" className="w-16 h-16 rounded" />
          ) : (
            <div className="w-16 h-16 bg-muted rounded" />
          )
        },
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="제목" />
        ),
      },
      {
        accessorKey: 'projectType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="타입" />
        ),
        cell: ({ row }) => {
          const type = row.getValue('projectType') as string
          return <Badge>{type}</Badge>
        },
      },
      {
        id: 'published',
        header: '공개',
        cell: ({ row }) => (
          <Switch
            checked={row.original.published}
            onCheckedChange={() => handleToggle(row.original)}
          />
        ),
      },
      {
        id: 'actions',
        header: '작업',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={data || []}
      loading={isLoading}
      searchPlaceholder="제목 또는 요약 검색..."
      pageSize={10}
      enableColumnVisibility
      enableRowSelection
      onSelectedRowsChange={(rows) => console.log('선택됨:', rows)}
      onRowClick={(row) => handleEdit(row)}
    />
  )
}
```

---

## TanStack Table vs 일반 테이블

### 일반 테이블 (shadcn/ui)

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>이름</TableHead>
      <TableHead>이메일</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**장점**:
- 간단한 구조
- 빠른 구현

**단점**:
- ❌ 정렬 기능 없음
- ❌ 필터링 기능 없음
- ❌ 페이지네이션 기능 없음
- ❌ 행 선택 기능 없음
- ❌ 확장성 낮음

### DataTable (TanStack Table 기반)

```tsx
<DataTable
  columns={columns}
  data={data}
  searchPlaceholder="검색..."
  pageSize={10}
  enableColumnVisibility
  enableRowSelection
/>
```

**장점**:
- ✅ 정렬, 필터링, 페이지네이션 기본 제공
- ✅ 행 선택 기능
- ✅ 컬럼 표시/숨김
- ✅ 로딩/빈 상태 UI
- ✅ 재사용 가능
- ✅ 확장성 높음

**단점**:
- 초기 설정이 복잡함 (컬럼 정의 필요)
- TanStack Table 라이브러리 의존성

### 선택 기준

| 조건 | 권장 |
|------|------|
| 5개 미만의 행 | 일반 테이블 |
| 정적 데이터 (정렬/필터 불필요) | 일반 테이블 |
| 대량 데이터 (50개 이상) | **DataTable** |
| 정렬/필터링 필요 | **DataTable** |
| 행 선택 필요 | **DataTable** |
| 관리자 페이지 (CRUD) | **DataTable** |

---

## API 레퍼런스

### DataTable Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData>[]` | *required* | 컬럼 정의 배열 |
| `data` | `TData[]` | *required* | 테이블 데이터 |
| `loading` | `boolean` | `false` | 로딩 상태 |
| `onRowClick` | `(row: TData) => void` | `undefined` | 행 클릭 핸들러 |
| `pageSize` | `number` | `10` | 페이지당 행 개수 |
| `searchPlaceholder` | `string` | `'검색...'` | 검색창 placeholder |
| `enableColumnVisibility` | `boolean` | `true` | 컬럼 표시/숨김 활성화 |
| `enableRowSelection` | `boolean` | `false` | 행 선택 활성화 |
| `onSelectedRowsChange` | `(rows: TData[]) => void` | `undefined` | 선택 행 변경 핸들러 |

### ColumnDef 주요 속성

| 속성 | Type | Description |
|------|------|-------------|
| `accessorKey` | `string` | 데이터 키 (예: 'name') |
| `id` | `string` | 고유 ID (accessor 없을 때 사용) |
| `header` | `string \| Component` | 헤더 텍스트 또는 컴포넌트 |
| `cell` | `Component` | 셀 렌더링 컴포넌트 |
| `enableSorting` | `boolean` | 정렬 활성화 (기본: `true`) |
| `enableHiding` | `boolean` | 숨김 활성화 (기본: `true`) |
| `enableColumnFilter` | `boolean` | 필터 활성화 (기본: `true`) |

### DataTableColumnHeader Props

| Prop | Type | Description |
|------|------|-------------|
| `column` | `Column<TData>` | TanStack Table Column 객체 |
| `title` | `string` | 헤더 텍스트 |
| `className` | `string` | 추가 CSS 클래스 |

---

## 마무리

DataTable은 TanStack Table의 강력한 기능을 재사용 가능한 컴포넌트로 추상화한 것입니다. 관리자 페이지나 대량 데이터 표시에 적합하며, 정렬, 필터링, 페이지네이션 등의 기능을 쉽게 추가할 수 있습니다.

### 관련 문서

- [TanStack Table 공식 문서](https://tanstack.com/table/latest)
- [shadcn/ui Table](https://ui.shadcn.com/docs/components/table)
- [디자인 시스템 가이드](../README.md)

---

**작성일**: 2025-11-19
**버전**: 1.0.0
**작성자**: Claude (AI Assistant)
