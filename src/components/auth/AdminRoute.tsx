/**
 * AdminRoute Component
 *
 * 관리자만 접근 가능한 라우트
 * - 로그인하지 않은 경우 로그인 페이지로 리다이렉트
 * - 관리자가 아닌 경우 403 페이지로 리다이렉트
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/auth/useIsAdmin'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin()
  const location = useLocation()

  // 로딩 중
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // isAdmin이 undefined면 아직 조회 중이므로 로딩 표시
  if (isAdmin === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 관리자가 아닌 경우 (명시적으로 false) 403 페이지로 리다이렉트
  if (isAdmin === false) {
    return <Navigate to="/forbidden" replace />
  }

  // 관리자인 경우 렌더링
  return <>{children}</>
}
