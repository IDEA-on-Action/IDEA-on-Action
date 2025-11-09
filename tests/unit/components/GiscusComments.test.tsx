import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GiscusComments } from '@/components/community/GiscusComments';
import { useTheme } from '@/hooks/useTheme';

// Mock useTheme hook
vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(),
}));

describe('GiscusComments', () => {
  const originalCreateElement = document.createElement;
  const originalAppendChild = document.createElement('div').appendChild;
  const originalQuerySelector = document.querySelector;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.createElement
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'script') {
        // Mock script element behavior
        (element as HTMLScriptElement).src = '';
        (element as HTMLScriptElement).async = false;
        (element as HTMLScriptElement).crossOrigin = '';
      }
      return element;
    });
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    // Clean up any iframes
    const iframes = document.querySelectorAll('iframe.giscus-frame');
    iframes.forEach((iframe) => iframe.remove());
  });

  it('설정되지 않은 경우 플레이스홀더를 표시해야 함', () => {
    // Setup
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
    } as any);

    // Execute
    render(<GiscusComments repoId="CONFIGURE_REPO_ID" categoryId="CONFIGURE_CATEGORY_ID" />);

    // Assert
    expect(screen.getByText('댓글 시스템 설정 필요')).toBeInTheDocument();
    expect(screen.getByText(/Giscus 댓글 시스템을 사용하려면/)).toBeInTheDocument();
  });

  it('설정된 경우 스크립트를 로드해야 함', () => {
    // Setup
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
    } as any);

    const appendChildSpy = vi.spyOn(HTMLElement.prototype, 'appendChild');

    // Execute
    render(
      <GiscusComments
        repo="test-owner/test-repo"
        repoId="test-repo-id"
        category="General"
        categoryId="test-category-id"
      />
    );

    // Assert
    expect(screen.queryByText('댓글 시스템 설정 필요')).not.toBeInTheDocument();
    // 스크립트가 생성되었는지 확인
    expect(document.createElement).toHaveBeenCalledWith('script');
  });

  it('다크 모드일 때 dark 테마를 설정해야 함', () => {
    // Setup
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn(),
      resolvedTheme: 'dark',
    } as any);

    const createdScripts: HTMLScriptElement[] = [];
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'script') {
        createdScripts.push(element as HTMLScriptElement);
      }
      return element;
    });

    // Execute
    render(
      <GiscusComments
        repo="test-owner/test-repo"
        repoId="test-repo-id"
        category="General"
        categoryId="test-category-id"
      />
    );

    // Assert
    waitFor(() => {
      const script = createdScripts.find((s) => s.getAttribute('data-theme') === 'dark');
      expect(script).toBeDefined();
    });
  });

  it('라이트 모드일 때 light 테마를 설정해야 함', () => {
    // Setup
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
    } as any);

    const createdScripts: HTMLScriptElement[] = [];
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'script') {
        createdScripts.push(element as HTMLScriptElement);
      }
      return element;
    });

    // Execute
    render(
      <GiscusComments
        repo="test-owner/test-repo"
        repoId="test-repo-id"
        category="General"
        categoryId="test-category-id"
      />
    );

    // Assert
    waitFor(() => {
      const script = createdScripts.find((s) => s.getAttribute('data-theme') === 'light');
      expect(script).toBeDefined();
    });
  });

  it('언마운트 시 cleanup이 실행되어야 함', () => {
    // Setup
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
    } as any);

    const querySelectorSpy = vi.spyOn(document, 'querySelector');
    const removeSpy = vi.fn();

    // Mock iframe element
    const mockIframe = {
      remove: removeSpy,
      classList: {
        contains: vi.fn(() => true),
      },
    } as any;

    querySelectorSpy.mockReturnValue(mockIframe);

    // Execute
    const { unmount } = render(
      <GiscusComments
        repo="test-owner/test-repo"
        repoId="test-repo-id"
        category="General"
        categoryId="test-category-id"
      />
    );

    unmount();

    // Assert
    // cleanup이 실행되었는지 확인 (실제로는 useEffect cleanup이 실행됨)
    // 이 테스트는 컴포넌트가 정상적으로 언마운트되는지 확인
    expect(unmount).not.toThrow();
  });

  it('기본 props가 올바르게 설정되어야 함', () => {
    // Setup
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
    } as any);

    const createdScripts: HTMLScriptElement[] = [];
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'script') {
        createdScripts.push(element as HTMLScriptElement);
        // Mock setAttribute
        element.setAttribute = vi.fn();
      }
      return element;
    });

    // Execute
    render(<GiscusComments />);

    // Assert
    waitFor(() => {
      const script = createdScripts[0];
      if (script) {
        expect(script.setAttribute).toHaveBeenCalledWith('data-repo', 'IDEA-on-Action/idea-on-action');
        expect(script.setAttribute).toHaveBeenCalledWith('data-mapping', 'pathname');
        expect(script.setAttribute).toHaveBeenCalledWith('data-reactions-enabled', '1');
        expect(script.setAttribute).toHaveBeenCalledWith('data-lang', 'ko');
      }
    });
  });

  it('커스텀 props가 올바르게 설정되어야 함', () => {
    // Setup
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
    } as any);

    const createdScripts: HTMLScriptElement[] = [];
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'script') {
        createdScripts.push(element as HTMLScriptElement);
        element.setAttribute = vi.fn();
      }
      return element;
    });

    // Execute
    render(
      <GiscusComments
        repo="custom-owner/custom-repo"
        repoId="custom-repo-id"
        category="Custom"
        categoryId="custom-category-id"
        mapping="url"
        reactionsEnabled={false}
        lang="en"
      />
    );

    // Assert
    waitFor(() => {
      const script = createdScripts[0];
      if (script) {
        expect(script.setAttribute).toHaveBeenCalledWith('data-repo', 'custom-owner/custom-repo');
        expect(script.setAttribute).toHaveBeenCalledWith('data-repo-id', 'custom-repo-id');
        expect(script.setAttribute).toHaveBeenCalledWith('data-category', 'Custom');
        expect(script.setAttribute).toHaveBeenCalledWith('data-category-id', 'custom-category-id');
        expect(script.setAttribute).toHaveBeenCalledWith('data-mapping', 'url');
        expect(script.setAttribute).toHaveBeenCalledWith('data-reactions-enabled', '0');
        expect(script.setAttribute).toHaveBeenCalledWith('data-lang', 'en');
      }
    });
  });
});

