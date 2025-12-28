-- MCP 토큰 발급/검증 함수
-- 생성일: 2025-12-07
-- 목적: JWT 기반 MCP 토큰 발급, 검증, 갱신, 폐기 함수
-- 참조: BL-005 MCP 토큰 발급/검증

-- ============================================================================
-- 1. issue_mcp_token: JWT 토큰 발급
-- ============================================================================

/**
 * MCP JWT 토큰 발급
 *
 * @param p_client_id OAuth 클라이언트 ID
 * @param p_user_id 사용자 ID
 * @param p_scopes 요청된 권한 범위 (배열)
 * @returns JSON { access_token, refresh_token, expires_in, token_type, scope }
 *
 * 예시:
 * SELECT issue_mcp_token('minu-find-sandbox', 'user-uuid', ARRAY['openid', 'profile']);
 */
CREATE OR REPLACE FUNCTION issue_mcp_token(
  p_client_id TEXT,
  p_user_id UUID,
  p_scopes TEXT[] DEFAULT ARRAY['openid']
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_access_jti UUID;
  v_refresh_jti UUID;
  v_client_scopes TEXT[];
  v_allowed_scopes TEXT[];
  v_access_token_exp TIMESTAMPTZ;
  v_refresh_token_exp TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- 1. 클라이언트 유효성 검증
  SELECT scopes INTO v_client_scopes
  FROM oauth_clients
  WHERE client_id = p_client_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive client_id: %', p_client_id;
  END IF;

  -- 2. 요청된 스코프 필터링 (클라이언트가 허용한 스코프만)
  SELECT ARRAY(
    SELECT unnest(p_scopes)
    INTERSECT
    SELECT unnest(v_client_scopes)
  ) INTO v_allowed_scopes;

  IF array_length(v_allowed_scopes, 1) IS NULL THEN
    RAISE EXCEPTION 'No valid scopes requested';
  END IF;

  -- 3. JTI (JWT ID) 생성
  v_access_jti := gen_random_uuid();
  v_refresh_jti := gen_random_uuid();
  v_session_id := gen_random_uuid();

  -- 4. 만료 시간 계산
  v_access_token_exp := NOW() + INTERVAL '1 hour';
  v_refresh_token_exp := NOW() + INTERVAL '7 days';

  -- 5. OAuth 세션 생성
  INSERT INTO oauth_sessions (
    id,
    user_id,
    client_id,
    access_token_jti,
    refresh_token_jti,
    scope,
    expires_at,
    created_at,
    last_used_at
  ) VALUES (
    v_session_id,
    p_user_id,
    p_client_id,
    v_access_jti,
    v_refresh_jti,
    array_to_string(v_allowed_scopes, ' '),
    v_access_token_exp,
    NOW(),
    NOW()
  );

  -- 6. JWT 페이로드 반환 (실제 서명은 Edge Function에서 처리)
  v_result := json_build_object(
    'session_id', v_session_id,
    'access_token_jti', v_access_jti,
    'refresh_token_jti', v_refresh_jti,
    'user_id', p_user_id,
    'client_id', p_client_id,
    'scope', array_to_string(v_allowed_scopes, ' '),
    'access_token_exp', EXTRACT(EPOCH FROM v_access_token_exp)::INTEGER,
    'refresh_token_exp', EXTRACT(EPOCH FROM v_refresh_token_exp)::INTEGER,
    'expires_in', 3600,
    'token_type', 'Bearer'
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 2. verify_mcp_token: 토큰 검증 및 페이로드 반환
-- ============================================================================

/**
 * MCP JWT 토큰 검증
 *
 * @param p_token_jti JWT ID (jti claim)
 * @returns JSON { valid, status, user_id, client_id, scope, expires_at, remaining_seconds }
 *
 * 예시:
 * SELECT verify_mcp_token('jti-uuid-from-token');
 */
CREATE OR REPLACE FUNCTION verify_mcp_token(
  p_token_jti UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session oauth_sessions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_remaining_seconds INTEGER;
  v_status TEXT;
  v_result JSON;
BEGIN
  -- 1. 세션 조회 (Access Token JTI 기준)
  SELECT * INTO v_session
  FROM oauth_sessions
  WHERE access_token_jti = p_token_jti;

  IF NOT FOUND THEN
    -- Refresh Token JTI인 경우도 확인
    SELECT * INTO v_session
    FROM oauth_sessions
    WHERE refresh_token_jti = p_token_jti;

    IF NOT FOUND THEN
      RETURN json_build_object(
        'valid', false,
        'status', 'invalid',
        'error', 'Token not found'
      );
    END IF;
  END IF;

  -- 2. 폐기 여부 확인
  IF v_session.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'valid', false,
      'status', 'revoked',
      'error', 'Token has been revoked',
      'revoked_at', v_session.revoked_at
    );
  END IF;

  -- 3. 만료 여부 확인
  IF v_session.expires_at < v_now THEN
    RETURN json_build_object(
      'valid', false,
      'status', 'expired',
      'error', 'Token has expired',
      'expires_at', v_session.expires_at
    );
  END IF;

  -- 4. 유효한 토큰: last_used_at 업데이트
  UPDATE oauth_sessions
  SET last_used_at = v_now
  WHERE id = v_session.id;

  v_remaining_seconds := EXTRACT(EPOCH FROM (v_session.expires_at - v_now))::INTEGER;

  -- 5. 검증 성공 응답
  RETURN json_build_object(
    'valid', true,
    'status', 'valid',
    'user_id', v_session.user_id,
    'client_id', v_session.client_id,
    'scope', v_session.scope,
    'expires_at', v_session.expires_at,
    'remaining_seconds', v_remaining_seconds,
    'session_id', v_session.id
  );
END;
$$;

-- ============================================================================
-- 3. revoke_mcp_token: 토큰 폐기
-- ============================================================================

/**
 * MCP JWT 토큰 폐기
 *
 * @param p_token_jti JWT ID (jti claim)
 * @returns JSON { revoked, message }
 *
 * 예시:
 * SELECT revoke_mcp_token('jti-uuid-from-token');
 */
CREATE OR REPLACE FUNCTION revoke_mcp_token(
  p_token_jti UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated INTEGER;
BEGIN
  -- 1. Access Token JTI로 세션 폐기
  UPDATE oauth_sessions
  SET revoked_at = NOW()
  WHERE access_token_jti = p_token_jti
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- 2. Access Token이 없으면 Refresh Token JTI로 시도
  IF v_rows_updated = 0 THEN
    UPDATE oauth_sessions
    SET revoked_at = NOW()
    WHERE refresh_token_jti = p_token_jti
      AND revoked_at IS NULL;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  END IF;

  -- 3. 결과 반환
  IF v_rows_updated > 0 THEN
    RETURN json_build_object(
      'revoked', true,
      'message', 'Token successfully revoked'
    );
  ELSE
    RETURN json_build_object(
      'revoked', false,
      'message', 'Token not found or already revoked'
    );
  END IF;
END;
$$;

-- ============================================================================
-- 4. refresh_mcp_token: 토큰 갱신
-- ============================================================================

/**
 * MCP JWT 토큰 갱신
 *
 * @param p_refresh_jti Refresh Token JTI
 * @returns JSON { access_token_jti, refresh_token_jti, user_id, client_id, scope, expires_in }
 *
 * 예시:
 * SELECT refresh_mcp_token('refresh-jti-uuid');
 */
CREATE OR REPLACE FUNCTION refresh_mcp_token(
  p_refresh_jti UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session oauth_sessions%ROWTYPE;
  v_new_access_jti UUID;
  v_new_refresh_jti UUID;
  v_new_access_exp TIMESTAMPTZ;
  v_new_refresh_exp TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- 1. Refresh Token으로 세션 조회
  SELECT * INTO v_session
  FROM oauth_sessions
  WHERE refresh_token_jti = p_refresh_jti;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid refresh token';
  END IF;

  -- 2. 폐기 여부 확인
  IF v_session.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Refresh token has been revoked';
  END IF;

  -- 3. Refresh Token 만료 여부 확인 (7일)
  -- Refresh Token의 만료는 created_at + 7일로 계산
  IF v_session.created_at + INTERVAL '7 days' < NOW() THEN
    RAISE EXCEPTION 'Refresh token has expired';
  END IF;

  -- 4. 새로운 JTI 생성
  v_new_access_jti := gen_random_uuid();
  v_new_refresh_jti := gen_random_uuid();

  -- 5. 새 만료 시간 계산
  v_new_access_exp := NOW() + INTERVAL '1 hour';
  v_new_refresh_exp := NOW() + INTERVAL '7 days';

  -- 6. 기존 세션 업데이트
  UPDATE oauth_sessions
  SET
    access_token_jti = v_new_access_jti,
    refresh_token_jti = v_new_refresh_jti,
    expires_at = v_new_access_exp,
    last_used_at = NOW()
  WHERE id = v_session.id;

  -- 7. 새 토큰 정보 반환
  v_result := json_build_object(
    'session_id', v_session.id,
    'access_token_jti', v_new_access_jti,
    'refresh_token_jti', v_new_refresh_jti,
    'user_id', v_session.user_id,
    'client_id', v_session.client_id,
    'scope', v_session.scope,
    'access_token_exp', EXTRACT(EPOCH FROM v_new_access_exp)::INTEGER,
    'refresh_token_exp', EXTRACT(EPOCH FROM v_new_refresh_exp)::INTEGER,
    'expires_in', 3600,
    'token_type', 'Bearer'
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 권한 설정
-- ============================================================================

-- authenticated 사용자만 함수 실행 가능
GRANT EXECUTE ON FUNCTION issue_mcp_token(TEXT, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_mcp_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_mcp_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_mcp_token(UUID) TO authenticated;

-- anon 사용자는 verify만 가능 (공개 검증)
GRANT EXECUTE ON FUNCTION verify_mcp_token(UUID) TO anon;

-- ============================================================================
-- 검증
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MCP 토큰 함수 생성 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - issue_mcp_token(client_id, user_id, scopes)';
  RAISE NOTICE '  - verify_mcp_token(token_jti)';
  RAISE NOTICE '  - revoke_mcp_token(token_jti)';
  RAISE NOTICE '  - refresh_mcp_token(refresh_jti)';
  RAISE NOTICE '';
  RAISE NOTICE '토큰 만료 시간:';
  RAISE NOTICE '  - Access Token: 1시간 (3600초)';
  RAISE NOTICE '  - Refresh Token: 7일 (604800초)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
