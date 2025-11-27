-- OAuth 2.0 클라이언트 앱 등록 테이블
-- Minu 서비스들이 IDEA on Action과 OAuth 연동할 때 사용

CREATE TABLE IF NOT EXISTS oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- OAuth 2.0 클라이언트 정보
  client_id TEXT NOT NULL UNIQUE,
  client_secret TEXT NOT NULL, -- bcrypt 해시로 저장
  name TEXT NOT NULL, -- 예: "Minu Find", "Minu Frame"

  -- Redirect URIs (JSON array로 저장)
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',

  -- 허용된 스코프 목록
  scopes TEXT[] NOT NULL DEFAULT '{}', -- 예: ['read:profile', 'write:projects']

  -- 클라이언트 상태
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- 메타데이터
  description TEXT,
  logo_url TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON oauth_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_is_active ON oauth_clients(is_active);

-- RLS 활성화
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자는 활성 클라이언트 조회 가능
CREATE POLICY "Authenticated users can read active clients"
  ON oauth_clients
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS 정책: Admin만 클라이언트 CRUD
CREATE POLICY "Admins can manage oauth clients"
  ON oauth_clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_oauth_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oauth_clients_updated_at
  BEFORE UPDATE ON oauth_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_clients_updated_at();

-- 초기 데이터: Minu 서비스 4개 등록
INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uris, scopes, description)
VALUES
  (
    'minu_find_client',
    '$2a$10$example_hash_replace_with_real_hash', -- 실제 배포 시 bcrypt 해시로 교체
    'Minu Find',
    ARRAY['https://find.minuapp.com/oauth/callback'],
    ARRAY['read:profile', 'read:services', 'write:subscriptions'],
    '사업기회 탐색 서비스'
  ),
  (
    'minu_frame_client',
    '$2a$10$example_hash_replace_with_real_hash',
    'Minu Frame',
    ARRAY['https://frame.minuapp.com/oauth/callback'],
    ARRAY['read:profile', 'read:services', 'write:documents'],
    '문제정의 & RFP 생성 서비스'
  ),
  (
    'minu_build_client',
    '$2a$10$example_hash_replace_with_real_hash',
    'Minu Build',
    ARRAY['https://build.minuapp.com/oauth/callback'],
    ARRAY['read:profile', 'read:projects', 'write:projects', 'write:tasks'],
    '프로젝트 진행 관리 서비스'
  ),
  (
    'minu_keep_client',
    '$2a$10$example_hash_replace_with_real_hash',
    'Minu Keep',
    ARRAY['https://keep.minuapp.com/oauth/callback'],
    ARRAY['read:profile', 'read:services', 'write:monitoring'],
    '운영/유지보수 관리 서비스'
  );

-- 코멘트
COMMENT ON TABLE oauth_clients IS 'OAuth 2.0 클라이언트 앱 등록 정보';
COMMENT ON COLUMN oauth_clients.client_id IS '클라이언트 식별자 (공개)';
COMMENT ON COLUMN oauth_clients.client_secret IS '클라이언트 비밀키 (bcrypt 해시)';
COMMENT ON COLUMN oauth_clients.redirect_uris IS '허용된 리다이렉트 URI 목록';
COMMENT ON COLUMN oauth_clients.scopes IS '클라이언트가 요청할 수 있는 스코프';
