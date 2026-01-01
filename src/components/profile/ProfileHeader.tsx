import { useState } from 'react'
import { UserIcon, MailIcon, CalendarIcon, Camera, CheckCircle, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { UserProfile } from '@/types/shared/database'

/**
 * 인증된 사용자 타입 (Workers API 호환)
 */
interface AuthUser {
    id: string
    email?: string | null
    created_at: string
}

interface ProfileHeaderProps {
    user: AuthUser
    profile: UserProfile | null | undefined
    onUploadAvatar: (file: File, options?: { onSuccess?: () => void }) => void
    isUploading: boolean
}

export function ProfileHeader({ user, profile, onUploadAvatar, isUploading }: ProfileHeaderProps) {
    const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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

    const handleAvatarUpload = () => {
        if (!selectedFile) return

        onUploadAvatar(selectedFile, {
            onSuccess: () => {
                setAvatarDialogOpen(false)
                setSelectedFile(null)
                setPreviewUrl(null)
            },
        })
    }

    return (
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
    )
}
