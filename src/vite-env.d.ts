/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Cloudflare Workers API
  readonly VITE_WORKERS_API_URL: string

  // OAuth
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GITHUB_CLIENT_ID: string
  readonly VITE_KAKAO_CLIENT_ID: string

  // OpenAI
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_OPENAI_MODEL: string

  // Google Analytics
  readonly VITE_GA4_MEASUREMENT_ID: string

  // Payments
  readonly VITE_KAKAO_PAY_CID: string
  readonly VITE_KAKAO_PAY_ADMIN_KEY: string
  readonly VITE_TOSS_CLIENT_KEY: string
  readonly VITE_TOSS_SECRET_KEY: string

  // Resend
  readonly VITE_RESEND_API_KEY?: string
  readonly VITE_RESEND_FROM_EMAIL: string

  // Giscus (댓글 시스템)
  readonly VITE_GISCUS_REPO: string
  readonly VITE_GISCUS_REPO_ID: string
  readonly VITE_GISCUS_CATEGORY_GENERAL: string
  readonly VITE_GISCUS_CATEGORY_GENERAL_ID: string
  readonly VITE_GISCUS_CATEGORY_BLOG: string
  readonly VITE_GISCUS_CATEGORY_BLOG_ID: string

  // Feature Flags
  readonly VITE_FEATURE_TOOL_USE?: string  // 'true' | 'false' - Claude Tool Use 활성화
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
