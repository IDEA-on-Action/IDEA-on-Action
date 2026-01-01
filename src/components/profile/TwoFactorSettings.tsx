import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle, AlertCircle, Key, Loader2, Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import type { TwoFactorAuth } from '@/types/shared/database'

interface TwoFactorSettingsProps {
    settings: TwoFactorAuth | null | undefined
    onDisable: (password: string, options?: { onSuccess?: () => void }) => void
    isDisabling: boolean
    onRegenerateCodes: (options?: { onSuccess?: () => void }) => void
    isRegenerating: boolean
    newBackupCodes: string[] | null | undefined
}

export function TwoFactorSettings({
    settings,
    onDisable,
    isDisabling,
    onRegenerateCodes,
    isRegenerating,
    newBackupCodes,
}: TwoFactorSettingsProps) {
    const navigate = useNavigate()
    const [disableDialogOpen, setDisableDialogOpen] = useState(false)
    const [password, setPassword] = useState('')
    const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false)

    const handleDisable = () => {
        if (!password) return

        onDisable(password, {
            onSuccess: () => {
                setDisableDialogOpen(false)
                setPassword('')
            },
        })
    }

    const handleRegenerate = () => {
        if (confirm('기존 백업 코드가 모두 무효화됩니다. 계속하시겠습니까?')) {
            onRegenerateCodes({
                onSuccess: () => {
                    setBackupCodesDialogOpen(true)
                },
            })
        }
    }

    const handleCopyCodes = () => {
        if (!newBackupCodes) return
        const text = newBackupCodes.join('\n')
        navigator.clipboard.writeText(text)
    }

    const handleDownloadCodes = () => {
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

    return (
        <>
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
                    {settings?.enabled ? (
                        <>
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
                                                {settings.last_used_at
                                                    ? new Date(settings.last_used_at).toLocaleString('ko-KR')
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
                                                {settings.backup_codes?.length || 0}개 남음
                                                {settings.backup_codes_used > 0 &&
                                                    ` (${settings.backup_codes_used}개 사용됨)`}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRegenerate}
                                        disabled={isRegenerating}
                                    >
                                        {isRegenerating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                생성 중...
                                            </>
                                        ) : (
                                            '재생성'
                                        )}
                                    </Button>
                                </div>

                                <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
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
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={handleDisable}
                                                    disabled={!password || isDisabling}
                                                    variant="destructive"
                                                    className="flex-1"
                                                >
                                                    {isDisabling ? (
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
                                                        setDisableDialogOpen(false)
                                                        setPassword('')
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
                                    <Button variant="outline" onClick={handleCopyCodes} className="flex-1">
                                        <Copy className="mr-2 h-4 w-4" />
                                        복사
                                    </Button>
                                    <Button variant="outline" onClick={handleDownloadCodes} className="flex-1">
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
        </>
    )
}
