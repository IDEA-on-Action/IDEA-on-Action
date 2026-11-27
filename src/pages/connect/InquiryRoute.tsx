import { lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import WorkWithUs from '@/pages/WorkWithUs';
import { isProductInquiryOpen, isProductInquiryProduct } from '@/data/products/product-inquiry';

const ProductInquiry = lazy(() => import('./ProductInquiry'));

/**
 * /connect/inquiry 경로
 *
 * `?product=<제품>` 이 붙어 있고 제품 문의 양식이 열려 있으면 제품 문의 양식을 보여 줍니다.
 * 그 밖의 경우에는 기존 협업 문의 페이지를 그대로 보여 줍니다.
 */
export default function InquiryRoute() {
  const [searchParams] = useSearchParams();
  const product = searchParams.get('product');

  if (isProductInquiryProduct(product) && isProductInquiryOpen()) {
    return <ProductInquiry productId={product} />;
  }

  return <WorkWithUs />;
}
