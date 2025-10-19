/**
 * 2FA Setup Page
 *
 * 2단계 인증 설정 페이지
 * - QR 코드 표시 (Google Authenticator 등록)
 * - TOTP 토큰 검증
 * - 백업 코드 표시 및 다운로드
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/hooks/useAuth'
import { use2FASettings, useSetup2FA, useEnable2FA } from '@/hooks/use2FA'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Loader2,
  Shield,
  Smartphone,
  Key,
} from 'lucide-react'

export default function TwoFactorSetup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: settings, isLoading } = use2FASettings()
  const { mutate: setupTwoFactor, isPending: isSettingUp, data: setupData } = useSetup2FA()
  const { mutate: enableTwoFactor, isPending: isEnabling } = useEnable2FA()

  const [verificationToken, setVerificationToken] = useState('')
  const [step, setStep] = useState<'initial' | 'qr' | 'verify' | 'backup' | 'complete'>('initial')

  // 로그인 체크
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>로그인이 필요합니다.</AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    )
  }

  // 이미 2FA가 활성화된 경우
  if (settings?.enabled) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              2단계 인증이 이미 활성화되어 있습니다.{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/profile')}>
                프로필로 이동
              </Button>
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    )
  }

  // 1단계: 2FA 설정 초기화
  const handleSetup = () => {
    setupTwoFactor(undefined, {
      onSuccess: () => {
        setStep('qr')
      },
    })
  }

  // 2단계: TOTP 토큰 검증 및 활성화
  const handleVerify = () => {
    if (!verificationToken || verificationToken.length !== 6) {
      return
    }

    enableTwoFactor(verificationToken, {
      onSuccess: () => {
        setStep('backup')
      },
    })
  }

  // 백업 코드 복사
  const handleCopyBackupCodes = () => {
    if (!setupData?.backupCodes) return

    const text = setupData.backupCodes.join('\n')
    navigator.clipboard.writeText(text)
  }

  // 백업 코드 다운로드
  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return

    const text = setupData.backupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-codes-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Helmet>
        <title>2단계 인증 설정 - IDEA on Action</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold">2단계 인증 설정</h1>
              <p className="text-muted-foreground mt-2">계정 보안을 강화하세요</p>
            </div>

            {/* Step Indicator */}
            <div className="flex justify-center gap-2">
              {['initial', 'qr', 'verify', 'backup'].map((s, i) => (
                <div
                  key={s}
                  className={`h-2 w-12 rounded-full ${
                    ['initial', 'qr', 'verify', 'backup'].indexOf(step) >= i
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Initial Step */}
            {step === 'initial' && (
              <Card>
                <CardHeader>
                  <CardTitle>2단계 인증이란?</CardTitle>
                  <CardDescription>
                    로그인 시 비밀번호 외에 추가 인증을 요구하여 계정 보안을 강화합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Smartphone className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-medium">인증 앱 필요</p>
                        <p className="text-sm text-muted-foreground">
                          Google Authenticator, Authy, 1Password 등
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Key className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-medium">백업 코드 제공</p>
                        <p className="text-sm text-muted-foreground">
                          기기 분실 시 사용할 수 있는 일회용 코드
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-medium">보안 강화</p>
                        <p className="text-sm text-muted-foreground">
                          무단 접근으로부터 계정 보호
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleSetup}
                    disabled={isSettingUp}
                    className="w-full"
                    size="lg"
                  >
                    {isSettingUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        설정 중...
                      </>
                    ) : (
                      '2단계 인증 설정 시작'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* QR Code Step */}
            {step === 'qr' && setupData && (
              <Card>
                <CardHeader>
                  <CardTitle>인증 앱에 계정 추가</CardTitle>
                  <CardDescription>
                    Google Authenticator 또는 Authy로 QR 코드를 스캔하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <img
                      src={setupData.qrCode}
                      alt="2FA QR Code"
                      className="border-4 border-border rounded-lg"
                    />
                  </div>

                  {/* Manual Entry */}
                  <div>
                    <p className="text-sm font-medium mb-2">수동 입력 (QR 코드 스캔이 안 되는 경우)</p>
                    <div className="flex gap-2">
                      <Input value={setupData.secret} readOnly className="font-mono" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigator.clipboard.writeText(setupData.secret)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <Button onClick={() => setStep('verify')} className="w-full" size="lg">
                    다음 단계
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Verification Step */}
            {step === 'verify' && (
              <Card>
                <CardHeader>
                  <CardTitle>인증 코드 확인</CardTitle>
                  <CardDescription>
                    인증 앱에 표시된 6자리 코드를 입력하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="123456"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-widest"
                      autoFocus
                    />
                  </div>

                  <Button
                    onClick={handleVerify}
                    disabled={verificationToken.length !== 6 || isEnabling}
                    className="w-full"
                    size="lg"
                  >
                    {isEnabling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        인증 중...
                      </>
                    ) : (
                      '인증 코드 확인'
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setStep('qr')}
                    className="w-full"
                  >
                    이전 단계
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Backup Codes Step */}
            {step === 'backup' && setupData && (
              <Card>
                <CardHeader>
                  <CardTitle>백업 코드 저장</CardTitle>
                  <CardDescription>
                    기기 분실 시 사용할 수 있는 일회용 코드입니다. 안전한 곳에 보관하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      각 코드는 한 번만 사용할 수 있습니다. 모두 사용한 경우 프로필에서 재생성할 수 있습니다.
                    </AlertDescription>
                  </Alert>

                  {/* Backup Codes Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {setupData.backupCodes.map((code, i) => (
                      <div
                        key={i}
                        className="p-3 border rounded-lg font-mono text-center bg-muted/50"
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCopyBackupCodes}
                      className="flex-1"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      복사
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadBackupCodes}
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      다운로드
                    </Button>
                  </div>

                  <Separator />

                  <Button onClick={() => navigate('/profile')} className="w-full" size="lg">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    설정 완료
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
