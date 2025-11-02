import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// 한국어 번역
import koCommon from "@/locales/ko/common.json";
import koAuth from "@/locales/ko/auth.json";
import koServices from "@/locales/ko/services.json";
import koEcommerce from "@/locales/ko/ecommerce.json";
import koAdmin from "@/locales/ko/admin.json";

// 영어 번역
import enCommon from "@/locales/en/common.json";
import enAuth from "@/locales/en/auth.json";
import enServices from "@/locales/en/services.json";
import enEcommerce from "@/locales/en/ecommerce.json";
import enAdmin from "@/locales/en/admin.json";

// i18n 초기화
i18n
  .use(LanguageDetector) // 브라우저 언어 자동 감지
  .use(initReactI18next) // React 통합
  .init({
    resources: {
      ko: {
        common: koCommon,
        auth: koAuth,
        services: koServices,
        ecommerce: koEcommerce,
        admin: koAdmin,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        services: enServices,
        ecommerce: enEcommerce,
        admin: enAdmin,
      },
    },
    fallbackLng: "ko", // 기본 언어: 한국어
    defaultNS: "common", // 기본 네임스페이스
    ns: ["common", "auth", "services", "ecommerce", "admin"],

    interpolation: {
      escapeValue: false, // React가 XSS 방지를 자동 처리
    },

    detection: {
      // 언어 감지 순서
      order: ["localStorage", "navigator", "htmlTag"],
      // localStorage 키
      lookupLocalStorage: "i18nextLng",
      // 쿠키 설정
      caches: ["localStorage"],
    },

    debug: import.meta.env.DEV, // 개발 모드에서만 디버그
  });

export default i18n;
