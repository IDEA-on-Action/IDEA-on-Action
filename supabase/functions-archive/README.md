# Supabase Edge Functions Archive

> 📦 **아카이브된 Edge Functions (참조용)**

이 폴더에는 Cloudflare Workers로 마이그레이션된 이전 Supabase Edge Functions 코드가 보관되어 있습니다.

## 마이그레이션 매핑

| Edge Function | Cloudflare Workers 핸들러 |
|---------------|--------------------------|
| `api-v1-health` | `handlers/health.ts` |
| `user-api` | `handlers/api/users.ts` |
| `session-api` | `handlers/api/sessions.ts` |
| `team-api` | `handlers/api/teams.ts` |
| `permission-api` | `handlers/api/permissions.ts` |
| `oauth-authorize` | `handlers/oauth/authorize.ts` |
| `oauth-token` | `handlers/oauth/token.ts` |
| `oauth-revoke` | `handlers/oauth/revoke.ts` |
| `toss-payment` | `handlers/payments/toss.ts` |
| `subscription-api` | `handlers/payments/subscription.ts` |
| `create-payment-intent` | `handlers/payments/toss.ts` (통합) |
| `issue-billing-key` | `handlers/payments/toss.ts` (통합) |
| `payment-webhook` | `handlers/payments/toss.ts` (통합) |
| `process-subscription-payments` | `handlers/cron/subscription-processor.ts` |
| `rag-search` | `handlers/rag/search.ts` |
| `rag-embed` | `handlers/rag/search.ts` (통합) |
| `send-slack-notification` | `handlers/notifications/slack.ts` |
| `send-work-inquiry-email` | `handlers/notifications/email.ts` |
| `mcp-auth` | `handlers/mcp/auth.ts` |
| `receive-service-event` | `handlers/mcp/events.ts` |
| `mcp-router` | `handlers/mcp/router.ts` |
| `mcp-sync` | `handlers/mcp/sync.ts` |
| `minu-oauth-callback` | `handlers/minu/oauth-callback.ts` |
| `minu-token-exchange` | `handlers/minu/token-exchange.ts` |
| `minu-webhook` | `handlers/minu/webhook.ts` |
| `profile-sync` | `handlers/profile/sync.ts` |
| `claude-ai` | `handlers/ai/claude.ts` |
| `webhook-send` | `handlers/webhooks/send.ts` |
| `newsletter-send` | `handlers/notifications/newsletter.ts` |
| `sync-github-releases` | `handlers/cron/github-releases.ts` |
| `weekly-recap` | `handlers/cron/weekly-recap.ts` |

## 공유 모듈

| 공유 폴더 | 새 위치 |
|----------|---------|
| `_shared/cors.ts` | `middleware/cors.ts` |
| `_shared/auth.ts` | `middleware/auth.ts` |
| `_shared/supabase.ts` | D1 직접 사용 |
| `_shared/toss-payments.types.ts` | `lib/payments/` |

## ⚠️ 주의사항

- 이 코드는 **더 이상 실행되지 않습니다**
- 참조 및 히스토리 보존 목적으로만 유지됩니다
- 새로운 기능은 `cloudflare-workers/`에 추가하세요
