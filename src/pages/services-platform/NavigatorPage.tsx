import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import { SEO } from "@/components/shared/SEO";

/**
 * NavigatorPage (레거시 호환성)
 *
 * 기존 /services/compass/navigator URL을 새로운 /services/minu/find로 리다이렉트합니다.
 * 브랜드 전환: COMPASS Navigator → Minu Find
 *
 * @deprecated 이 페이지는 하위 호환성을 위해 유지됩니다.
 * 새로운 링크에서는 /services/minu/find를 사용하세요.
 */
export default function NavigatorPage() {
  const navigate = useNavigate();

  // Minu Find로 리다이렉트
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/services/minu/find', { replace: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PageLayout>
      <SEO
        title="Minu Find로 이동 중..."
        description="COMPASS Navigator가 Minu Find로 새롭게 태어났습니다."
        canonical="/services/minu/find"
      />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mb-6 animate-pulse">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Minu Find로 이동 중...</h1>
        <p className="text-muted-foreground">
          COMPASS Navigator가 Minu Find로 새롭게 태어났습니다.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          자동으로 이동하지 않으면{" "}
          <a href="/services/minu/find" className="text-primary hover:underline">
            여기를 클릭
          </a>
          해주세요.
        </p>
      </div>
    </PageLayout>
  );
}
