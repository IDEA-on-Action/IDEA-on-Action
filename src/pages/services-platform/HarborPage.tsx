import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import { SEO } from "@/components/shared/SEO";

/**
 * HarborPage (레거시 호환성)
 *
 * 기존 /services/compass/harbor URL을 새로운 /services/minu/keep으로 리다이렉트합니다.
 * 브랜드 전환: COMPASS Harbor → Minu Keep
 *
 * @deprecated 이 페이지는 하위 호환성을 위해 유지됩니다.
 * 새로운 링크에서는 /services/minu/keep을 사용하세요.
 */
export default function HarborPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // 짧은 지연 후 새 URL로 리다이렉트
    const timer = setTimeout(() => {
      navigate('/services/minu/keep', { replace: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PageLayout>
      <SEO
        title="Minu Keep으로 이동 중..."
        description="COMPASS Harbor가 Minu Keep으로 새롭게 태어났습니다."
        canonical="/services/minu/keep"
      />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6 animate-pulse">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Minu Keep으로 이동 중...</h1>
        <p className="text-muted-foreground">
          COMPASS Harbor가 Minu Keep으로 새롭게 태어났습니다.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          자동으로 이동하지 않으면{" "}
          <a href="/services/minu/keep" className="text-primary hover:underline">
            여기를 클릭
          </a>
          해주세요.
        </p>
      </div>
    </PageLayout>
  );
}
