import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import { SEO } from "@/components/shared/SEO";

/**
 * CartographerPage (레거시 호환성)
 *
 * 기존 /services/compass/cartographer URL을 새로운 /services/minu/frame으로 리다이렉트합니다.
 * 브랜드 전환: COMPASS Cartographer → Minu Frame
 *
 * @deprecated 이 페이지는 하위 호환성을 위해 유지됩니다.
 * 새로운 링크에서는 /services/minu/frame을 사용하세요.
 */
export default function CartographerPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // 짧은 지연 후 새 URL로 리다이렉트
    const timer = setTimeout(() => {
      navigate('/services/minu/frame', { replace: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PageLayout>
      <SEO
        title="Minu Frame으로 이동 중..."
        description="COMPASS Cartographer가 Minu Frame으로 새롭게 태어났습니다."
        canonical="/services/minu/frame"
      />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 animate-pulse">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Minu Frame으로 이동 중...</h1>
        <p className="text-muted-foreground">
          COMPASS Cartographer가 Minu Frame으로 새롭게 태어났습니다.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          자동으로 이동하지 않으면{" "}
          <a href="/services/minu/frame" className="text-primary hover:underline">
            여기를 클릭
          </a>
          해주세요.
        </p>
      </div>
    </PageLayout>
  );
}
