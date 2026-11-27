import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '@/components/layouts/PageLayout';
import { SEO } from '@/components/shared/SEO';
import { ProductInquiryForm } from '@/components/forms/ProductInquiryForm';
import { PRODUCT_INQUIRY_PRODUCTS, type ProductInquiryProductId } from '@/data/products/product-inquiry';

/** 제품 도입 문의 페이지 (/connect/inquiry?product=<제품>) */
export default function ProductInquiry({ productId }: { productId: ProductInquiryProductId }) {
  const product = PRODUCT_INQUIRY_PRODUCTS[productId];

  return (
    <PageLayout maxWidth="4xl">
      <SEO
        title={`${product.name} 도입 문의`}
        description={`${product.name} 도입 문의 양식입니다. 적용하려는 업무와 설치 환경을 알려 주시면 검토가 빨라집니다.`}
        canonical="/connect/inquiry"
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-8 break-keep">
        <header className="flex flex-col gap-3">
          <Link to={product.backTo} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            {product.name} 소개로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold md:text-4xl">{product.name} 도입 문의</h1>
          <p className="text-muted-foreground">
            적용하려는 업무와 설치 환경(고객 클라우드 또는 자체 서버)을 알려 주시면 검토가 빨라집니다.
          </p>
        </header>

        <ProductInquiryForm productId={productId} />
      </div>
    </PageLayout>
  );
}
