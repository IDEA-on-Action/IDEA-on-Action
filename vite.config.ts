import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - React ecosystem
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }

          // Vendor chunks - Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }

          // Vendor chunks - Radix UI (shadcn/ui base)
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui';
          }

          // Vendor chunks - React Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }

          // Vendor chunks - React Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }

          // Vendor chunks - Charts (Recharts)
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }

          // Vendor chunks - Markdown (react-markdown, remark, rehype)
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/remark') ||
            id.includes('node_modules/rehype')
          ) {
            return 'vendor-markdown';
          }

          // Vendor chunks - Forms (react-hook-form, zod)
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/zod') ||
            id.includes('node_modules/@hookform')
          ) {
            return 'vendor-forms';
          }

          // Vendor chunks - Payment SDKs
          if (id.includes('node_modules/@tosspayments')) {
            return 'vendor-payments';
          }

          // Vendor chunks - Auth & Security (otpauth, qrcode)
          if (
            id.includes('node_modules/otpauth') ||
            id.includes('node_modules/qrcode')
          ) {
            return 'vendor-auth';
          }

          // Vendor chunks - Sentry (에러 추적)
          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry';
          }

          // Admin pages chunk
          if (id.includes('/src/pages/admin/')) {
            return 'pages-admin';
          }

          // Blog & CMS chunk
          if (
            id.includes('/src/pages/Blog') ||
            id.includes('/src/pages/Notices') ||
            id.includes('/src/components/blog/') ||
            id.includes('/src/components/notices/')
          ) {
            return 'pages-cms';
          }

          // E-commerce chunk
          if (
            id.includes('/src/pages/Checkout') ||
            id.includes('/src/pages/Payment') ||
            id.includes('/src/pages/Orders') ||
            id.includes('/src/components/cart/')
          ) {
            return 'pages-ecommerce';
          }

          // Services chunk
          if (
            id.includes('/src/pages/Services') ||
            id.includes('/src/pages/ServiceDetail')
          ) {
            return 'pages-services';
          }
        },
      },
    },
    // Set chunk size warning limit to 500 kB
    chunkSizeWarningLimit: 500,
  },
}));
