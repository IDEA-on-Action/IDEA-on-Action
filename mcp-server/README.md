# Compass Navigator MCP Server

MCP (Model Context Protocol) 서버로, Compass Navigator와 IDEA on Action 간의 연동을 제공합니다.

## 개요

이 MCP 서버는 Compass Navigator 서비스가 IDEA on Action의 사용자 인증 및 구독 정보를 안전하게 조회하고 활용할 수 있도록 중계 역할을 수행합니다.

### 아키텍처

```
Client (Compass Navigator) <-> MCP Server <-> IDEA on Action (Supabase)
```

## 설치

```bash
# 디렉토리 이동
cd mcp-server

# 의존성 설치
npm install
```

## 환경 변수

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 연결 정보
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# JWT 검증
SUPABASE_JWT_SECRET=your-jwt-secret

# HTTP 서버 설정 (선택사항)
PORT=3001
HOST=localhost
MCP_TRANSPORT=stdio  # 또는 http
```

## 실행

### stdio 전송 모드 (CLI 클라이언트용)

```bash
# 개발 모드
npm run dev:stdio

# 또는
npm run dev -- --stdio
```

### HTTP 전송 모드 (웹 클라이언트용)

```bash
# 개발 모드
npm run dev:http

# 또는
npm run dev -- --http
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

## API

### Resources (읽기 전용)

#### `user://current`

현재 인증된 사용자의 기본 정보를 반환합니다.

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "avatar_url": "https://..."
}
```

#### `subscription://current`

현재 사용자의 구독 상태 및 플랜 정보를 반환합니다.

```json
{
  "status": "active",
  "plan": {
    "name": "Pro",
    "features": ["feature1", "feature2"]
  },
  "valid_until": "2025-12-31T23:59:59Z"
}
```

### Tools (실행 가능)

#### `verify_token`

Supabase JWT 토큰의 유효성을 검증합니다.

**입력:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**출력:**
```json
{
  "valid": true,
  "user_id": "uuid"
}
```

#### `check_permission`

사용자가 특정 기능에 접근할 권한이 있는지 확인합니다.

**입력:**
```json
{
  "permission": "access_compass_pro",
  "user_id": "uuid"  // 선택사항
}
```

**출력:**
```json
{
  "allowed": true
}
```

또는:
```json
{
  "allowed": false,
  "reason": "Requires pro plan or higher. Current plan: basic"
}
```

#### `authenticate`

토큰으로 인증하고 사용자 컨텍스트를 설정합니다.

**입력:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### `list_permissions`

사용 가능한 모든 권한 목록을 반환합니다.

**출력:**
```json
{
  "permissions": [
    { "permission": "access_compass_basic" },
    { "permission": "access_compass_pro" },
    { "permission": "access_compass_enterprise" },
    { "permission": "export_data" },
    { "permission": "advanced_analytics" },
    { "permission": "team_collaboration" },
    { "permission": "priority_support" },
    { "permission": "api_access" },
    { "permission": "custom_integrations" }
  ]
}
```

### 권한 레벨

| 권한 | 필요 플랜 |
|------|----------|
| access_compass_basic | Basic |
| access_compass_pro | Pro |
| access_compass_enterprise | Enterprise |
| export_data | Pro |
| advanced_analytics | Pro |
| team_collaboration | Enterprise |
| priority_support | Enterprise |
| api_access | Pro |
| custom_integrations | Enterprise |

## HTTP 엔드포인트

HTTP 모드로 실행시 다음 엔드포인트를 사용할 수 있습니다:

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/mcp` | POST | MCP 프로토콜 엔드포인트 |
| `/health` | GET | 헬스 체크 |
| `/info` | GET | 서버 정보 |

### 인증

HTTP 요청 시 Authorization 헤더에 Bearer 토큰을 포함하세요:

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "list_permissions"}, "id": 1}'
```

## 테스트

```bash
# 테스트 실행
npm test

# 와치 모드
npm run test:watch
```

## 개발

### 디렉토리 구조

```
mcp-server/
├── src/
│   ├── index.ts          # 진입점
│   ├── server.ts         # MCP 서버 설정
│   ├── resources/
│   │   ├── user.ts       # user://current 리소스
│   │   └── subscription.ts # subscription://current 리소스
│   ├── tools/
│   │   ├── verify-token.ts  # verify_token 도구
│   │   └── check-permission.ts # check_permission 도구
│   └── lib/
│       ├── supabase.ts   # Supabase 클라이언트
│       └── jwt.ts        # JWT 유틸리티
├── tests/                # 테스트 파일
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 타입 체크

```bash
npm run typecheck
```

### 빌드

```bash
npm run build
```

## Claude Desktop 통합

Claude Desktop에서 이 MCP 서버를 사용하려면 `claude_desktop_config.json`에 다음을 추가하세요:

```json
{
  "mcpServers": {
    "compass-navigator": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js", "--stdio"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "SUPABASE_JWT_SECRET": "your-jwt-secret"
      }
    }
  }
}
```

## 관련 문서

- [MCP 서버 스펙](../docs/specs/mcp-server-spec.md)
- [Compass Integration View](../supabase/migrations/20251123000000_add_compass_integration_view.sql)
- [Model Context Protocol 공식 문서](https://modelcontextprotocol.io/)

## 라이선스

MIT
