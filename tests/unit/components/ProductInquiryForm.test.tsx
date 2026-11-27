import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductInquiryForm } from '@/components/forms/ProductInquiryForm';

const submitMock = vi.fn();

vi.mock('@/hooks/products/useProductInquiries', () => ({
  useSubmitProductInquiry: () => ({ mutateAsync: submitMock, isPending: false }),
}));

const USE_CASE = '설비 점검 이력을 온톨로지로 정의하고 조치 제안을 받으려고 합니다.';

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('회사 또는 기관명 *'), '예시 회사');
  await user.type(screen.getByLabelText('이름 *'), '홍길동');
  await user.type(screen.getByLabelText('업무 메일 *'), 'hong@example.com');
  await user.type(screen.getByLabelText('적용하려는 업무 *'), USE_CASE);
}

async function chooseDeployment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: '설치 환경 *' }));
  await user.click(await screen.findByRole('option', { name: '자체 서버' }));
}

describe('ProductInquiryForm', () => {
  beforeEach(() => {
    submitMock.mockReset();
    submitMock.mockResolvedValue({ id: 'inquiry-1' });
    // Radix Select 가 jsdom 에서 쓰는 API
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('항목 9개를 보여 준다', () => {
    render(<ProductInquiryForm productId="kfde-studio" turnstileSiteKey="" />);

    ['회사 또는 기관명 *', '이름 *', '업무 메일 *', '연락처', '적용하려는 업무 *'].forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
    ['역할', '설치 환경 *', '희망 시기'].forEach((label) => {
      expect(screen.getByRole('combobox', { name: label })).toBeInTheDocument();
    });
    expect(screen.getByRole('checkbox', { name: '개인정보 수집·이용에 동의합니다 *' })).toBeInTheDocument();
  });

  it('수집 항목을 양식 아래에 보여 주고 미정인 값은 확정 전으로 표시한다', () => {
    render(<ProductInquiryForm productId="kfde-studio" turnstileSiteKey="" />);

    expect(screen.getByText(/회사 또는 기관명, 이름, 업무 메일/)).toBeInTheDocument();
    expect(screen.getAllByText('확정 전')).toHaveLength(3);
  });

  it('필수 항목이 비어 있으면 제출하지 않는다', async () => {
    const user = userEvent.setup();
    render(<ProductInquiryForm productId="kfde-studio" turnstileSiteKey="" />);

    await user.click(screen.getByRole('button', { name: '문의 보내기' }));

    expect(await screen.findByText('회사 또는 기관명을 입력해야 합니다')).toBeInTheDocument();
    expect(screen.getByText('설치 환경을 선택해야 합니다')).toBeInTheDocument();
    expect(screen.getByText('개인정보 수집·이용에 동의해야 합니다')).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('적용하려는 업무가 20자 미만이면 제출하지 않는다', async () => {
    const user = userEvent.setup();
    render(<ProductInquiryForm productId="kfde-studio" turnstileSiteKey="" />);

    await user.type(screen.getByLabelText('적용하려는 업무 *'), '짧은 내용');
    await user.click(screen.getByRole('button', { name: '문의 보내기' }));

    expect(await screen.findByText('적용하려는 업무를 20자 이상 입력해야 합니다')).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('동의 체크가 없으면 제출하지 않는다', async () => {
    const user = userEvent.setup();
    render(<ProductInquiryForm productId="kfde-studio" turnstileSiteKey="" />);

    await fillRequired(user);
    await chooseDeployment(user);
    await user.click(screen.getByRole('button', { name: '문의 보내기' }));

    expect(await screen.findByText('개인정보 수집·이용에 동의해야 합니다')).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('필수 항목과 동의를 채우면 제품 식별자와 함께 제출하고 접수 안내를 보여 준다', async () => {
    const user = userEvent.setup();
    render(<ProductInquiryForm productId="kfde-studio" turnstileSiteKey="" />);

    await fillRequired(user);
    await chooseDeployment(user);
    await user.click(screen.getByRole('checkbox', { name: '개인정보 수집·이용에 동의합니다 *' }));
    await user.click(screen.getByRole('button', { name: '문의 보내기' }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0][0]).toMatchObject({
      product_id: 'kfde-studio',
      company: '예시 회사',
      name: '홍길동',
      email: 'hong@example.com',
      use_case: USE_CASE,
      deployment: 'on_premise',
      consent: true,
      website: '',
    });
    expect(await screen.findByText('문의가 접수되었습니다')).toBeInTheDocument();
  });

  it('접수에 실패하면 오류를 보여 주고 양식을 유지한다', async () => {
    submitMock.mockRejectedValue(new Error('제품 문의 접수가 아직 열려 있지 않습니다.'));
    const user = userEvent.setup();
    render(<ProductInquiryForm productId="kfde-studio" turnstileSiteKey="" />);

    await fillRequired(user);
    await chooseDeployment(user);
    await user.click(screen.getByRole('checkbox', { name: '개인정보 수집·이용에 동의합니다 *' }));
    await user.click(screen.getByRole('button', { name: '문의 보내기' }));

    expect(await screen.findByText('제품 문의 접수가 아직 열려 있지 않습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('회사 또는 기관명 *')).toHaveValue('예시 회사');
  });

  it('Turnstile 사이트 키가 있으면 확인이 끝나기 전에는 제출 버튼을 막는다', () => {
    render(<ProductInquiryForm productId="kfde-studio" turnstileSiteKey="site-key" />);

    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '문의 보내기' })).toBeDisabled();
  });
});
