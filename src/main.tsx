import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

// Claude Tool Use 시스템 초기화 (Feature Flag로 제어)
if (import.meta.env.VITE_FEATURE_TOOL_USE === 'true') {
  import('@/lib/claude/tools').then(({ registerAllTools }) => {
    registerAllTools();
    console.log('[App] Tool Use 기능 활성화됨');
  });
}

// Vercel Toolbar 제거 (Production 환경에서도 숨김)
if (typeof window !== "undefined") {
  // 즉시 실행 함수로 Toolbar 제거
  const removeVercelToolbar = () => {
    // 모든 가능한 Vercel Toolbar 선택자
    const selectors = [
      '[data-vercel-toolbar]',
      '.vercel-toolbar',
      '#vercel-toolbar',
      'iframe[src*="vercel.com/toolbar"]',
      'iframe[src*="vercel-insights"]',
      'iframe[src*="speed-insights"]',
      '[id^="vercel"]',
      '[class*="vercel-toolbar"]',
    ];

    selectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = "none";
            el.style.visibility = "hidden";
            el.remove();
          }
        });
      } catch (e) {
        // 선택자 오류 무시
      }
    });
  };

  // DOM 로드 시 즉시 실행
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeVercelToolbar);
  } else {
    removeVercelToolbar();
  }

  // MutationObserver로 동적으로 추가되는 Toolbar도 제거
  const observer = new MutationObserver(() => {
    removeVercelToolbar();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 주기적으로도 체크 (Toolbar가 나중에 추가될 수 있음)
  setInterval(removeVercelToolbar, 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
