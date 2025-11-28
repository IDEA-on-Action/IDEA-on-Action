/**
 * EmailVerify Page
 *
 * 이메일 인증 처리 페이지
 * - 인증 토큰 검증
 * - 결과 표시
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useVerifyEmail } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react'

type VerifyState = 'verifying' | 'success' | 'error'

export default function EmailVerify() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const verifyEmail = useVerifyEmail()
  const [state, setState] = useState<VerifyState>('verifying')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setState('error')
      setErrorMessage('인증 토큰이 없습니다.')
      return
    }

    const verify = async () => {
      try {
        await verifyEmail.mutateAsync(token)
        setState('success')
      } catch (error) {
        setState('error')
        if (error instanceof Error) {
          setErrorMessage(error.message)
        } else {
          setErrorMessage('이메일 인증에 실패했습니다.')
        }
      }
    }

    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // 인증 중
  if (state === 'verifying') {
    return (
      <>
        <Helmet>
          <title>이메일 인증 중 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
            <Card className="max-w-md w-full glass-card">
              <CardHeader className="text-center">
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
                <CardTitle>이메일 인증 중...</CardTitle>
                <CardDescription>잠시만 기다려주세요.</CardDescription>
              </CardHeader>
            </Card>
          </main>
          <Footer />
        </div>
      </>
    )
  }

  // 인증 실패
  if (state === 'error') {
    return (
      <>
        <Helmet>
          <title>인증 실패 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
            <Card className="max-w-md w-full glass-card">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-destructive">인증에 실패했습니다</CardTitle>
                <CardDescription>
                  {errorMessage || '이메일 인증 중 문제가 발생했습니다.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => navigate('/profile')}>
                  프로필로 이동
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  홈으로
                </Button>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      </>
    )
  }

  // 인증 성공
  return (
    <>
      <Helmet>
        <title>인증 완료 | VIBE WORKING</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
          <Card className="max-w-md w-full glass-card">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>이메일 인증이 완료되었습니다!</CardTitle>
              <CardDescription>
                이제 모든 서비스를 이용하실 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 안내 메시지 */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">인증된 계정의 혜택</p>
                  <ul className="text-muted-foreground mt-2 space-y-1">
                    <li>• 주문 및 결제 기능 이용</li>
                    <li>• 프로필 이미지 업로드</li>
                    <li>• 서비스 리뷰 작성</li>
                  </ul>
                </div>
              </div>

              {/* 버튼 */}
              <div className="space-y-3">
                <Button className="w-full" onClick={() => navigate('/profile')}>
                  프로필 확인
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/services')}
                >
                  서비스 둘러보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  )
}
