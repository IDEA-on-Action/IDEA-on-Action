import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { setUser as setSentryUser } from '@/lib/sentry';

// Workers 인증 토큰 저장 키
const WORKERS_TOKEN_KEY = 'workers_auth_tokens';
const AUTH_PROVIDER_KEY = 'auth_provider';

/**
 * Workers 토큰 타입
 */
interface WorkersTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl?: string | null;
    isAdmin?: boolean;
  };
}

/**
 * JWT 페이로드에서 사용자 정보 추출
 */
function parseJwtPayload(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * OAuth 콜백 처리 페이지
 * Workers OAuth 및 Supabase OAuth 인증 후 리다이렉트되는 페이지
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // 1. Workers OAuth 콜백 확인 (쿼리 파라미터)
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const expiresIn = searchParams.get('expires_in');
      const error = searchParams.get('error');

      // 에러 확인
      if (error) {
        console.error('OAuth Error:', error);
        setStatus('error');
        setErrorMessage(error);
        setTimeout(() => {
          navigate('/login?error=' + encodeURIComponent(error), { replace: true });
        }, 1500);
        return;
      }

      // Workers OAuth 토큰이 있는 경우
      if (accessToken && refreshToken && expiresIn) {
        console.log('Workers OAuth 콜백 처리 중...');

        // JWT에서 사용자 정보 추출
        const payload = parseJwtPayload(accessToken);
        if (!payload) {
          setStatus('error');
          setErrorMessage('토큰 파싱 실패');
          setTimeout(() => {
            navigate('/login?error=invalid_token', { replace: true });
          }, 1500);
          return;
        }

        // Workers 토큰 저장
        const tokens: WorkersTokens = {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + parseInt(expiresIn) * 1000,
          user: {
            id: payload.sub,
            email: payload.email,
            name: payload.email.split('@')[0], // 기본 이름
          },
        };

        try {
          localStorage.setItem(WORKERS_TOKEN_KEY, JSON.stringify(tokens));
          localStorage.setItem(AUTH_PROVIDER_KEY, 'workers');

          // Sentry 사용자 설정
          setSentryUser({
            id: tokens.user.id,
            email: tokens.user.email,
            username: tokens.user.name || tokens.user.email.split('@')[0],
          });

          setStatus('success');
          console.log('Workers OAuth 로그인 성공:', tokens.user.email);

          // 홈으로 리다이렉트
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 500);
        } catch (e) {
          console.error('토큰 저장 실패:', e);
          setStatus('error');
          setErrorMessage('토큰 저장 실패');
          setTimeout(() => {
            navigate('/login?error=storage_error', { replace: true });
          }, 1500);
        }
        return;
      }

      // 2. Supabase OAuth 콜백 확인 (해시 파라미터)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (hashError) {
        console.error('Supabase OAuth Error:', hashError, errorDescription);
        setStatus('error');
        setErrorMessage(errorDescription || hashError);
        setTimeout(() => {
          navigate('/login?error=' + encodeURIComponent(errorDescription || hashError), { replace: true });
        }, 1500);
        return;
      }

      // Supabase 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session Error:', sessionError);
        setStatus('error');
        setErrorMessage('세션 확인 실패');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
        return;
      }

      if (session) {
        setStatus('success');
        localStorage.setItem(AUTH_PROVIDER_KEY, 'supabase');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        // 세션도 없고 토큰도 없으면 로그인 페이지로
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">로그인 처리 중...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="h-12 w-12 rounded-full bg-green-500 mx-auto flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600">로그인 성공!</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-500 mx-auto flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600">로그인 실패</p>
            {errorMessage && <p className="text-sm text-muted-foreground">{errorMessage}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
