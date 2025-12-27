-- ============================================
-- D1 인증 스키마 개선
-- Phase 5: Workers 기반 자체 인증 지원
-- ============================================

-- users 테이블에 인증용 컬럼 추가
-- password_salt: 비밀번호 해싱용 salt
-- name: 사용자 표시 이름 (display_name과 별도)
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN name TEXT;

-- login_attempts 테이블에 user_id 컬럼 추가
-- 로그인 시도 기록 시 사용자 ID 연결
ALTER TABLE login_attempts ADD COLUMN user_id TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);

-- ============================================
-- 마이그레이션 후 데이터 동기화
-- display_name → name 복사 (필요시)
-- ============================================
UPDATE users SET name = display_name WHERE name IS NULL AND display_name IS NOT NULL;
