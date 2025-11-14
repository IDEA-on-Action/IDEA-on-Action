/**
 * Google Tag Manager (GTM) 및 Google Analytics 4 (GA4) 통합
 * 페이지뷰, 이벤트, 전환 추적
 * 
 * GTM을 사용하므로 dataLayer를 통해 이벤트를 전송합니다.
 * GTM에서 GA4 태그를 설정하면 자동으로 전송됩니다.
 */

import { devLog, devWarn } from '@/lib/errors'

// GTM/GA4 타입 정의
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

/**
 * dataLayer 초기화 (GTM이 자동으로 생성하지만 안전을 위해)
 */
function ensureDataLayer() {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }
}

// GTM 사용 시 initGA4는 필요 없음 (GTM이 자동 처리)
// 레거시 호환성을 위해 빈 함수로 유지
export function initGA4() {
  ensureDataLayer();
  devLog("GTM을 사용 중입니다. GA4는 GTM을 통해 관리됩니다.");
}

// 페이지뷰 추적
export function trackPageView(path: string, title?: string) {
  ensureDataLayer();
  
  // GTM dataLayer를 통해 전송
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: path,
      page_title: title || document.title,
    });
  }
  
  // gtag가 있으면 사용 (GTM이 제공할 수 있음)
  if (window.gtag) {
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: title || document.title,
    });
  }
}

// 커스텀 이벤트 추적
export function trackEvent(
  eventName: string,
  parameters?: Record<string, unknown>
) {
  ensureDataLayer();
  
  // GTM dataLayer를 통해 전송
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...parameters,
    });
  }
  
  // gtag가 있으면 사용 (GTM이 제공할 수 있음)
  if (window.gtag) {
    window.gtag("event", eventName, parameters);
  }
}

// 전환 추적 (구매, 회원가입 등)
export function trackConversion(
  conversionId: string,
  value?: number,
  currency = "KRW"
) {
  ensureDataLayer();
  
  // GTM dataLayer를 통해 전송
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'conversion',
      send_to: conversionId,
      value: value,
      currency: currency,
    });
  }
  
  // gtag가 있으면 사용 (GTM이 제공할 수 있음)
  if (window.gtag) {
    window.gtag("event", "conversion", {
      send_to: conversionId,
      value: value,
      currency: currency,
    });
  }
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

  // ===== Version 2.0 Sprint 3 이벤트 (5개) =====

  // 16. 홈 페이지 조회
  viewHome: () => {
    trackEvent("view_home", {
      page: "home",
      timestamp: new Date().toISOString(),
    });
  },

  // 17. 뉴스레터 구독
  subscribeNewsletter: (email: string, location: string) => {
    trackEvent("subscribe_newsletter", {
      location: location, // 'footer', 'home_inline', 'popup' 등
      email_domain: email.split("@")[1], // 도메인만 저장 (개인정보 보호)
    });
  },

  // 18. 커뮤니티 참여
  joinCommunity: (action: "comment" | "discussion" | "view", topic?: string) => {
    trackEvent("join_community", {
      action: action,
      topic: topic,
    });
  },

  // 19. 바운티 신청
  applyBounty: (bountyId: string, bountyTitle: string, reward: number) => {
    trackEvent("apply_bounty", {
      bounty_id: bountyId,
      bounty_title: bountyTitle,
      reward: reward,
    });
  },

  // 20. Roadmap 조회
  viewRoadmap: (quarter?: string, goal?: string) => {
    trackEvent("view_roadmap", {
      quarter: quarter,
      goal: goal,
    });
  },
};
