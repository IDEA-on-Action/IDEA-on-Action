import { Suspense, lazy, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Force vendor-router chunk regeneration - 2025-11-16
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AdminRoute } from "./components/auth/AdminRoute";
import { CartDrawer } from "./components/cart";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { SkipToContent, KeyboardShortcuts } from "./components/a11y";
import { CommandPalette } from "./components/CommandPalette";

// Lazy load ChatWidget (contains react-markdown dependency)
const ChatWidget = lazy(() => import("./components/chat").then(module => ({ default: module.ChatWidget })));
import { initSentry } from "./lib/sentry";
import { trackPageView } from "./lib/analytics";
import * as Sentry from "@sentry/react";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Error Fallback component
const ErrorFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center space-y-4 p-8">
      <div className="text-6xl">⚠️</div>
      <h1 className="text-2xl font-bold text-foreground">문제가 발생했습니다</h1>
      <p className="text-muted-foreground">
        죄송합니다. 예기치 않은 오류가 발생했습니다.
        <br />
        페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        페이지 새로고침
      </button>
    </div>
  </div>
);

// Analytics 페이지뷰 추적 & 스크롤 초기화 컴포넌트
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // 페이지뷰 추적
    trackPageView(location.pathname + location.search);

    // 페이지 상단으로 스크롤
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // 즉시 이동 (smooth는 느릴 수 있음)
    });
  }, [location]);

  return null;
}

