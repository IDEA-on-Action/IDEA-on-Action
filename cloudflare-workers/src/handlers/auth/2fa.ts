/**
 * 2FA (Two-Factor Authentication) 핸들러
 * TOTP 기반 이중 인증
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { authMiddleware, type AuthContext } from '../../middleware/auth';

const twoFactor = new Hono<AppType>();

// TOTP 설정
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_ALGORITHM = 'SHA-1';

// Base32 디코딩
function base32Decode(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanedInput = encoded.toUpperCase().replace(/=+$/, '');

  let bits = '';
  for (const char of cleanedInput) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }

  return bytes;
}

// Base32 인코딩
function base32Encode(buffer: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  // 5비트 패딩
  while (bits.length % 5 !== 0) {
    bits += '0';
  }

  let encoded = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    encoded += alphabet[parseInt(chunk, 2)];
  }

  return encoded;
}

// 랜덤 시크릿 생성
function generateSecret(): string {
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);
  return base32Encode(buffer);
}

// HMAC-SHA1 계산
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, data);
}

// TOTP 생성
async function generateTOTP(secret: string, time: number = Date.now()): Promise<string> {
  const counter = Math.floor(time / 1000 / TOTP_PERIOD);
  const counterBuffer = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const secretBytes = base32Decode(secret);
  const hmac = await hmacSha1(secretBytes, counterBuffer);
  const hmacBytes = new Uint8Array(hmac);

  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const binary =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

// TOTP 검증 (시간 윈도우 허용)
async function verifyTOTP(secret: string, token: string, window: number = 1): Promise<boolean> {
  const now = Date.now();

  for (let i = -window; i <= window; i++) {
    const time = now + (i * TOTP_PERIOD * 1000);
    const expected = await generateTOTP(secret, time);
    if (token === expected) {
      return true;
    }
  }

  return false;
}

// 백업 코드 생성
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    const code = Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

// 백업 코드 해시 (저장용)
async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashed: string[] = [];

  for (const code of codes) {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    hashed.push(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));
  }

  return hashed;
}

// POST /auth/2fa/setup - 2FA 설정 시작
twoFactor.post('/setup', authMiddleware, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth?.userId) {
    return c.json({ error: '로그인이 필요합니다' }, 401);
  }

  // 이미 2FA가 활성화되어 있는지 확인
  const existing = await db
    .prepare('SELECT * FROM two_factor_auth WHERE user_id = ? AND enabled = 1')
    .bind(auth.userId)
    .first();

  if (existing) {
    return c.json({ error: '2FA가 이미 활성화되어 있습니다' }, 400);
  }

  // 새 시크릿 생성
  const secret = generateSecret();
  const now = new Date().toISOString();

  // 임시 저장 (아직 활성화 X)
  await db
    .prepare(`
      INSERT INTO two_factor_auth (id, user_id, secret, enabled, created_at)
      VALUES (?, ?, ?, 0, ?)
      ON CONFLICT (user_id) DO UPDATE SET secret = ?, enabled = 0, created_at = ?
    `)
    .bind(crypto.randomUUID(), auth.userId, secret, now, secret, now)
    .run();

  // 사용자 이메일 가져오기
  const user = await db
    .prepare('SELECT email FROM users WHERE id = ?')
    .bind(auth.userId)
    .first<{ email: string }>();

  // otpauth URI 생성
  const issuer = 'IDEA on Action';
  const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user?.email || 'user')}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

  return c.json({
    secret,
    otpauthUri,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`,
    message: 'QR 코드를 스캔하거나 시크릿을 수동으로 입력한 후, 6자리 코드로 확인해주세요',
  });
});

// POST /auth/2fa/verify - 2FA 설정 확인 및 활성화
twoFactor.post('/verify', authMiddleware, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth?.userId) {
    return c.json({ error: '로그인이 필요합니다' }, 401);
  }

  const { token } = await c.req.json<{ token: string }>();

  if (!token || token.length !== 6) {
    return c.json({ error: '6자리 인증 코드를 입력해주세요' }, 400);
  }

  // 미확인 2FA 설정 조회
  const pending = await db
    .prepare('SELECT * FROM two_factor_auth WHERE user_id = ? AND enabled = 0')
    .bind(auth.userId)
    .first<{ id: string; secret: string }>();

  if (!pending) {
    return c.json({ error: '2FA 설정을 먼저 시작해주세요' }, 400);
  }

  // TOTP 검증
  const isValid = await verifyTOTP(pending.secret, token);
  if (!isValid) {
    return c.json({ error: '인증 코드가 올바르지 않습니다' }, 400);
  }

  // 백업 코드 생성
  const backupCodes = generateBackupCodes(10);
  const hashedCodes = await hashBackupCodes(backupCodes);
  const now = new Date().toISOString();

  // 2FA 활성화
  await db
    .prepare(`
      UPDATE two_factor_auth
      SET enabled = 1, backup_codes = ?, verified_at = ?
      WHERE id = ?
    `)
    .bind(JSON.stringify(hashedCodes), now, pending.id)
    .run();

  return c.json({
    success: true,
    message: '2FA가 활성화되었습니다',
    backupCodes,
    warning: '백업 코드를 안전한 곳에 저장하세요. 이 코드는 다시 표시되지 않습니다.',
  });
});

// POST /auth/2fa/validate - 로그인 시 2FA 검증
twoFactor.post('/validate', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;

  const { userId, token, useBackupCode } = await c.req.json<{
    userId: string;
    token: string;
    useBackupCode?: boolean;
  }>();

  if (!userId || !token) {
    return c.json({ error: '필수 파라미터가 누락되었습니다' }, 400);
  }

  // 2FA 설정 조회
  const twoFA = await db
    .prepare('SELECT * FROM two_factor_auth WHERE user_id = ? AND enabled = 1')
    .bind(userId)
    .first<{ id: string; secret: string; backup_codes: string }>();

  if (!twoFA) {
    return c.json({ error: '2FA가 활성화되지 않았습니다' }, 400);
  }

  let isValid = false;
  const now = new Date().toISOString();

  if (useBackupCode) {
    // 백업 코드 검증
    const backupCodes = JSON.parse(twoFA.backup_codes) as string[];
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const tokenHash = await crypto.subtle.digest('SHA-256', tokenData);
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const codeIndex = backupCodes.indexOf(tokenHashHex);
    if (codeIndex !== -1) {
      isValid = true;
      // 사용한 백업 코드 제거
      backupCodes.splice(codeIndex, 1);
      await db
        .prepare('UPDATE two_factor_auth SET backup_codes = ? WHERE id = ?')
        .bind(JSON.stringify(backupCodes), twoFA.id)
        .run();
    }
  } else {
    // TOTP 검증
    isValid = await verifyTOTP(twoFA.secret, token);
  }

  if (!isValid) {
    return c.json({ error: '인증 코드가 올바르지 않습니다' }, 401);
  }

  // 마지막 사용 시간 업데이트
  await db
    .prepare('UPDATE two_factor_auth SET last_used_at = ? WHERE id = ?')
    .bind(now, twoFA.id)
    .run();

  // 2FA 검증 완료 토큰 발급 (5분 유효)
  const verificationToken = crypto.randomUUID();
  await kv.put(`2fa:verified:${userId}:${verificationToken}`, 'true', { expirationTtl: 300 });

  return c.json({
    success: true,
    verificationToken,
    message: '2FA 인증이 완료되었습니다',
  });
});

// POST /auth/2fa/disable - 2FA 비활성화
twoFactor.post('/disable', authMiddleware, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth?.userId) {
    return c.json({ error: '로그인이 필요합니다' }, 401);
  }

  const { password, token } = await c.req.json<{ password: string; token: string }>();

  // 비밀번호 검증 (선택적)
  // TODO: 비밀번호 검증 로직 추가

  // 2FA 설정 조회
  const twoFA = await db
    .prepare('SELECT * FROM two_factor_auth WHERE user_id = ? AND enabled = 1')
    .bind(auth.userId)
    .first<{ id: string; secret: string }>();

  if (!twoFA) {
    return c.json({ error: '2FA가 활성화되지 않았습니다' }, 400);
  }

  // TOTP 검증
  const isValid = await verifyTOTP(twoFA.secret, token);
  if (!isValid) {
    return c.json({ error: '인증 코드가 올바르지 않습니다' }, 400);
  }

  // 2FA 비활성화
  await db
    .prepare('DELETE FROM two_factor_auth WHERE id = ?')
    .bind(twoFA.id)
    .run();

  return c.json({
    success: true,
    message: '2FA가 비활성화되었습니다',
  });
});

// GET /auth/2fa/status - 2FA 상태 조회
twoFactor.get('/status', authMiddleware, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth?.userId) {
    return c.json({ error: '로그인이 필요합니다' }, 401);
  }

  const twoFA = await db
    .prepare('SELECT enabled, verified_at, last_used_at FROM two_factor_auth WHERE user_id = ?')
    .bind(auth.userId)
    .first<{ enabled: number; verified_at: string | null; last_used_at: string | null }>();

  return c.json({
    enabled: twoFA?.enabled === 1,
    verifiedAt: twoFA?.verified_at,
    lastUsedAt: twoFA?.last_used_at,
  });
});

// POST /auth/2fa/regenerate-backup - 백업 코드 재생성
twoFactor.post('/regenerate-backup', authMiddleware, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth?.userId) {
    return c.json({ error: '로그인이 필요합니다' }, 401);
  }

  const { token } = await c.req.json<{ token: string }>();

  // 2FA 설정 조회
  const twoFA = await db
    .prepare('SELECT * FROM two_factor_auth WHERE user_id = ? AND enabled = 1')
    .bind(auth.userId)
    .first<{ id: string; secret: string }>();

  if (!twoFA) {
    return c.json({ error: '2FA가 활성화되지 않았습니다' }, 400);
  }

  // TOTP 검증
  const isValid = await verifyTOTP(twoFA.secret, token);
  if (!isValid) {
    return c.json({ error: '인증 코드가 올바르지 않습니다' }, 400);
  }

  // 새 백업 코드 생성
  const backupCodes = generateBackupCodes(10);
  const hashedCodes = await hashBackupCodes(backupCodes);

  // 저장
  await db
    .prepare('UPDATE two_factor_auth SET backup_codes = ? WHERE id = ?')
    .bind(JSON.stringify(hashedCodes), twoFA.id)
    .run();

  return c.json({
    success: true,
    backupCodes,
    warning: '새 백업 코드를 안전한 곳에 저장하세요. 기존 백업 코드는 더 이상 사용할 수 없습니다.',
  });
});

export default twoFactor;
