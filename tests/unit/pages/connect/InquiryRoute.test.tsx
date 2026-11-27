import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Suspense } from 'react';
import InquiryRoute from '@/pages/connect/InquiryRoute';
import { isConsentNoticeReady, isProductInquiryOpen } from '@/data/products/product-inquiry';

const featureState = vi.hoisted(() => ({ kfdeStudio: true, productInquiry: false }));

vi.mock('@/config/features', () => ({ features: featureState }));

vi.mock('@/pages/WorkWithUs', () => ({
  default: () => <div>기존 협업 문의 페이지</div>,
}));

vi.mock('@/pages/connect/ProductInquiry', () => ({
  default: ({ productId }: { productId: string }) => <div>제품 문의 양식: {productId}</div>,
}));

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Suspense fallback={null}>
        <InquiryRoute />
      </Suspense>
    </MemoryRouter>
  );

describe('InquiryRoute', () => {
  beforeEach(() => {
    featureState.productInquiry = false;
  });

  it('product 값이 없으면 기존 협업 문의 페이지를 그대로 보여 준다', () => {
    featureState.productInquiry = true;
    renderAt('/connect/inquiry');

    expect(screen.getByText('기존 협업 문의 페이지')).toBeInTheDocument();
  });

  it('공개 설정이 꺼져 있으면 product 값이 있어도 기존 페이지를 보여 준다', () => {
    renderAt('/connect/inquiry?product=kfde-studio');

    expect(screen.getByText('기존 협업 문의 페이지')).toBeInTheDocument();
  });

  it('공개 설정이 켜져 있으면 제품 문의 양식을 보여 준다', async () => {
    featureState.productInquiry = true;
    renderAt('/connect/inquiry?product=kfde-studio');

    expect(await screen.findByText('제품 문의 양식: kfde-studio')).toBeInTheDocument();
  });

  it('등록되지 않은 제품이면 기존 페이지를 보여 준다', () => {
    featureState.productInquiry = true;
    renderAt('/connect/inquiry?product=unknown');

    expect(screen.getByText('기존 협업 문의 페이지')).toBeInTheDocument();
  });
});

describe('isProductInquiryOpen', () => {
  it('운영 빌드에서는 동의 안내가 확정되어야 열린다', () => {
    expect(isProductInquiryOpen({ enabled: true, consentReady: false, dev: false })).toBe(false);
    expect(isProductInquiryOpen({ enabled: true, consentReady: true, dev: false })).toBe(true);
    expect(isProductInquiryOpen({ enabled: true, consentReady: false, dev: true })).toBe(true);
    expect(isProductInquiryOpen({ enabled: false, consentReady: true, dev: true })).toBe(false);
  });

  it('처리 주체, 이용 목적, 보유 기간이 모두 있어야 동의 안내가 확정된 것으로 본다', () => {
    const items = ['이름'];
    expect(isConsentNoticeReady({ controller: null, purpose: null, retention: null, items })).toBe(false);
    expect(isConsentNoticeReady({ controller: 'A', purpose: 'B', retention: null, items })).toBe(false);
    expect(isConsentNoticeReady({ controller: 'A', purpose: 'B', retention: 'C', items })).toBe(true);
  });
});
