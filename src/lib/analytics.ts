/**
 * Google Analytics 4 (GA4) 통합
 * 페이지뷰, 이벤트, 전환 추적
 */

// GA4 타입 정의
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

// GA4 초기화
export function initGA4() {
  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn("GA4 Measurement ID가 설정되지 않았습니다.");
    return;
  }

  // GA4 스크립트 로드
  const script1 = document.createElement("script");
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // GA4 초기화 스크립트
  const script2 = document.createElement("script");
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      send_page_view: false, // 수동으로 페이지뷰 추적
      cookie_flags: 'SameSite=None;Secure',
    });
  `;
  document.head.appendChild(script2);

  console.log("GA4 초기화 완료:", measurementId);
}

// 페이지뷰 추적
export function trackPageView(path: string, title?: string) {
  if (!window.gtag) return;

  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
  });
}

// 커스텀 이벤트 추적
export function trackEvent(
  eventName: string,
  parameters?: Record<string, any>
) {
  if (!window.gtag) return;

  window.gtag("event", eventName, parameters);
}

// 전환 추적 (구매, 회원가입 등)
export function trackConversion(
  conversionId: string,
  value?: number,
  currency = "KRW"
) {
  if (!window.gtag) return;

  window.gtag("event", "conversion", {
    send_to: conversionId,
    value: value,
    currency: currency,
  });
}

// E-commerce 이벤트 추적
export const analytics = {
  // 장바구니 추가
  addToCart: (item: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }) => {
    trackEvent("add_to_cart", {
      currency: "KRW",
      value: item.price * item.quantity,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
        },
      ],
    });
  },

  // 체크아웃 시작
  beginCheckout: (items: any[], totalValue: number) => {
    trackEvent("begin_checkout", {
      currency: "KRW",
      value: totalValue,
      items: items,
    });
  },

  // 구매 완료
  purchase: (orderId: string, totalValue: number, items: any[]) => {
    trackEvent("purchase", {
      transaction_id: orderId,
      value: totalValue,
      currency: "KRW",
      items: items,
    });
  },

  // 로그인
  login: (method: string) => {
    trackEvent("login", {
      method: method, // 'google', 'github', 'email' 등
    });
  },

  // 회원가입
  signUp: (method: string) => {
    trackEvent("sign_up", {
      method: method,
    });
  },

  // 검색
  search: (searchTerm: string) => {
    trackEvent("search", {
      search_term: searchTerm,
    });
  },

  // 콘텐츠 조회
  viewItem: (item: { id: string; name: string; category: string }) => {
    trackEvent("view_item", {
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          item_category: item.category,
        },
      ],
    });
  },
};
