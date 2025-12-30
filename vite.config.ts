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
        name: "IDEA on Action - 아이디어 실험실 & 프로덕트 스튜디오",
        short_name: "IDEA on Action",
        description: "생각을 멈추지 않고, 행동으로 옮기는 회사. AI 기반 워킹 솔루션으로 비즈니스 혁신을 실현하세요.",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        id: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        categories: ["productivity", "business", "developer tools"],
        lang: "ko-KR",
        dir: "ltr",
        shortcuts: [
          {
            name: "서비스 보기",
            short_name: "서비스",
            description: "IDEA on Action 서비스 목록",
            url: "/services",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "포트폴리오",
            short_name: "포트폴리오",
            description: "프로젝트 포트폴리오",
            url: "/portfolio",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
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

        // Precache only essential files (Phase 4: 600 KB 목표)
        // v2.38.0: index-*.js를 제외하여 초기 로딩 최소화
        // JS는 모두 runtime caching으로 처리 (CacheFirst)
        globPatterns: [
          "**/*.{css,html,ico,woff,woff2}",  // 스타일, 폰트만 precache
          "**/workbox-*.js",                  // PWA 필수
        ],

        // Offline fallback configuration
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],

        // Exclude admin pages and lazy-loaded components from precache
        // Phase 3: PWA Precache 최적화 - 번들 크기 목표 < 600 KB
        globIgnores: [
          // Admin pages (lazy load via runtime caching)
          "**/pages-admin-*.js",              // All admin chunks (split for better loading)
          "**/Admin*.js",                     // All admin components
          "**/Dashboard-*.js",                // Admin dashboard
          "**/Analytics-*.js",                // Admin analytics
          "**/Revenue-*.js",                  // Admin revenue
          "**/RealtimeDashboard-*.js",        // Admin realtime
          "**/AuditLogs-*.js",                // Admin audit logs
          "**/AdminRoles-*.js",               // Admin roles

          // Large vendor chunks (lazy load via runtime caching) - Phase 3
          "**/vendor-*.js",                   // 모든 vendor 청크 (charts, editor, markdown, auth 등)
          "**/skill-*.js",                    // 모든 skill 청크 (xlsx, docx, pptx, jszip 등)
          "**/vendor-charts-*.js",            // ~421 kB (Recharts + d3)
          "**/vendor-editor-*.js",            // ~500 kB (TipTap + ProseMirror)
          "**/vendor-markdown-*.js",          // ~340 kB (markdown rendering)
          "**/xlsx-skill-*.js",               // ~429 kB (Excel export, v2.34.0 동적 로딩)
          "**/docx-skill-*.js",               // ~350 kB (Word export, v2.34.0 동적 로딩)
          "**/pptx-skill-*.js",               // ~200 kB (PowerPoint export, v2.34.0 동적 로딩)
          "**/jszip-skill-*.js",              // ~98 kB (ZIP compression)
          "**/vendor-auth-*.js",              // ~48 kB (2FA/QR codes)

          // Non-critical pages (lazy load via runtime caching)
          "**/DateRangePicker-*.js",          // ~38 kB (12 kB gzip)

          // Chart components (Phase 3: Recharts 동적 로딩)
          "**/DailyRevenueChart-*.js",        // Dashboard 차트
          "**/PaymentMethodChart-*.js",       // Dashboard 차트
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

          // 3. Admin pages (on-demand) - Split into multiple chunks
          {
            urlPattern: /\/assets\/pages-admin-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "admin-pages-cache",
              expiration: {
                maxEntries: 30,  // Increased due to more chunks
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7일
              },
            },
          },

          // 4. Vendor chunks (on-demand)
          {
            urlPattern: /\/assets\/(vendor-charts|vendor-editor|vendor-markdown|xlsx-skill|docx-skill|pptx-skill|jszip-skill|vendor-auth|components-charts)-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "vendor-chunks-cache",
              expiration: {
                maxEntries: 20,  // Increased for xlsx/docx/pptx skill chunks (v2.34.0)
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30일 (vendor는 더 오래 캐시)
              },
            },
          },

          // 5. Main bundle (index-*.js) - v2.38.0 runtime caching
          {
            urlPattern: /\/assets\/index-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "main-bundle-cache",
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30일
              },
            },
          },

          // 6. Other lazy-loaded chunks (on-demand)
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

          // 7. All remaining JS chunks (fallback)
          {
            urlPattern: /\/assets\/.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "js-chunks-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7일
              },
            },
          },

          // 8. Images (on-demand)
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
    // React 중복 인스턴스 방지 (recharts, tiptap 등 별도 청크에서 React 사용 시 필수)
    dedupe: ['react', 'react-dom', 'react-is'],
  },
  build: {
    // ============================================================
    // BUILD OPTIMIZATION (Sprint 5)
    // ============================================================
    // Target: ES2020 for better tree-shaking and smaller output
    target: 'es2020',
    // Minification: Use terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.trace'],
      },
      format: {
        comments: false, // Remove comments
      },
    },
    // CSS code splitting
    cssCodeSplit: true,
    // Source maps (disable in production for smaller bundle)
    sourcemap: false,
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // ============================================================
          // VENDOR CHUNKS STRATEGY (TASK-077 Performance Optimization)
          // ============================================================
          // Updated: 2025-11-22
          //
          // Strategy: Separate heavy lazy-loaded libraries to reduce
          // initial bundle size while keeping React core in main bundle
          // to prevent module loading order issues.
          //
          // Note: React, ReactDOM, React Router, React Query stay in
          // index.js to ensure proper initialization order.
          // ============================================================

          // 1. Recharts - DISABLED: React 중복 인스턴스 문제 발생
          // recharts는 React 내부 API(__SECRET_INTERNALS)에 의존하므로
          // 별도 청크로 분리하면 React 인스턴스 충돌 오류 발생
          // index.js에 포함시켜 단일 React 인스턴스 유지
          // if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
          //   return 'vendor-charts';
          // }

          // 2. Markdown Rendering - Only used in blog posts and chat
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/remark-') ||
            id.includes('node_modules/rehype-') ||
            id.includes('node_modules/unified') ||
            id.includes('node_modules/unist-') ||
            id.includes('node_modules/hast-') ||
            id.includes('node_modules/mdast-') ||
            id.includes('node_modules/micromark')
          ) {
            return 'vendor-markdown';
          }

          // 3. xlsx Skill - Excel export functionality (lazy loaded)
          // v2.34.0: 동적 로딩 최적화로 별도 청크 분리
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx-skill';
          }

          // 4. docx Skill - Word document export functionality (lazy loaded)
          // v2.34.0: 동적 로딩 최적화로 별도 청크 분리
          if (id.includes('node_modules/docx')) {
            return 'docx-skill';
          }

          // 5. pptxgenjs Skill - PowerPoint export functionality (lazy loaded)
          // v2.34.0: devDependencies에서 동적 로딩으로 전환
          if (id.includes('node_modules/pptxgenjs')) {
            return 'pptx-skill';
          }

          // 6. jszip Skill - ZIP file generation (used by xlsx/docx)
          if (id.includes('node_modules/jszip')) {
            return 'jszip-skill';
          }

          // 7. Lazy Loader - Skill 라이브러리 동적 로딩 (v2.34.0)
          // lazy-loader는 매우 작은 모듈이므로 별도 청크 불필요
          // index.js에 포함되어도 무방 (gzip 후 ~3kB)

          // 7. TipTap Editor - Try to separate despite React dependency warnings
          // Split TipTap into its own chunk to reduce blog editor page size
          if (
            id.includes('node_modules/@tiptap') ||
            id.includes('node_modules/prosemirror') ||
            id.includes('node_modules/lowlight')
          ) {
            return 'vendor-editor';
          }

          // 8. Sentry - DISABLED due to React dependency issues
          // Sentry React SDK uses React.Component internally
          // which causes "Cannot read properties of undefined" errors
          // if (id.includes('node_modules/@sentry')) {
          //   return 'vendor-sentry';
          // }

          // 9. Auth & Security (OTP, QR Code) - Only used in 2FA setup
          if (
            id.includes('node_modules/otpauth') ||
            id.includes('node_modules/qrcode')
          ) {
            return 'vendor-auth';
          }

          // 10. Giscus Comments - Split into separate chunk (lazy loaded)
          if (id.includes('/components/community/GiscusCommentsCore')) {
            return 'components-giscus';
          }

          // ============================================================
          // APPLICATION CHUNKS STRATEGY
          // ============================================================
          // Goal: Separate heavy admin routes from main application bundle
          // to reduce initial load time for public pages.
          //
          // Expected Results:
          // - vendor-markdown: ~50 kB gzip (lazy loaded)
          // - vendor-auth:     ~20 kB gzip (lazy loaded)
          // - pages-admin:     ~800 kB gzip (lazy loaded)
          // - index.js:        ~600 kB gzip (initial, includes recharts+tiptap+sentry)
          // ============================================================

          // ============================================================
          // ADMIN CHUNKS - Split into multiple smaller chunks
          // ============================================================
          // pages-admin was 3.4MB, now split into:
          // - pages-admin-dashboard: Dashboard only (~700 kB with Recharts)
          // - pages-admin-analytics: Analytics page (~700 kB with Recharts)
          // - pages-admin-revenue: Revenue page (~700 kB with Recharts)
          // - pages-admin-realtime: Realtime Dashboard (~50 kB)
          // - pages-admin-cms: Blog, Notices, Newsletter (~300 kB)
          // - pages-admin-crud: Service, Portfolio, Team, Lab (~400 kB)
          // - pages-admin-core: Common admin components (~100 kB)
          // ============================================================

          // Dashboard page (separate to split Recharts usage)
          if (id.includes('/pages/admin/Dashboard.tsx')) {
            return 'pages-admin-dashboard';
          }

          // Analytics page (main page only, without tabs)
          if (id.includes('/pages/admin/Analytics.tsx')) {
            return 'pages-admin-analytics';
          }

          // Analytics data provider (hooks and dependencies)
          if (id.includes('/pages/admin/analytics/AnalyticsDataProvider')) {
            return 'pages-admin-analytics-data';
          }

          // Analytics tabs (split by tab for better lazy loading)
          if (id.includes('/pages/admin/analytics/OverviewTab')) {
            return 'pages-admin-analytics-overview';
          }

          if (id.includes('/pages/admin/analytics/FunnelTab')) {
            return 'pages-admin-analytics-funnel';
          }

          if (id.includes('/pages/admin/analytics/BehaviorTab')) {
            return 'pages-admin-analytics-behavior';
          }

          if (id.includes('/pages/admin/analytics/EventsTab')) {
            return 'pages-admin-analytics-events';
          }

          // Revenue page (separate to split Recharts usage)
          if (id.includes('/pages/admin/Revenue.tsx')) {
            return 'pages-admin-revenue';
          }

          // Realtime Dashboard (lightweight)
          if (id.includes('/pages/admin/RealtimeDashboard')) {
            return 'pages-admin-realtime';
          }

          // Blog pages - Split editor from list/categories
          // Blog Editor pages (Create, Edit) - heavy due to TipTap
          if (
            id.includes('/pages/admin/CreateBlogPost') ||
            id.includes('/pages/admin/EditBlogPost')
          ) {
            return 'pages-admin-blog-editor';
          }

          // Blog List & Management pages (lighter)
          if (
            id.includes('/pages/admin/AdminBlog') ||
            id.includes('/pages/admin/AdminBlogCategories') ||
            id.includes('/pages/admin/AdminTags')
          ) {
            return 'pages-admin-blog-list';
          }

          // Notices Editor pages (Create, Edit) - TipTap editor
          if (
            id.includes('/pages/admin/CreateNotice') ||
            id.includes('/pages/admin/EditNotice')
          ) {
            return 'pages-admin-notice-editor';
          }

          // Notices & Newsletter List pages
          if (
            id.includes('/pages/admin/AdminNotices') ||
            id.includes('/pages/admin/AdminNewsletter')
          ) {
            return 'pages-admin-notices-list';
          }

          // Service Editor pages (Create, Edit) - TipTap editor
          if (
            id.includes('/pages/admin/CreateService') ||
            id.includes('/pages/admin/EditService')
          ) {
            return 'pages-admin-service-editor';
          }

          // Service List page
          if (id.includes('/pages/admin/AdminServices')) {
            return 'pages-admin-services-list';
          }

          // Content pages (Portfolio, Team, Lab, Roadmap, Media)
          if (
            id.includes('/pages/admin/AdminPortfolio') ||
            id.includes('/pages/admin/AdminTeam') ||
            id.includes('/pages/admin/AdminLab') ||
            id.includes('/pages/admin/AdminRoadmap') ||
            id.includes('/pages/admin/AdminMedia') ||
            id.includes('/pages/admin/AdminIntegrations')
          ) {
            return 'pages-admin-content';
          }

          // Central Hub Dashboard (heavy due to central-hub components ~300 kB)
          if (id.includes('/pages/admin/CentralHubDashboard')) {
            return 'pages-admin-central-hub';
          }

          // Prompt Templates (DataTable + PromptTemplateForm ~100 kB)
          if (id.includes('/pages/admin/AdminPromptTemplates')) {
            return 'pages-admin-prompt-templates';
          }

          // User management pages (Users, Roles, AuditLogs, Orders)
          if (
            id.includes('/pages/admin/AdminUsers') ||
            id.includes('/pages/admin/AdminRoles') ||
            id.includes('/pages/admin/AuditLogs') ||
            id.includes('/pages/admin/Orders')
          ) {
            return 'pages-admin-users';
          }

          // Admin components - DISABLED due to circular dependency issues
          // Admin components have complex internal dependencies between
          // form components, editors, and UI primitives that cause
          // "Cannot access 'X' before initialization" errors when separated.
          // Keeping them in the main bundle or with their respective pages.
          // if (id.includes('/components/admin/')) {
          //   return 'pages-admin-components';
          // }

          // Remaining admin pages
          if (id.includes('/pages/admin/')) {
            return 'pages-admin-misc';
          }

          // ============================================================
          // ANALYTICS COMPONENTS - Separate Recharts-heavy components
          // ============================================================
          // Recharts cannot be split from components due to circular deps,
          // but we can split components themselves to distribute the load

          // FunnelChart, RevenueChart 등 - DISABLED: recharts 의존성으로 인한 React 충돌
          // recharts 컴포넌트는 별도 청크로 분리하면 React 인스턴스 중복 문제 발생
          // 해당 페이지 청크에 포함시켜 단일 React 인스턴스 유지
          // if (id.includes('/components/analytics/FunnelChart')) {
          //   return 'components-analytics-funnel';
          // }
          // if (
          //   id.includes('/components/analytics/RevenueChart') ||
          //   id.includes('/components/analytics/OrdersChart') ||
          //   id.includes('/components/analytics/ServiceRevenueChart') ||
          //   id.includes('/components/analytics/RevenueComparisonChart')
          // ) {
          //   return 'components-charts';
          // }

          // NOTE: Public pages (Home, Services, Blog, etc.) remain in index.js
          // This ensures fast initial page load for non-admin users.
        },
      },
      // Tree-shaking optimization
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },
  },
}));
