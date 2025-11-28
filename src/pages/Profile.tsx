/**
 * Profile Page
 *
 * 사용자 프로필 관리 페이지
 * - 프로필 정보 조회/수정
 * - 아바타 이미지 업로드
 * - 이메일 인증
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/hooks/useAuth'
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useDeleteAvatar,
  useRequestEmailVerification,
} from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
  User,
  Mail,
  Phone,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Shield,
} from 'lucide-react'

// 폼 스키마
const profileSchema = z.object({
  full_name: z.string().min(2, '이름은 2자 이상이어야 합니다').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\d-]*$/, '올바른 전화번호 형식이 아닙니다')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500, '자기소개는 500자 이내여야 합니다').optional().or(z.literal('')),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function Profile() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  const requestVerification = useRequestEmailVerification()

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      bio: '',
    },
  })

  // 프로필 데이터로 폼 초기화
  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      })
    }
  }, [profile, form])

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: { pathname: '/profile' } } })
    }
  }, [authLoading, user, navigate])

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({
        full_name: values.full_name || null,
        phone: values.phone || null,
        bio: values.bio || null,
      })
    } catch (error) {
      console.error('Profile update error:', error)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 미리보기
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // 업로드
    try {
      await uploadAvatar.mutateAsync(file)
      setAvatarPreview(null)
    } catch (error) {
      console.error('Avatar upload error:', error)
      setAvatarPreview(null)
    }
  }

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar.mutateAsync()
    } catch (error) {
      console.error('Avatar delete error:', error)
    }
  }

  const handleRequestVerification = async () => {
    try {
      await requestVerification.mutateAsync()
    } catch (error) {
      console.error('Verification request error:', error)
    }
  }

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  // 로딩 중
  if (authLoading || profileLoading) {
    return (
      <>
        <Helmet>
          <title>프로필 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto space-y-6">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
          </main>
          <Footer />
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>프로필 | VIBE WORKING</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">프로필 설정</h1>

            {/* 프로필 이미지 */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  프로필 이미지
                </CardTitle>
                <CardDescription>
                  프로필에 표시될 이미지를 설정하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={avatarPreview || profile?.avatar_url || undefined}
                      alt={profile?.full_name || '프로필'}
                    />
                    <AvatarFallback className="text-2xl bg-primary/10">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {uploadAvatar.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <Camera className="mr-2 h-4 w-4" />
                        이미지 변경
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleAvatarChange}
                          disabled={uploadAvatar.isPending}
                        />
                      </label>
                    </Button>
                    {profile?.avatar_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteAvatar}
                        disabled={deleteAvatar.isPending}
                      >
                        {deleteAvatar.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP 형식, 5MB 이하
                  </p>
                  {uploadAvatar.isError && (
                    <p className="text-xs text-destructive">
                      {uploadAvatar.error instanceof Error
                        ? uploadAvatar.error.message
                        : '업로드에 실패했습니다.'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 이메일 인증 상태 */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  계정 인증
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{user?.email}</p>
                      <p className="text-sm text-muted-foreground">이메일 주소</p>
                    </div>
                  </div>
                  {profile?.email_verified ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      인증됨
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      미인증
                    </Badge>
                  )}
                </div>

                {!profile?.email_verified && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>이메일 인증을 완료하면 더 많은 기능을 이용할 수 있습니다.</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRequestVerification}
                        disabled={requestVerification.isPending}
                      >
                        {requestVerification.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        인증 메일 발송
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {requestVerification.isSuccess && (
                  <Alert className="border-green-600 bg-green-600/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      인증 메일이 발송되었습니다. 이메일을 확인해주세요.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* 프로필 정보 폼 */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  기본 정보
                </CardTitle>
                <CardDescription>
                  프로필에 표시될 기본 정보를 입력하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이름</FormLabel>
                          <FormControl>
                            <Input placeholder="홍길동" {...field} />
                          </FormControl>
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
                          <FormDescription>
                            서비스 이용 시 연락받을 번호를 입력하세요.
                          </FormDescription>
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
                              placeholder="간단한 자기소개를 입력하세요."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>최대 500자까지 입력 가능합니다.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                        disabled={updateProfile.isPending}
                      >
                        초기화
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateProfile.isPending || !form.formState.isDirty}
                      >
                        {updateProfile.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            저장 중...
                          </>
                        ) : (
                          '저장'
                        )}
                      </Button>
                    </div>

                    {updateProfile.isSuccess && (
                      <Alert className="border-green-600 bg-green-600/10">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription>프로필이 저장되었습니다.</AlertDescription>
                      </Alert>
                    )}

                    {updateProfile.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {updateProfile.error instanceof Error
                            ? updateProfile.error.message
                            : '저장에 실패했습니다.'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
