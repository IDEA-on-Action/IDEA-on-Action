import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * OAuth 콜백 처리 페이지
 * Supabase OAuth 인증 후 리다이렉트되는 페이지
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // URL 해시에서 에러 파라미터 확인
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    if (error) {
      console.error('OAuth Error:', error, errorDescription);
      // 에러가 있으면 로그인 페이지로 리다이렉트
      navigate('/login?error=' + encodeURIComponent(errorDescription || error), { replace: true });
      return;
    }

    // Supabase가 자동으로 세션을 처리하므로 세션 확인
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session Error:', sessionError);
        navigate('/login', { replace: true });
        return;
      }

      if (session) {
        // 로그인 성공 - 홈으로 리다이렉트
        navigate('/', { replace: true });
      } else {
        // 세션이 없으면 로그인 페이지로
        navigate('/login', { replace: true });
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
