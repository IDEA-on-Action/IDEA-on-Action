/**
 * Google Analytics 4 (GA4) 통합
 * 페이지뷰, 이벤트, 전환 추적
 */

import { devLog, devWarn } from '@/lib/errors'

// GA4 타입 정의
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

// GA4 초기화
export function initGA4() {
  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;

  if (!measurementId) {
    devWarn("GA4 Measurement ID가 설정되지 않았습니다.");
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

  devLog("GA4 초기화 완료:", measurementId);
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
  parameters?: Record<string, unknown>
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
  beginCheckout: (items: unknown[], totalValue: number) => {
    trackEvent("begin_checkout", {
      currency: "KRW",
      value: totalValue,
      items: items,
    });
  },

  // 구매 완료
  purchase: (orderId: string, totalValue: number, items: unknown[]) => {
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

  // ===== Phase 14 추가 이벤트 (15개) =====

  // 1. 서비스 상세 조회
  viewService: (serviceId: string, serviceName: string, category: string) => {
    trackEvent("view_service", {
      service_id: serviceId,
      service_name: serviceName,
      service_category: category,
    });
  },

  // 2. 장바구니 항목 제거
  removeFromCart: (serviceId: string, serviceName: string, price: number) => {
    trackEvent("remove_from_cart", {
      currency: "KRW",
      value: price,
      items: [
        {
          item_id: serviceId,
          item_name: serviceName,
          price: price,
        },
      ],
    });
  },

  // 3. 결제 정보 추가
  addPaymentInfo: (method: "kakao" | "toss", orderId?: string) => {
    trackEvent("add_payment_info", {
      payment_type: method,
      order_id: orderId,
    });
  },

  // 4. 블로그 게시물 조회
  viewBlogPost: (postId: string, title: string, category: string) => {
    trackEvent("view_blog_post", {
      post_id: postId,
      post_title: title,
      post_category: category,
    });
  },

  // 5. 검색 (확장)
  searchWithResults: (
    query: string,
    type: string,
    resultCount: number
  ) => {
    trackEvent("search", {
      search_term: query,
      search_type: type, // 'all', 'service', 'blog', 'notice'
      result_count: resultCount,
    });
  },

  // 6. CTA 클릭
  clickCTA: (location: string, label: string, url?: string) => {
    trackEvent("click_cta", {
      cta_location: location, // 'header', 'hero', 'service_detail' 등
      cta_label: label, // '문의하기', '구매하기', '더 알아보기' 등
      cta_url: url,
    });
  },

  // 7. 콘텐츠 공유
  shareContent: (
    contentType: "service" | "blog" | "notice",
    contentId: string,
    method: "facebook" | "twitter" | "kakao" | "link"
  ) => {
    trackEvent("share", {
      content_type: contentType,
      content_id: contentId,
      method: method,
    });
  },

  // 8. 파일 다운로드
  downloadFile: (fileName: string, fileType: string, fileSize?: number) => {
    trackEvent("file_download", {
      file_name: fileName,
      file_type: fileType, // 'pdf', 'csv', 'xlsx' 등
      file_size: fileSize,
    });
  },

  // 9. 에러 발생
  error: (errorMessage: string, page: string, errorType?: string) => {
    trackEvent("exception", {
      description: errorMessage,
      page: page,
      error_type: errorType, // 'network', 'validation', 'server' 등
      fatal: false,
    });
  },

  // 10. 프로필 업데이트
  updateProfile: (fields: string[]) => {
    trackEvent("update_profile", {
      updated_fields: fields.join(","), // 'avatar', 'name', 'email' 등
    });
  },

  // 11. 2FA 활성화
  enable2FA: () => {
    trackEvent("enable_2fa", {
      security_action: "2fa_enabled",
    });
  },

  // 12. 알림 상호작용
  interactNotification: (
    action: "click" | "dismiss" | "mark_read",
    notificationType: string
  ) => {
    trackEvent("notification_interaction", {
      action: action,
      notification_type: notificationType, // 'order', 'system', 'promotion' 등
    });
  },

  // 13. 챗봇 상호작용
  chatbotInteraction: (action: "open" | "close" | "send_message", messageCount?: number) => {
    trackEvent("chatbot_interaction", {
      action: action,
      message_count: messageCount,
    });
  },

  // 14. 필터 적용
  applyFilter: (
    filterType: string,
    filterValue: string,
    resultCount?: number
  ) => {
    trackEvent("apply_filter", {
      filter_type: filterType, // 'category', 'price_range', 'status' 등
      filter_value: filterValue,
      result_count: resultCount,
    });
  },

  // 15. 커스텀 이벤트
  customEvent: (eventName: string, params: Record<string, unknown>) => {
    trackEvent(eventName, params);
  },
};
