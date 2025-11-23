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

        // Precache only essential files
        globPatterns: [
          "**/*.{css,html,ico,png,svg,woff,woff2}",
          "**/index-*.js",       // Main bundle (all vendors merged)
          "**/workbox-*.js",     // PWA service worker
          "offline.html",        // Offline fallback page
        ],

        // Offline fallback configuration
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],

        // Exclude admin pages and lazy-loaded components from precache
        globIgnores: [
          // Admin pages (lazy load via runtime caching)
          "**/pages-admin-*.js",        // Admin pages bundle (2.83 MB, exceeds 2 MB limit)
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
            urlPattern: /\/assets\/(pages-admin|Admin|Dashboard|Analytics|Revenue|RealtimeDashboard|AuditLogs|AdminRoles)-.*\.js$/,
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

          // 1. Recharts - DISABLED due to circular dependency issues
          // recharts + d3-* libraries have complex internal dependencies
          // that cause "Cannot access 'X' before initialization" errors
          // when separated into their own chunk.
          // Keeping them in the main bundle for now.
          // TODO: Re-evaluate with recharts v3 or alternative charting library
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
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx-skill';
          }

          // 4. docx Skill - Word document export functionality (lazy loaded)
          if (id.includes('node_modules/docx')) {
            return 'docx-skill';
          }

          // 5. TipTap Editor - DISABLED due to React dependency issues
          // TipTap/Prosemirror uses React's useSyncExternalStore internally
          // which causes "Cannot read properties of undefined" errors
          // when separated into their own chunk.
          // if (
          //   id.includes('node_modules/@tiptap') ||
          //   id.includes('node_modules/prosemirror') ||
          //   id.includes('node_modules/lowlight')
          // ) {
          //   return 'vendor-editor';
          // }

          // 6. Sentry - DISABLED due to React dependency issues
          // Sentry React SDK uses React.Component internally
          // which causes "Cannot read properties of undefined" errors
          // if (id.includes('node_modules/@sentry')) {
          //   return 'vendor-sentry';
          // }

          // 7. Auth & Security (OTP, QR Code) - Only used in 2FA setup
          if (
            id.includes('node_modules/otpauth') ||
            id.includes('node_modules/qrcode')
          ) {
            return 'vendor-auth';
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
          // - pages-admin-analytics: Dashboard, Analytics, Revenue (~200 kB)
          // - pages-admin-cms: Blog, Notices, Newsletter (~300 kB)
          // - pages-admin-crud: Service, Portfolio, Team, Lab (~400 kB)
          // - pages-admin-core: Common admin components (~100 kB)
          // ============================================================

          // Analytics & Dashboard pages
          if (
            id.includes('/pages/admin/Dashboard') ||
            id.includes('/pages/admin/Analytics') ||
            id.includes('/pages/admin/Revenue') ||
            id.includes('/pages/admin/RealtimeDashboard')
          ) {
            return 'pages-admin-analytics';
          }

          // Blog pages (Create, Edit, List)
          if (
            id.includes('/pages/admin/AdminBlog') ||
            id.includes('/pages/admin/CreateBlogPost') ||
            id.includes('/pages/admin/EditBlogPost') ||
            id.includes('/pages/admin/AdminBlogCategories') ||
            id.includes('/pages/admin/AdminTags')
          ) {
            return 'pages-admin-blog';
          }

          // Notices & Newsletter pages
          if (
            id.includes('/pages/admin/AdminNotices') ||
            id.includes('/pages/admin/CreateNotice') ||
            id.includes('/pages/admin/EditNotice') ||
            id.includes('/pages/admin/AdminNewsletter')
          ) {
            return 'pages-admin-notices';
          }

          // Service pages (Create, Edit, List)
          if (
            id.includes('/pages/admin/AdminServices') ||
            id.includes('/pages/admin/CreateService') ||
            id.includes('/pages/admin/EditService')
          ) {
            return 'pages-admin-services';
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

          // NOTE: Public pages (Home, Services, Blog, etc.) remain in index.js
          // This ensures fast initial page load for non-admin users.
        },
      },
    },
    // Chunk size warning limit (v2.9.0)
    // Admin chunks are lazy-loaded, so larger sizes are acceptable:
    // - pages-admin-analytics: 2,143 kB (544 kB gzip, includes Recharts)
    // - pages-admin-blog: 917 kB (274 kB gzip, includes TipTap)
    // - vendor-markdown: 341 kB (108 kB gzip)
    // Note: Recharts cannot be split due to circular d3-* dependencies
    chunkSizeWarningLimit: 2200,
  },
}));
