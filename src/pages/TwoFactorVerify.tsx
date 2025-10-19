/**
 * 2FA Verification Page
 *
 * 로그인 시 2단계 인증 페이지
 * - TOTP 토큰 입력
 * - 백업 코드 사용
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useLocation } from 'react-router-dom'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useVerify2FA } from '@/hooks/use2FA'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, Shield, Key } from 'lucide-react'

export default function TwoFactorVerify() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mutate: verify2FA, isPending } = useVerify2FA()

  const [token, setToken] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)

  // 로그인 후 리다이렉트할 경로 (state로 전달받음)
  const redirectTo = (location.state as { from?: string })?.from || '/'

  // TOTP 토큰 검증
  const handleVerify = () => {
    if (!token) return

    verify2FA(
      { token, isBackupCode: useBackupCode },
      {
        onSuccess: () => {
          navigate(redirectTo)
        },
      }
    )
  }

  // Enter 키로 제출
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  return (
    <>
      <Helmet>
        <title>2단계 인증 - IDEA on Action</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4 mx-auto">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">2단계 인증</CardTitle>
              <CardDescription>
                {useBackupCode
                  ? '백업 코드를 입력하세요'
                  : '인증 앱에 표시된 6자리 코드를 입력하세요'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Token Input */}
              <div>
                <Input
                  type="text"
                  placeholder={useBackupCode ? '12345678' : '123456'}
                  value={token}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setToken(useBackupCode ? value.slice(0, 8) : value.slice(0, 6))
                  }}
                  onKeyDown={handleKeyDown}
                  maxLength={useBackupCode ? 8 : 6}
                  className="text-center text-2xl font-mono tracking-widest"
                  autoFocus
                />
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                disabled={
                  isPending ||
                  (useBackupCode ? token.length !== 8 : token.length !== 6)
                }
                className="w-full"
                size="lg"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    인증 중...
                  </>
                ) : (
                  '인증하기'
                )}
              </Button>

              <Separator />

              {/* Toggle Backup Code */}
              <Button
                variant="ghost"
                onClick={() => {
                  setUseBackupCode(!useBackupCode)
                  setToken('')
                }}
                className="w-full"
              >
                <Key className="mr-2 h-4 w-4" />
                {useBackupCode ? 'TOTP 코드 사용' : '백업 코드 사용'}
              </Button>

              {/* Cancel */}
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="w-full"
              >
                취소
              </Button>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  )
}