// Eager load (Initial Bundle) - Critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Lazy load (Code Split) - Public pages
const Services = lazy(() => import("./pages/Services"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const Search = lazy(() => import("./pages/Search"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Notices = lazy(() => import("./pages/Notices"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("./pages/PaymentFail"));
const SubscriptionCheckout = lazy(() => import("./pages/SubscriptionCheckout"));
const SubscriptionPayment = lazy(() => import("./pages/SubscriptionPayment"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const TwoFactorSetup = lazy(() => import("./pages/TwoFactorSetup"));
const TwoFactorVerify = lazy(() => import("./pages/TwoFactorVerify"));
const Forbidden = lazy(() => import("./pages/Forbidden"));

// Lazy load (Code Split) - Version 2.0 pages
const About = lazy(() => import("./pages/About"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const PortfolioDetail = lazy(() => import("./pages/PortfolioDetail"));
const Now = lazy(() => import("./pages/Now"));
const Lab = lazy(() => import("./pages/Lab"));
const Community = lazy(() => import("./pages/Community"));
const WorkWithUs = lazy(() => import("./pages/WorkWithUs"));
const Status = lazy(() => import("./pages/Status"));

// Lazy load (Code Split) - Services Platform pages
const ServicesPage = lazy(() => import("./pages/services-platform/ServicesPage"));
const MVPServicePage = lazy(() => import("./pages/services-platform/MVPServicePage"));
const FullstackPage = lazy(() => import("./pages/services-platform/FullstackPage"));
const DesignPage = lazy(() => import("./pages/services-platform/DesignPage"));
const OperationsPage = lazy(() => import("./pages/services-platform/OperationsPage"));
const NavigatorPage = lazy(() => import("./pages/services-platform/NavigatorPage"));
const PricingPage = lazy(() => import("./pages/services-platform/PricingPage"));

// Lazy load (Code Split) - Legal pages
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const ElectronicFinanceTerms = lazy(() => import("./pages/ElectronicFinanceTerms"));

// Lazy load (Code Split) - Admin pages (separate chunk)
const AdminLayout = lazy(() => import("./components/layouts/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const CreateService = lazy(() => import("./pages/admin/CreateService"));
const EditService = lazy(() => import("./pages/admin/EditService"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const CreateBlogPost = lazy(() => import("./pages/admin/CreateBlogPost"));
const EditBlogPost = lazy(() => import("./pages/admin/EditBlogPost"));
const AdminNotices = lazy(() => import("./pages/admin/AdminNotices"));
const CreateNotice = lazy(() => import("./pages/admin/CreateNotice"));
const EditNotice = lazy(() => import("./pages/admin/EditNotice"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminRoadmap = lazy(() => import("./pages/admin/AdminRoadmap"));
const AdminPortfolio = lazy(() => import("./pages/admin/AdminPortfolio"));
const AdminLab = lazy(() => import("./pages/admin/AdminLab"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminBlogCategories = lazy(() => import("./pages/admin/AdminBlogCategories"));
const AdminTags = lazy(() => import("./pages/admin/AdminTags"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Revenue = lazy(() => import("./pages/admin/Revenue"));
const RealtimeDashboard = lazy(() => import("./pages/admin/RealtimeDashboard"));

// Sentry 초기화
initSentry();

// Google Tag Manager는 index.html에 직접 포함되어 있음
// GTM이 자동으로 dataLayer를 초기화하고 GA4를 관리합니다

const queryClient = new QueryClient();

const App = () => (
  <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
    <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          {/* Accessibility: Skip to main content link (WCAG 2.1 - Bypass Blocks) */}
          <SkipToContent targetId="main-content" />

          {/* Accessibility: Keyboard shortcuts help (WCAG 2.1 - Keyboard Accessible) */}
          <KeyboardShortcuts />

          <AnalyticsTracker />
          <CartDrawer />
          <CommandPalette />
          <Suspense fallback={null}>
            <ChatWidget />
          </Suspense>
          <PWAInstallPrompt />
          <PWAUpdatePrompt />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/:id" element={<ServiceDetail />} /> {/* :id is treated as slug */}
              <Route path="/search" element={<Search />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/payment" element={<Payment />} />
              <Route path="/checkout/payment/kakao/success" element={<PaymentSuccess />} />
              <Route path="/checkout/payment/toss/success" element={<PaymentSuccess />} />
              <Route path="/checkout/payment/kakao/fail" element={<PaymentFail />} />
              <Route path="/checkout/payment/kakao/cancel" element={<PaymentFail />} />
              <Route path="/checkout/payment/toss/fail" element={<PaymentFail />} />
              <Route path="/subscription/checkout" element={<SubscriptionCheckout />} />
              <Route path="/subscription/payment" element={<SubscriptionPayment />} />
              <Route path="/subscription/success" element={<PaymentSuccess />} />
              <Route path="/subscription/fail" element={<PaymentFail />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/2fa/setup" element={<TwoFactorSetup />} />
              <Route path="/2fa/verify" element={<TwoFactorVerify />} />
              <Route path="/forbidden" element={<Forbidden />} />

              {/* Version 2.0 Routes */}
              <Route path="/about" element={<About />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/portfolio/:slug" element={<PortfolioDetail />} />
              <Route path="/now" element={<Now />} />
              <Route path="/lab" element={<Lab />} />
              <Route path="/community" element={<Community />} />
              <Route path="/work-with-us" element={<WorkWithUs />} />
              <Route path="/status" element={<Status />} />

              {/* Services Platform Routes */}
              <Route path="/services-platform" element={<ServicesPage />} />
              <Route path="/services/development/mvp" element={<MVPServicePage />} />
              <Route path="/services/development/fullstack" element={<FullstackPage />} />
              <Route path="/services/development/design" element={<DesignPage />} />
              <Route path="/services/development/operations" element={<OperationsPage />} />
              <Route path="/services/compass/navigator" element={<NavigatorPage />} />

              {/* Toss Payments Review URLs - Short aliases */}
              <Route path="/services/mvp" element={<MVPServicePage />} />
              <Route path="/services/fullstack" element={<FullstackPage />} />
              <Route path="/services/design" element={<DesignPage />} />
              <Route path="/services/operations" element={<OperationsPage />} />

              <Route path="/pricing" element={<PricingPage />} />

              {/* Legal Routes */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/electronic-finance-terms" element={<ElectronicFinanceTerms />} />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="services" element={<AdminServices />} />
                <Route path="services/new" element={<CreateService />} />
                <Route path="services/:id/edit" element={<EditService />} />
                <Route path="blog" element={<AdminBlog />} />
                <Route path="blog/new" element={<CreateBlogPost />} />
                <Route path="blog/:id/edit" element={<EditBlogPost />} />
                <Route path="notices" element={<AdminNotices />} />
                <Route path="notices/new" element={<CreateNotice />} />
                <Route path="notices/:id/edit" element={<EditNotice />} />
                <Route path="roles" element={<AdminRoles />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="roadmap" element={<AdminRoadmap />} />
                <Route path="portfolio" element={<AdminPortfolio />} />
                <Route path="lab" element={<AdminLab />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="blog/categories" element={<AdminBlogCategories />} />
                <Route path="tags" element={<AdminTags />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="realtime" element={<RealtimeDashboard />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
    <VercelAnalytics />
  </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
