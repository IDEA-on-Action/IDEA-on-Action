import { Suspense, lazy, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AdminRoute } from "./components/auth/AdminRoute";
import { CartDrawer } from "./components/cart";
import { ChatWidget } from "./components/chat";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { initSentry } from "./lib/sentry";
import { initGA4, trackPageView } from "./lib/analytics";
import * as Sentry from "@sentry/react";

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

// Analytics 페이지뷰 추적 컴포넌트
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

// Eager load (Initial Bundle) - Critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
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
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const TwoFactorSetup = lazy(() => import("./pages/TwoFactorSetup"));
const TwoFactorVerify = lazy(() => import("./pages/TwoFactorVerify"));
const Forbidden = lazy(() => import("./pages/Forbidden"));

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
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Revenue = lazy(() => import("./pages/admin/Revenue"));

// Sentry 초기화
initSentry();

// Google Analytics 4 초기화
initGA4();

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
          <AnalyticsTracker />
          <CartDrawer />
          <ChatWidget />
          <PWAInstallPrompt />
          <PWAUpdatePrompt />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/:id" element={<ServiceDetail />} />
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
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/login" element={<Login />} />
              <Route path="/2fa/setup" element={<TwoFactorSetup />} />
              <Route path="/2fa/verify" element={<TwoFactorVerify />} />
              <Route path="/forbidden" element={<Forbidden />} />

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
                <Route path="analytics" element={<Analytics />} />
                <Route path="revenue" element={<Revenue />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
