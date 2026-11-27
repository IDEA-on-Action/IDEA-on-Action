import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminProductInquiries from '@/pages/admin/AdminProductInquiries';
import type { ProductInquiry } from '@/hooks/products/useProductInquiries';

const listMock = vi.fn();
const mutateMock = vi.fn();

vi.mock('@/hooks/products/useProductInquiries', () => ({
  useProductInquiries: (status?: string) => listMock(status),
  useUpdateProductInquiry: () => ({ mutate: mutateMock, isPending: false }),
}));

const inquiry: ProductInquiry = {
  id: 'inquiry-1',
  product_id: 'kfde-studio',
  company: '예시 회사',
  name: '홍길동',
  email: 'hong@example.com',
  phone: null,
  role: 'data_it',
  use_case: '설비 점검 이력을 온톨로지로 정의하고 조치 제안을 받으려고 합니다.',
  deployment: 'on_premise',
  timeline: null,
  consent_at: '2026-11-27T01:00:00.000Z',
  status: 'received',
  admin_notes: null,
  created_at: '2026-11-27T01:00:00.000Z',
};

describe('AdminProductInquiries', () => {
  beforeEach(() => {
    listMock.mockReset();
    mutateMock.mockReset();
    listMock.mockReturnValue({ data: [inquiry], isLoading: false, isError: false, error: null });
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('문의 목록을 보여 준다', () => {
    render(<AdminProductInquiries />);

    const row = screen.getByRole('row', { name: /예시 회사/ });
    expect(within(row).getByText('K-FDE Studio')).toBeInTheDocument();
    expect(within(row).getByText('홍길동')).toBeInTheDocument();
    expect(within(row).getByText('자체 서버')).toBeInTheDocument();
    expect(within(row).getByRole('combobox', { name: '예시 회사 문의 상태' })).toHaveTextContent('접수');
  });

  it('상태를 바꾸면 변경 요청을 보낸다', async () => {
    const user = userEvent.setup();
    render(<AdminProductInquiries />);

    await user.click(screen.getByRole('combobox', { name: '예시 회사 문의 상태' }));
    await user.click(await screen.findByRole('option', { name: '연락함' }));

    expect(mutateMock).toHaveBeenCalledWith({ id: 'inquiry-1', status: 'contacted' }, expect.any(Object));
  });

  it('상세 보기에서 관리자 메모를 저장한다', async () => {
    const user = userEvent.setup();
    render(<AdminProductInquiries />);

    await user.click(screen.getByRole('button', { name: '보기' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('hong@example.com')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('관리자 메모'), '메일 회신');
    await user.click(within(dialog).getByRole('button', { name: '메모 저장' }));

    expect(mutateMock).toHaveBeenCalledWith({ id: 'inquiry-1', adminNotes: '메일 회신' }, expect.any(Object));
  });

  it('문의가 없으면 빈 상태를 보여 준다', () => {
    listMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    render(<AdminProductInquiries />);

    expect(screen.getByText('접수된 문의가 없습니다.')).toBeInTheDocument();
  });
});
