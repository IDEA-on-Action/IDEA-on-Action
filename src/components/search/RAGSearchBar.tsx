/**
 * RAGSearchBar Component
 *
 * RAG 검색 바 컴포넌트
 * - 검색어 입력
 * - 검색 모드 토글 (키워드/하이브리드/의미론적)
 * - 디바운스 적용 (300ms)
 * - 로딩 상태 표시
 */

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 검색 모드
 */
export type RAGSearchMode = 'keyword' | 'hybrid' | 'semantic';

interface RAGSearchBarProps {
  /** 검색어 (제어 컴포넌트) */
  value?: string;
  /** 검색어 변경 핸들러 */
  onChange?: (value: string) => void;
  /** 검색 실행 핸들러 */
  onSearch: (query: string, mode: RAGSearchMode) => void;
  /** 검색 모드 (기본: hybrid) */
  defaultMode?: RAGSearchMode;
  /** 검색 중 여부 */
  isSearching?: boolean;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 디바운스 시간 (ms, 기본: 300) */
  debounceMs?: number;
  /** 최소 검색 길이 (기본: 2) */
  minLength?: number;
  /** 자동 포커스 */
  autoFocus?: boolean;
  /** 추가 클래스 */
  className?: string;
}

/**
 * RAG 검색 바 컴포넌트
 */
export function RAGSearchBar({
  value: controlledValue,
  onChange: controlledOnChange,
  onSearch,
  defaultMode = 'hybrid',
  isSearching = false,
  placeholder = 'RAG 검색 (최소 2자 이상)',
  debounceMs = 300,
  minLength = 2,
  autoFocus = false,
  className,
}: RAGSearchBarProps) {
  // 제어/비제어 컴포넌트 지원
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = controlledOnChange || setInternalValue;

  // 검색 모드
  const [mode, setMode] = useState<RAGSearchMode>(defaultMode);

  // 디바운스된 검색어
  const [debouncedQuery, setDebouncedQuery] = useState(value);

  // 검색 유효성
  const isValidQuery = value.trim().length >= minLength;

  // ============================================================================
  // 디바운스 효과
  // ============================================================================

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(value);
    }, debounceMs);

    return () => {
      clearTimeout(timerId);
    };
  }, [value, debounceMs]);

  // ============================================================================
  // 자동 검색 (디바운스 후)
  // ============================================================================

  useEffect(() => {
    if (debouncedQuery.trim().length >= minLength) {
      onSearch(debouncedQuery.trim(), mode);
    }
  }, [debouncedQuery, mode, minLength, onSearch]);

  // ============================================================================
  // 핸들러
  // ============================================================================

  /**
   * 검색어 입력 핸들러
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  /**
   * 검색 제출 핸들러
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isValidQuery) {
        onSearch(value.trim(), mode);
      }
    },
    [isValidQuery, value, mode, onSearch]
  );

  /**
   * 검색어 초기화 핸들러
   */
  const handleClear = useCallback(() => {
    setValue('');
    setDebouncedQuery('');
  }, [setValue]);

  /**
   * 검색 모드 변경 핸들러
   */
  const handleModeChange = useCallback((newMode: RAGSearchMode) => {
    setMode(newMode);
  }, []);

  // ============================================================================
  // 검색 모드 설정
  // ============================================================================

  const modeOptions = [
    {
      value: 'hybrid' as const,
      label: '하이브리드',
      description: '키워드 + 의미론적',
    },
    {
      value: 'semantic' as const,
      label: '의미론적',
      description: '벡터 검색',
    },
    {
      value: 'keyword' as const,
      label: '키워드',
      description: '전문 검색',
    },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex gap-2 w-full', className)}
    >
      {/* 검색 모드 선택 */}
      <Select
        value={mode}
        onValueChange={handleModeChange}
        disabled={isSearching}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 검색 입력 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-base"
          autoFocus={autoFocus}
          disabled={isSearching}
        />

        {/* 로딩 인디케이터 / 초기화 버튼 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClear}
                aria-label="검색어 초기화"
              >
                <X className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>

      {/* 검색 버튼 */}
      <Button
        type="submit"
        size="lg"
        className="bg-gradient-primary hover:opacity-90 px-8"
        disabled={!isValidQuery || isSearching}
      >
        검색
      </Button>
    </form>
  );
}
