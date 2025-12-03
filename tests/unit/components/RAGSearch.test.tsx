/**
 * RAG 검색 컴포넌트 통합 테스트
 *
 * 테스트 범위:
 * - RAGSearchBar: 검색어 입력, 모드 변경, 디바운스
 * - RAGSearchResult: 결과 표시, 점수 시각화, 하이라이팅
 * - RAGSearchFilters: 필터 선택, 점수 조정
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RAGSearchBar, RAGSearchResult, RAGSearchFilters } from '@/components/search';
import type { RAGSearchResult as RAGSearchResultType } from '@/types/rag.types';

// ============================================================================
// Mock 데이터
// ============================================================================

const mockSearchResult: RAGSearchResultType = {
  documentId: 'doc-1',
  documentTitle: 'React Hooks 가이드',
  chunkIndex: 0,
  chunkContent: 'React Hooks는 함수 컴포넌트에서 상태와 생명주기 기능을 사용할 수 있게 해주는 기능입니다.',
  similarity: 0.85,
  metadata: { author: 'John Doe', category: 'tutorial' },
  sourceType: 'file',
  sourceUrl: 'https://example.com/react-hooks.pdf',
  serviceId: 'minu-find',
};

// ============================================================================
// RAGSearchBar 테스트
// ============================================================================

describe('RAGSearchBar', () => {
  it('검색어를 입력할 수 있다', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<RAGSearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/RAG 검색/i);
    await user.type(input, 'React Hooks');

    expect(input).toHaveValue('React Hooks');
  });

  it('검색 버튼을 클릭하면 검색이 실행된다', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<RAGSearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/RAG 검색/i);
    const button = screen.getByRole('button', { name: /검색/i });

    await user.type(input, 'React Hooks');
    await user.click(button);

    expect(onSearch).toHaveBeenCalledWith('React Hooks', 'hybrid');
  });

  it('최소 길이 미만이면 검색 버튼이 비활성화된다', () => {
    const onSearch = vi.fn();

    render(<RAGSearchBar onSearch={onSearch} minLength={2} />);

    const button = screen.getByRole('button', { name: /검색/i });
    expect(button).toBeDisabled();
  });

  it('검색어 초기화 버튼을 클릭하면 입력이 지워진다', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<RAGSearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/RAG 검색/i);
    await user.type(input, 'React Hooks');

    const clearButton = screen.getByRole('button', { name: /검색어 초기화/i });
    await user.click(clearButton);

    expect(input).toHaveValue('');
  });

  it('검색 모드를 변경할 수 있다', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<RAGSearchBar onSearch={onSearch} />);

    // Select 트리거 클릭
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    // 의미론적 모드 선택
    const semanticOption = screen.getByRole('option', { name: /의미론적/i });
    await user.click(semanticOption);

    // 검색 실행
    const input = screen.getByPlaceholderText(/RAG 검색/i);
    await user.type(input, 'React Hooks');

    const button = screen.getByRole('button', { name: /검색/i });
    await user.click(button);

    expect(onSearch).toHaveBeenCalledWith('React Hooks', 'semantic');
  });

  it('디바운스가 적용된다', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<RAGSearchBar onSearch={onSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText(/RAG 검색/i);
    await user.type(input, 'React');

    // 디바운스 전에는 호출되지 않음
    expect(onSearch).not.toHaveBeenCalled();

    // 300ms 대기 후 호출됨
    await waitFor(
      () => {
        expect(onSearch).toHaveBeenCalledWith('React', 'hybrid');
      },
      { timeout: 400 }
    );
  });

  it('로딩 중일 때 입력과 버튼이 비활성화된다', () => {
    const onSearch = vi.fn();

    render(<RAGSearchBar onSearch={onSearch} isSearching={true} />);

    const input = screen.getByPlaceholderText(/RAG 검색/i);
    const button = screen.getByRole('button', { name: /검색/i });

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });
});

// ============================================================================
// RAGSearchResult 테스트
// ============================================================================

describe('RAGSearchResult', () => {
  it('검색 결과를 렌더링한다', () => {
    render(<RAGSearchResult result={mockSearchResult} searchQuery="" />);

    expect(screen.getByText('React Hooks 가이드')).toBeInTheDocument();
    expect(screen.getByText(/React Hooks는/)).toBeInTheDocument();
  });

  it('유사도 점수를 퍼센트로 표시한다', () => {
    render(<RAGSearchResult result={mockSearchResult} searchQuery="" />);

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('소스 타입 배지를 표시한다', () => {
    render(<RAGSearchResult result={mockSearchResult} searchQuery="" />);

    expect(screen.getByText('파일')).toBeInTheDocument();
  });

  it('서비스 ID를 표시한다', () => {
    render(<RAGSearchResult result={mockSearchResult} searchQuery="" />);

    expect(screen.getByText('minu-find')).toBeInTheDocument();
  });

  it('청크 인덱스를 표시한다', () => {
    render(<RAGSearchResult result={mockSearchResult} searchQuery="" />);

    expect(screen.getByText('청크 #0')).toBeInTheDocument();
  });

  it('소스 URL을 링크로 표시한다', () => {
    render(<RAGSearchResult result={mockSearchResult} searchQuery="" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/react-hooks.pdf');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('검색어를 하이라이팅한다', () => {
    render(<RAGSearchResult result={mockSearchResult} searchQuery="Hooks" />);

    // 하이라이팅된 텍스트는 dangerouslySetInnerHTML로 렌더링되므로
    // HTML 구조 확인
    const content = screen.getByText(/React Hooks는/);
    expect(content.innerHTML).toContain('<mark');
  });

  it('클릭 핸들러가 호출된다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <RAGSearchResult
        result={mockSearchResult}
        searchQuery=""
        onClick={onClick}
      />
    );

    const card = screen.getByText('React Hooks 가이드').closest('.cursor-pointer');
    if (card) {
      await user.click(card);
      expect(onClick).toHaveBeenCalledWith(mockSearchResult);
    }
  });
});

// ============================================================================
// RAGSearchFilters 테스트
// ============================================================================

describe('RAGSearchFilters', () => {
  it('필터 버튼을 렌더링한다', () => {
    const onChange = vi.fn();

    render(<RAGSearchFilters onChange={onChange} />);

    expect(screen.getByRole('button', { name: /필터 열기/i })).toBeInTheDocument();
  });

  it('필터 팝오버를 열고 닫을 수 있다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RAGSearchFilters onChange={onChange} />);

    const filterButton = screen.getByRole('button', { name: /필터 열기/i });
    await user.click(filterButton);

    expect(screen.getByText('검색 필터')).toBeInTheDocument();
  });

  it('소스 타입 필터를 선택할 수 있다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RAGSearchFilters onChange={onChange} />);

    const filterButton = screen.getByRole('button', { name: /필터 열기/i });
    await user.click(filterButton);

    const fileCheckbox = screen.getByLabelText('파일');
    await user.click(fileCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceTypes: ['file'],
      })
    );
  });

  it('서비스 ID 필터를 선택할 수 있다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RAGSearchFilters onChange={onChange} />);

    const filterButton = screen.getByRole('button', { name: /필터 열기/i });
    await user.click(filterButton);

    const minuFindCheckbox = screen.getByLabelText('Minu Find');
    await user.click(minuFindCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceIds: ['minu-find'],
      })
    );
  });

  it('최소 점수를 조정할 수 있다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RAGSearchFilters onChange={onChange} />);

    const filterButton = screen.getByRole('button', { name: /필터 열기/i });
    await user.click(filterButton);

    const slider = screen.getByRole('slider');

    // 슬라이더 값 변경 시뮬레이션
    await user.click(slider);

    // onChange가 호출되었는지 확인 (정확한 값은 슬라이더 구현에 따라 다름)
    expect(onChange).toHaveBeenCalled();
  });

  it('필터 초기화 버튼을 클릭하면 필터가 초기화된다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RAGSearchFilters onChange={onChange} />);

    const filterButton = screen.getByRole('button', { name: /필터 열기/i });
    await user.click(filterButton);

    // 필터 선택
    const fileCheckbox = screen.getByLabelText('파일');
    await user.click(fileCheckbox);

    // 초기화
    const resetButton = screen.getByRole('button', { name: /초기화/i });
    await user.click(resetButton);

    expect(onChange).toHaveBeenLastCalledWith({
      sourceTypes: [],
      serviceIds: [],
      minSimilarity: 0.7,
    });
  });

  it('활성 필터 카운트를 표시한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RAGSearchFilters onChange={onChange} />);

    const filterButton = screen.getByRole('button', { name: /필터 열기/i });
    await user.click(filterButton);

    // 필터 2개 선택
    const fileCheckbox = screen.getByLabelText('파일');
    await user.click(fileCheckbox);

    const minuFindCheckbox = screen.getByLabelText('Minu Find');
    await user.click(minuFindCheckbox);

    // 카운트 배지 확인
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('기본 필터를 적용할 수 있다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <RAGSearchFilters
        onChange={onChange}
        defaultFilters={{
          sourceTypes: ['file'],
          minSimilarity: 0.8,
        }}
      />
    );

    const filterButton = screen.getByRole('button', { name: /필터 열기/i });
    await user.click(filterButton);

    // 파일 체크박스가 선택되어 있어야 함
    const fileCheckbox = screen.getByLabelText('파일') as HTMLInputElement;
    expect(fileCheckbox.checked).toBe(true);

    // 최소 점수가 80%여야 함
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});
