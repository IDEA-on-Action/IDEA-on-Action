import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import { SEO } from "@/components/shared/SEO";

/**
 * CaptainPage (레거시 호환성)
 *
 * 기존 /services/compass/captain URL을 새로운 /services/minu/build로 리다이렉트합니다.
 * 브랜드 전환: COMPASS Captain → Minu Build
 *
 * @deprecated 이 페이지는 하위 호환성을 위해 유지됩니다.
 * 새로운 링크에서는 /services/minu/build를 사용하세요.
 */
export default function CaptainPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // 짧은 지연 후 새 URL로 리다이렉트
    const timer = setTimeout(() => {
      navigate('/services/minu/build', { replace: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PageLayout>
      <SEO
        title="Minu Build로 이동 중..."
        description="COMPASS Captain이 Minu Build로 새롭게 태어났습니다."
        canonical="/services/minu/build"
      />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-6 animate-pulse">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Minu Build로 이동 중...</h1>
        <p className="text-muted-foreground">
          COMPASS Captain이 Minu Build로 새롭게 태어났습니다.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          자동으로 이동하지 않으면{" "}
          <a href="/services/minu/build" className="text-primary hover:underline">
            여기를 클릭
          </a>
          해주세요.
        </p>
      </div>
    </PageLayout>
  );
}
