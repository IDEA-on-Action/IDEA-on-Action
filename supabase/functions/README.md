# Supabase Edge Functions (Deprecated)

> ⚠️ **이 폴더는 더 이상 사용되지 않습니다.**

## 마이그레이션 완료

모든 Supabase Edge Functions가 **Cloudflare Workers**로 마이그레이션되었습니다.

- **완료일**: 2024-12-28
- **버전**: v2.40.0
- **새 위치**: `cloudflare-workers/`

## 새 엔드포인트

| 이전 (Supabase) | 새 (Cloudflare Workers) |
|-----------------|------------------------|
| `*.supabase.co/functions/v1/*` | `api.ideaonaction.ai/*` |

## 아카이브

이전 코드는 참조용으로 `supabase/functions-archive/`에 보관되어 있습니다.

## Cloudflare Workers 구조

```
cloudflare-workers/
├── src/
│   ├── handlers/          # API 핸들러 (31개)
│   │   ├── api/           # Users, Sessions, Teams, Permissions
│   │   ├── auth/          # Login
│   │   ├── oauth/         # Authorize, Token, Revoke
│   │   ├── payments/      # Toss, Subscription
│   │   ├── rag/           # Search
│   │   ├── storage/       # R2
│   │   ├── realtime/      # WebSocket
│   │   ├── mcp/           # Auth, Events, Router, Sync
│   │   ├── minu/          # OAuth, Token, Webhook
│   │   ├── cron/          # Subscription, GitHub, Recap
│   │   ├── profile/       # Sync
│   │   ├── ai/            # Claude
│   │   ├── notifications/ # Slack, Email, Newsletter
│   │   └── webhooks/      # Send
│   ├── middleware/        # CORS, Auth
│   ├── lib/               # 공유 유틸리티
│   └── durable-objects/   # Realtime
├── migrations/            # D1 마이그레이션
└── wrangler.toml          # 설정
```

## 관련 문서

- [Cloudflare Workers README](../../cloudflare-workers/README.md)
- [마이그레이션 가이드](../../docs/guides/cloudflare-migration.md)
