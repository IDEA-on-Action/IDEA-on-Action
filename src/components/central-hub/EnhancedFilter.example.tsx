/**
 * EnhancedFilter 사용 예제
 *
 * @module components/central-hub/EnhancedFilter.example
 */

import { useState } from 'react';
import { EnhancedFilter, type EnhancedFilterValue } from './EnhancedFilter';

/**
 * EnhancedFilter 기본 사용 예제
 */
export function EnhancedFilterExample() {
  const [filterValue, setFilterValue] = useState<EnhancedFilterValue>({
    services: [],
    dateRange: {
      from: undefined,
      to: undefined,
    },
    severity: undefined,
    status: undefined,
    searchQuery: undefined,
  });

  const handleFilterChange = (newValue: EnhancedFilterValue) => {
    setFilterValue(newValue);
    console.log('필터 변경:', newValue);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="mb-4 text-2xl font-bold">EnhancedFilter 예제</h2>

      <EnhancedFilter value={filterValue} onChange={handleFilterChange} />

      {/* 필터 결과 표시 */}
      <div className="mt-8 rounded-lg border p-4">
        <h3 className="mb-2 text-lg font-semibold">현재 필터 값:</h3>
        <pre className="overflow-auto rounded bg-muted p-4 text-sm">
          {JSON.stringify(filterValue, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/**
 * EnhancedFilter 컴팩트 모드 예제
 */
export function EnhancedFilterCompactExample() {
  const [filterValue, setFilterValue] = useState<EnhancedFilterValue>({
    services: ['minu-find', 'minu-frame'],
    dateRange: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    severity: ['critical', 'high'],
    status: ['open', 'in_progress'],
    searchQuery: '테스트',
  });

  return (
    <div className="container mx-auto p-4">
      <h2 className="mb-4 text-2xl font-bold">EnhancedFilter 컴팩트 모드</h2>

      <EnhancedFilter
        value={filterValue}
        onChange={setFilterValue}
        compact={true}
      />

      <div className="mt-8 rounded-lg border p-4">
        <h3 className="mb-2 text-lg font-semibold">현재 필터 값:</h3>
        <pre className="overflow-auto rounded bg-muted p-4 text-sm">
          {JSON.stringify(filterValue, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default EnhancedFilterExample;
