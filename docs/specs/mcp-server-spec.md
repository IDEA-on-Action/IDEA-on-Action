# Compass Navigator MCP Server Specification

이 문서는 **Compass Navigator**와 **생각과 행동(IDEA on Action)** 간의 연동을 위한 MCP(Model Context Protocol) 서버의 스펙을 정의합니다.

## 1. 개요

MCP 서버는 Compass Navigator 서비스가 IDEA on Action의 사용자 인증 및 구독 정보를 안전하게 조회하고 활용할 수 있도록 중계 역할을 수행합니다.

### 아키텍처
- **Client**: Compass Navigator (Web/App)
- **Bridge**: MCP Server (Node.js/Python 등)
- **Provider**: IDEA on Action (Supabase)

## 2. 리소스 (Resources)

MCP 서버는 다음 리소스를 통해 IDEA on Action의 데이터를 제공합니다.

### `user://current`
현재 인증된 사용자의 기본 정보를 반환합니다.

- **URI**: `user://current`
- **MIME Type**: `application/json`
- **데이터 구조**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatar_url": "https://..."
  }
  ```

### `subscription://current`
현재 사용자의 구독 상태 및 플랜 정보를 반환합니다.

- **URI**: `subscription://current`
- **MIME Type**: `application/json`
- **데이터 구조**:
  ```json
  {
    "status": "active" | "inactive" | "past_due",
    "plan": {
      "name": "Pro",
      "features": ["feature1", "feature2"]
    },
    "valid_until": "2025-12-31T23:59:59Z"
  }
  ```

## 3. 도구 (Tools)

MCP 서버는 다음 도구를 제공하여 비즈니스 로직을 수행합니다.

### `verify_token`
클라이언트가 제공한 Supabase JWT 토큰의 유효성을 검증합니다.

- **Name**: `verify_token`
- **Arguments**:
  - `token` (string): Supabase Access Token
- **Returns**:
  - `valid` (boolean): 유효성 여부
  - `user_id` (string, optional): 사용자 ID

### `check_permission`
사용자가 특정 기능에 접근할 권한이 있는지 확인합니다 (구독 플랜 기반).

- **Name**: `check_permission`
- **Arguments**:
  - `permission` (string): 확인할 권한 (예: `access_compass_pro`)
- **Returns**:
  - `allowed` (boolean): 허용 여부
  - `reason` (string, optional): 거부 사유

## 4. 데이터베이스 연동

MCP 서버는 IDEA on Action의 Supabase 데이터베이스에 있는 `compass_integration_view` 뷰를 조회하여 데이터를 가져옵니다.

- **View Name**: `public.compass_integration_view`
- **Access Control**: Service Role Key 또는 제한된 권한을 가진 Service User를 통해 접근
