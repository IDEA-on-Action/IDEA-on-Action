/**
 * 기능 공개 설정
 *
 * 빌드 시점 환경 변수로 공개 여부를 정합니다. 값이 정확히 'true' 일 때만 켜지고,
 * 값이 없으면 꺼진 상태입니다.
 *
 * - VITE_FEATURE_KFDE_STUDIO: K-FDE Studio 소개 페이지, 서비스 카드, 사이트맵 경로
 * - VITE_FEATURE_PRODUCT_INQUIRY: 제품 문의 양식과 소개 페이지의 도입 문의 버튼
 */

type FeatureEnv = Record<string, string | boolean | undefined>;

const isOn = (value: string | boolean | undefined): boolean => value === 'true' || value === true;

export function readFeatures(env: FeatureEnv) {
  return {
    kfdeStudio: isOn(env.VITE_FEATURE_KFDE_STUDIO),
    productInquiry: isOn(env.VITE_FEATURE_PRODUCT_INQUIRY),
  };
}

export const features = readFeatures(import.meta.env);
