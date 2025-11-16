import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
// Force build cache invalidation - 2025-11-16
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "logo-full.png", "logo-symbol.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "VIBE WORKING - AI 기반 워킹 솔루션",
        short_name: "VIBE WORKING",
        description: "KEEP AWAKE, LIVE PASSIONATE - AI 기반 스마트 워크 플랫폼",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["productivity", "business"],
        lang: "ko-KR",
      },
      workbox: {
        // ============================================================
        // PWA CACHING STRATEGY (Optimized for Performance)
        // ============================================================
        // Goal: Reduce precache size from 4 MB to 2 MB by selectively
        // caching only essential files. Large vendor chunks and admin
        // pages are loaded on-demand via runtime caching.
        //
        // Precache Strategy:
        // - Core files: index.html, manifest, icons
        // - Essential JS: vendor-react-core, vendor-ui, vendor-router
        // - Essential CSS: all CSS files
        // - Public assets: fonts, logos
        //
        // Runtime Cache Strategy:
        // - Large vendor chunks: charts, markdown, sentry (lazy load)
        // - Admin pages: all /admin routes (lazy load)
        // - Images: on-demand caching (CacheFirst)
        // - External resources: Google Fonts, Supabase API
        //
        // Expected Result:
        // - Precache: ~2 MB (100 entries, down from 166 entries)
        // - Runtime Cache: ~2 MB (on-demand loading)
        // ============================================================

        // Precache only essential files
        globPatterns: [
          "**/*.{css,html,ico,png,svg,woff,woff2}",
          "**/index-*.js",       // Main bundle (all vendors merged)
          "**/pages-admin-*.js", // Admin pages chunk
          "**/workbox-*.js",     // PWA service worker
        ],

        // Exclude admin pages and lazy-loaded components from precache
        globIgnores: [
          // Admin pages (lazy load via runtime caching)
          "**/Admin*.js",               // All admin components
          "**/Dashboard-*.js",          // Admin dashboard
          "**/Analytics-*.js",          // Admin analytics
          "**/Revenue-*.js",            // Admin revenue
          "**/RealtimeDashboard-*.js",  // Admin realtime
          "**/AuditLogs-*.js",          // Admin audit logs
          "**/AdminRoles-*.js",         // Admin roles

          // Non-critical pages (lazy load via runtime caching)
          "**/DateRangePicker-*.js",    // ~38 kB (12 kB gzip)
        ],

        runtimeCaching: [
          // 1. Google Fonts (external)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1년
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1년
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 2. Supabase API (external)
          {
            urlPattern: /^https:\/\/zykjdneewbzyazfukzyg\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5분
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 3. Admin pages (on-demand)
          {
            urlPattern: /\/assets\/(Admin|Dashboard|Analytics|Revenue|RealtimeDashboard|AuditLogs|AdminRoles)-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "admin-pages-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7일
              },
            },
          },

          // 4. Other lazy-loaded chunks (on-demand)
          {
            urlPattern: /\/assets\/DateRangePicker-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "lazy-chunks-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7일
              },
            },
          },

          // 5. Images (on-demand)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30일
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // 개발 중에는 비활성화
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // ============================================================
          // VENDOR CHUNKS STRATEGY (TEMPORARILY DISABLED)
          // ============================================================
          // REASON: React module loading order issues causing "createContext" errors
          // - vendor-router disabled → vendor-query error appeared
          // - Indicates async chunk loading race condition
          // - ALL vendor chunks temporarily merged into index.js for cache invalidation
          //
          // ORIGINAL STRATEGY (to re-enable after cache invalidation):
          // - vendor-react-core:     ~140 kB (React runtime only)
          // - vendor-ui:            ~250 kB (Radix UI components)
          // - vendor-charts:        ~100 kB (Recharts)
          // - vendor-markdown:       ~80 kB (Markdown rendering)
          // - vendor-forms:          ~50 kB (React Hook Form + Zod)
          // - vendor-query:          ~40 kB (React Query)
          // - vendor-router:         ~30 kB (React Router)
          // - vendor-supabase:      ~150 kB (Supabase SDK)
          // - vendor-auth:           ~50 kB (OTP, QR Code)
          // - vendor-sentry:        ~100 kB (Error tracking)
          // - vendor-payments:        ~5 kB (Toss Payments SDK)
          //
          // Total Vendor: ~995 kB
          // ============================================================

          // ALL VENDOR CHUNKS TEMPORARILY DISABLED
          // Uncomment below after successful cache invalidation

          // // 1. React Core (MUST LOAD FIRST)
          // if (
          //   id.includes('node_modules/react/') ||
          //   id.includes('node_modules/react-dom/')
          // ) {
          //   return 'vendor-react-core';
          // }

          // // 2. React Router
          // if (id.includes('node_modules/react-router')) {
          //   return 'vendor-router';
          // }

          // // 3. React Query
          // if (id.includes('node_modules/@tanstack/react-query')) {
          //   return 'vendor-query';
          // }

          // // 4. Radix UI Components (depends on React core)
          // // Headless UI primitives for shadcn/ui
          // // Target: ~250 kB gzip
          // if (id.includes('node_modules/@radix-ui')) {
          //   return 'vendor-ui';
          // }

          // // 5. Recharts (depends on React core)
          // // Chart library for analytics dashboard
          // // Target: ~100 kB gzip
          // if (id.includes('node_modules/recharts')) {
          //   return 'vendor-charts';
          // }

          // // 6. Markdown Rendering (depends on React core)
          // // react-markdown, remark-gfm, rehype-raw, rehype-sanitize
          // // Target: ~80 kB gzip
          // if (
          //   id.includes('node_modules/react-markdown') ||
          //   id.includes('node_modules/remark-') ||
          //   id.includes('node_modules/rehype-')
          // ) {
          //   return 'vendor-markdown';
          // }

          // // 7. Form Libraries (depends on React core)
          // // React Hook Form + Zod validation
          // // Target: ~50 kB gzip
          // if (
          //   id.includes('node_modules/react-hook-form') ||
          //   id.includes('node_modules/@hookform') ||
          //   id.includes('node_modules/zod')
          // ) {
          //   return 'vendor-forms';
          // }

          // // 8. Supabase (independent of React)
          // // Backend-as-a-Service SDK
          // // Target: ~150 kB gzip
          // if (id.includes('node_modules/@supabase')) {
          //   return 'vendor-supabase';
          // }

          // // 9. Auth & Security (independent of React)
          // // OTP authentication and QR code generation
          // // Target: ~50 kB gzip
          // if (
          //   id.includes('node_modules/otpauth') ||
          //   id.includes('node_modules/qrcode')
          // ) {
          //   return 'vendor-auth';
          // }

          // // 10. Sentry (depends on React core)
          // // Error tracking and monitoring
          // // Target: ~100 kB gzip
          // if (id.includes('node_modules/@sentry')) {
          //   return 'vendor-sentry';
          // }

          // // 11. Payment SDKs (independent of React)
          // // Toss Payments integration
          // // Target: ~5 kB gzip
          // if (id.includes('node_modules/@tosspayments')) {
          //   return 'vendor-payments';
          // }

          // ============================================================
          // APPLICATION CHUNKS STRATEGY
          // ============================================================
          // Goal: Separate heavy admin routes from main application bundle
          // to reduce initial load time for public pages.
          //
          // Chunk Size Targets:
          // - pages-admin:    ~50-60 kB gzip (Admin dashboard, CRUD pages)
          // - index.js:      ~100-110 kB gzip (Main app, public pages)
          //
          // Expected Savings: ~50 kB gzip from index.js
          // ============================================================

          // Admin Routes (23 pages + 4 components)
          // Contains: Dashboard, Analytics, Revenue, CRUD pages, Forms
          // Only loaded when user accesses /admin routes
          if (id.includes('/pages/admin/') || id.includes('/components/admin/')) {
            return 'pages-admin';
          }

          // NOTE: Public pages (Home, Services, Blog, etc.) remain in index.js
          // This ensures fast initial page load for non-admin users.
        },
      },
    },
    // Set chunk size warning limit to 300 kB (optimized vendor chunks)
    // Individual chunks should be well below this threshold
    chunkSizeWarningLimit: 300,
  },
}));
