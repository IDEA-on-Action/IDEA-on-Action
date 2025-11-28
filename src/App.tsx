import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Login from "./pages/Login";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Payment from "./pages/Payment";
import PaymentComplete from "./pages/PaymentComplete";
import Profile from "./pages/Profile";
import EmailVerify from "./pages/EmailVerify";
import { AdminRoute } from "./components/auth/AdminRoute";
import { AdminLayout } from "./components/layouts/AdminLayout";
import { CartDrawer } from "./components/cart/CartDrawer";
import Dashboard from "./pages/admin/Dashboard";
import AdminServices from "./pages/admin/AdminServices";
import CreateService from "./pages/admin/CreateService";
import EditService from "./pages/admin/EditService";
import AdminPosts from "./pages/admin/AdminPosts";
import CreatePost from "./pages/admin/CreatePost";
import EditPost from "./pages/admin/EditPost";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CartDrawer />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/login" element={<Login />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/complete" element={<PaymentComplete />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/email/verify" element={<EmailVerify />} />
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
              <Route path="posts" element={<AdminPosts />} />
              <Route path="posts/new" element={<CreatePost />} />
              <Route path="posts/:id/edit" element={<EditPost />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
