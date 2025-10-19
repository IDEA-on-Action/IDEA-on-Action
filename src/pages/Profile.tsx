/**
 * Profile Page
 *
 * 사용자 프로필 관리 페이지
 * - 프로필 정보 조회/수정
 * - 아바타 업로드
 * - 연결된 계정 관리
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, useUpdateProfile, useUploadAvatar, useConnectedAccounts, useDisconnectAccount } from '@/hooks/useProfile'
import { use2FASettings, useDisable2FA, useRegenerateBackupCodes } from '@/hooks/use2FA'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

import {
  UserIcon,
  MailIcon,
  CalendarIcon,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle,
  Link2,
  Unlink,
  Shield,
  Key,
  Download,
  Copy,
} from 'lucide-react'

// ===================================================================
// Zod Schema
// ===================================================================

const profileSchema = z.object({
  display_name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').max(50, '이름은 최대 50자까지 가능합니다'),
  bio: z.string().max(500, '자기소개는 최대 500자까지 가능합니다').optional(),
  phone: z.string().regex(/^[0-9-+() ]*$/, '올바른 전화번호 형식이 아닙니다').optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

// ===================================================================
// Component
// ===================================================================

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: connectedAccounts } = useConnectedAccounts()
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile()
  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar()
  const { mutate: disconnectAccount, isPending: isDisconnecting } = useDisconnectAccount()

  // 2FA
  const { data: twoFactorSettings } = use2FASettings()
  const { mutate: disable2FA, isPending: isDisabling2FA } = useDisable2FA()
  const { mutate: regenerateBackupCodes, isPending: isRegeneratingCodes, data: newBackupCodes } = useRegenerateBackupCodes()

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [disable2FADialogOpen, setDisable2FADialogOpen] = useState(false)
  const [disable2FAPassword, setDisable2FAPassword] = useState('')
  const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      phone: profile?.phone || '',
    },
    values: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      phone: profile?.phone || '',
    },
  })

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

  // 프로필 수정 핸들러
  const onSubmit = (data: ProfileFormValues) => {
    updateProfile({
      display_name: data.display_name,
      bio: data.bio || undefined,
      phone: data.phone || undefined,
    })
  }

  // 아바타 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    // 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 아바타 업로드 핸들러
  const handleAvatarUpload = () => {
    if (!selectedFile) return

    uploadAvatar(selectedFile, {
      onSuccess: () => {
        setAvatarDialogOpen(false)
        setSelectedFile(null)
        setPreviewUrl(null)
      },
    })
  }

  // 계정 연결 해제 핸들러
  const handleDisconnectAccount = (accountId: string) => {
    if (confirm('이 계정 연결을 해제하시겠습니까?')) {
      disconnectAccount(accountId)
    }
  }

  // 2FA 비활성화 핸들러
  const handleDisable2FA = () => {
    if (!disable2FAPassword) return

    disable2FA(disable2FAPassword, {
      onSuccess: () => {
        setDisable2FADialogOpen(false)
        setDisable2FAPassword('')
      },
    })
  }

  // 백업 코드 재생성 핸들러
  const handleRegenerateBackupCodes = () => {
    if (confirm('기존 백업 코드가 모두 무효화됩니다. 계속하시겠습니까?')) {
      regenerateBackupCodes(undefined, {
        onSuccess: () => {
          setBackupCodesDialogOpen(true)
        },
      })
    }
  }

  // 백업 코드 복사
  const handleCopyBackupCodes = () => {
    if (!newBackupCodes) return
    const text = newBackupCodes.join('\n')
    navigator.clipboard.writeText(text)
  }

  // 백업 코드 다운로드
  const handleDownloadBackupCodes = () => {
    if (!newBackupCodes) return
    const text = newBackupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-codes-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // OAuth 제공자 아이콘
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '🔴'
      case 'github':
        return '⚫'
      case 'kakao':
        return '🟡'
      case 'microsoft':
        return '🟦'
      case 'apple':
        return '⚫'
      default:
        return '🔗'
    }
  }

  return (
    <>
      <Helmet>
        <title>프로필 - IDEA on Action</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* 프로필 헤더 */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || 'User'} />
                      <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                        {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || <UserIcon className="h-12 w-12" />}
                      </AvatarFallback>
                    </Avatar>

                    <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>프로필 사진 변경</DialogTitle>
                          <DialogDescription>
                            JPG, PNG, WEBP 형식, 최대 5MB
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          {previewUrl && (
                            <div className="flex justify-center">
                              <Avatar className="h-32 w-32">
                                <AvatarImage src={previewUrl} />
                              </Avatar>
                            </div>
                          )}

                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileSelect}
                          />

                          <div className="flex gap-2">
                            <Button
                              onClick={handleAvatarUpload}
                              disabled={!selectedFile || isUploading}
                              className="flex-1"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  업로드 중...
                                </>
                              ) : (
                                '업로드'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setAvatarDialogOpen(false)}
                              disabled={isUploading}
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="flex-1">
                    <CardTitle className="text-2xl">{profile?.display_name || user.email}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MailIcon className="h-4 w-4" />
                      {user.email}
                      {profile?.email_verified && (
                        <Badge variant="secondary" className="ml-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          인증됨
                        </Badge>
                      )}
                    </CardDescription>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <CalendarIcon className="h-4 w-4" />
                      가입일: {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* 프로필 편집 */}
            <Card>
              <CardHeader>
                <CardTitle>프로필 정보</CardTitle>
                <CardDescription>공개 프로필 정보를 수정할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>표시 이름</FormLabel>
                          <FormControl>
                            <Input placeholder="홍길동" {...field} />
                          </FormControl>
                          <FormDescription>다른 사용자에게 표시되는 이름입니다</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>자기소개</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="간단한 자기소개를 입력하세요"
                              className="resize-none"
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>최대 500자</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>전화번호</FormLabel>
                          <FormControl>
                            <Input placeholder="010-1234-5678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            저장 중...
                          </>
                        ) : (
                          '변경사항 저장'
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => form.reset()}>
                        취소
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* 연결된 계정 */}
            <Card>
              <CardHeader>
                <CardTitle>연결된 계정</CardTitle>
                <CardDescription>소셜 로그인 계정을 관리할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {connectedAccounts && connectedAccounts.length > 0 ? (
                    connectedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getProviderIcon(account.provider)}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{account.provider}</span>
                              {account.is_primary && (
                                <Badge variant="default">주 계정</Badge>
                              )}
                            </div>
                            {account.provider_account_email && (
                              <p className="text-sm text-muted-foreground">
                                {account.provider_account_email}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              연결일: {new Date(account.connected_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>

                        {!account.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnectAccount(account.id)}
                            disabled={isDisconnecting}
                          >
                            <Unlink className="h-4 w-4 mr-1" />
                            연결 해제
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      연결된 계정이 없습니다
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2단계 인증 (2FA) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  2단계 인증 (2FA)
                </CardTitle>
                <CardDescription>
                  TOTP 기반 2단계 인증으로 계정을 보호하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {twoFactorSettings?.enabled ? (
                  <>
                    {/* 2FA 활성화 상태 */}
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        2단계 인증이 활성화되어 있습니다.
                      </AlertDescription>
                    </Alert>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">활성화됨</p>
                            <p className="text-xs text-muted-foreground">
                              마지막 사용:{' '}
                              {twoFactorSettings.last_used_at
                                ? new Date(twoFactorSettings.last_used_at).toLocaleString('ko-KR')
                                : '없음'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">백업 코드</p>
                            <p className="text-xs text-muted-foreground">
                              {twoFactorSettings.backup_codes?.length || 0}개 남음
                              {twoFactorSettings.backup_codes_used > 0 &&
                                ` (${twoFactorSettings.backup_codes_used}개 사용됨)`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerateBackupCodes}
                          disabled={isRegeneratingCodes}
                        >
                          {isRegeneratingCodes ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              생성 중...
                            </>
                          ) : (
                            '재생성'
                          )}
                        </Button>
                      </div>

                      <Dialog open={disable2FADialogOpen} onOpenChange={setDisable2FADialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            2FA 비활성화
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>2FA 비활성화</DialogTitle>
                            <DialogDescription>
                              보안을 위해 비밀번호를 입력하세요
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              type="password"
                              placeholder="비밀번호"
                              value={disable2FAPassword}
                              onChange={(e) => setDisable2FAPassword(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={handleDisable2FA}
                                disabled={!disable2FAPassword || isDisabling2FA}
                                variant="destructive"
                                className="flex-1"
                              >
                                {isDisabling2FA ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    비활성화 중...
                                  </>
                                ) : (
                                  '비활성화'
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setDisable2FADialogOpen(false)
                                  setDisable2FAPassword('')
                                }}
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 2FA 비활성화 상태 */}
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        2단계 인증이 비활성화되어 있습니다. 계정 보안을 강화하려면 활성화하세요.
                      </AlertDescription>
                    </Alert>

                    <Button onClick={() => navigate('/2fa/setup')} className="w-full">
                      <Shield className="mr-2 h-4 w-4" />
                      2FA 활성화
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 백업 코드 표시 다이얼로그 */}
            <Dialog open={backupCodesDialogOpen} onOpenChange={setBackupCodesDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 백업 코드</DialogTitle>
                  <DialogDescription>
                    이 코드는 다시 표시되지 않습니다. 안전한 곳에 저장하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {newBackupCodes && (
                    <>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {newBackupCodes.map((code, i) => (
                          <div
                            key={i}
                            className="p-3 border rounded-lg font-mono text-center bg-muted/50"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleCopyBackupCodes} className="flex-1">
                          <Copy className="mr-2 h-4 w-4" />
                          복사
                        </Button>
                        <Button variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
                          <Download className="mr-2 h-4 w-4" />
                          다운로드
                        </Button>
                      </div>
                    </>
                  )}
                  <Button onClick={() => setBackupCodesDialogOpen(false)} className="w-full">
                    확인
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* 빠른 액션 */}
            <Card>
              <CardHeader>
                <CardTitle>계정 관리</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate('/orders')}>
                  내 주문 보기
                </Button>
                <Button variant="outline" onClick={signOut}>
                  로그아웃
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
