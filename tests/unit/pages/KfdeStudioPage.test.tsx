import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import KfdeStudioPage from '@/pages/services-platform/KfdeStudioPage';
import { kfdeStudioCopy as copy } from '@/data/products/kfde-studio';
import { readFeatures } from '@/config/features';

const featureState = vi.hoisted(() => ({ kfdeStudio: true, productInquiry: false }));

vi.mock('@/config/features', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/features')>()),
  features: featureState,
}));

vi.mock('@/components/layouts/PageLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shared/SEO', () => ({
  SEO: () => null,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <KfdeStudioPage />
    </MemoryRouter>
  );

describe('KfdeStudioPage', () => {
  beforeEach(() => {
    featureState.productInquiry = false;
  });

  it('머리 구역에 제품명, 한 줄 소개, 현재 단계를 보여 준다', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'K-FDE Studio' })).toBeInTheDocument();
    expect(
      screen.getByText(
        '업무 개념을 온톨로지로 정의하고, AI 에이전트가 그 정의 위에서 조치를 제안하며 사람이 승인하도록 만드는 온톨로지 기반 AI 에이전트 플랫폼입니다.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('현재 단계: 개발 중 (Incubation)')).toBeInTheDocument();
  });

  it('공개 문구판의 구역 제목을 순서대로 보여 준다', () => {
    renderPage();

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      '한눈에 보기',
      '무엇이 달라집니까',
      '화면 다섯 영역과 기반 기능',
      '검증 결과와 연동',
      '로드맵',
      '도입 문의',
    ]);
  });

  it('흐름 네 단계와 실행 모드 세 가지를 보여 준다', () => {
    renderPage();

    copy.flow.steps.forEach((step) => {
      expect(screen.getAllByText(step.title).length).toBeGreaterThan(0);
    });
    ['바로 실행', '제안만', '사람만'].forEach((mode) => {
      expect(screen.getByText(mode)).toBeInTheDocument();
    });
  });

  it('고민과 답 표 6행, 영역 카드 6장을 보여 준다', () => {
    renderPage();

    copy.changes.rows.forEach(([concern]) => {
      expect(screen.getByRole('rowheader', { name: concern })).toBeInTheDocument();
    });
    copy.areas.items.forEach((area) => {
      expect(screen.getByText(area.description)).toBeInTheDocument();
    });
  });

  it('로드맵은 Now, Next, Later 만 쓰고 표 바로 아래에 면책 문구를 둔다', () => {
    renderPage();

    const table = screen.getByRole('table', { name: '로드맵' });
    const stages = Array.from(table.querySelectorAll('tbody th')).map((th) => th.textContent);
    expect(stages).toEqual(['Now', 'Next', 'Later', 'Later']);

    const disclaimer = screen.getByText('이 로드맵은 약속이 아니며 구매 결정의 근거로 쓰지 않습니다.');
    expect(table.parentElement?.nextElementSibling).toBe(disclaimer);
  });

  it('가격은 싣지 않고 별도 문의로 안내한다', () => {
    const { container } = renderPage();

    expect(screen.getByText(/별도 문의로 안내합니다/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/₩|원\/월|만원/);
  });

  it('문의 양식 공개 설정이 꺼져 있으면 도입 문의 버튼을 보여 주지 않는다', () => {
    renderPage();

    expect(screen.queryByRole('link', { name: /도입 문의/ })).not.toBeInTheDocument();
  });

  it('문의 양식 공개 설정이 켜져 있으면 도입 문의 버튼 두 개가 문의 양식으로 연결된다', () => {
    featureState.productInquiry = true;
    renderPage();

    const links = screen.getAllByRole('link', { name: /도입 문의/ });
    expect(links).toHaveLength(2);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/connect/inquiry?product=kfde-studio');
    });
  });

  it('화면 문구에 긴 줄표가 없다', () => {
    const { container } = renderPage();

    expect(container.textContent).not.toMatch(/[—―]/);
  });
});

describe('readFeatures', () => {
  it("값이 정확히 'true' 일 때만 켜진다", () => {
    expect(readFeatures({})).toEqual({ kfdeStudio: false, productInquiry: false });
    expect(readFeatures({ VITE_FEATURE_KFDE_STUDIO: 'false', VITE_FEATURE_PRODUCT_INQUIRY: '1' })).toEqual({
      kfdeStudio: false,
      productInquiry: false,
    });
    expect(readFeatures({ VITE_FEATURE_KFDE_STUDIO: 'true', VITE_FEATURE_PRODUCT_INQUIRY: 'true' })).toEqual({
      kfdeStudio: true,
      productInquiry: true,
    });
  });
});
