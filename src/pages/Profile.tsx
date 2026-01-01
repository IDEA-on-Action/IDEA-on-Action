/**
 * Profile Page
 *
 * 사용자 프로필 관리 페이지
 * - 프로필 정보 조회/수정
 * - 아바타 업로드
 * - 연결된 계정 관리
 */

import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/hooks/auth/useAuth'
import { useProfile, useUpdateProfile, useUploadAvatar, useConnectedAccounts, useDisconnectAccount } from '@/hooks/auth/useProfile'
import { use2FASettings, useDisable2FA, useRegenerateBackupCodes } from '@/hooks/auth/use2FA'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { ConnectedAccounts } from '@/components/profile/ConnectedAccounts'
import { TwoFactorSettings } from '@/components/profile/TwoFactorSettings'
import { AccountActions } from '@/components/profile/AccountActions'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const { data: connectedAccounts } = useConnectedAccounts()
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile()
  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar()
  const { mutate: disconnectAccount, isPending: isDisconnecting } = useDisconnectAccount()

  // 2FA
  const { data: twoFactorSettings } = use2FASettings()
  const { mutate: disable2FA, isPending: isDisabling2FA } = useDisable2FA()
  const { mutate: regenerateBackupCodes, isPending: isRegeneratingCodes, data: newBackupCodes } = useRegenerateBackupCodes()

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
            <ProfileHeader
              user={user}
              profile={profile}
              onUploadAvatar={uploadAvatar}
              isUploading={isUploading}
            />

            {/* 프로필 편집 */}
            <ProfileEditForm
              profile={profile}
              onUpdate={updateProfile}
              isUpdating={isUpdating}
            />

            {/* 연결된 계정 */}
            <ConnectedAccounts
              accounts={connectedAccounts}
              onDisconnect={disconnectAccount}
              isDisconnecting={isDisconnecting}
            />

            {/* 2단계 인증 (2FA) */}
            <TwoFactorSettings
              settings={twoFactorSettings}
              onDisable={disable2FA}
              isDisabling={isDisabling2FA}
              onRegenerateCodes={(options) => regenerateBackupCodes(undefined, options)}
              isRegenerating={isRegeneratingCodes}
              newBackupCodes={newBackupCodes}
            />

            {/* 빠른 액션 */}
            <AccountActions onSignOut={signOut} />
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
