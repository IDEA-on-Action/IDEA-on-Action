import { Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ConnectedAccount } from '@/types/shared/database'

interface ConnectedAccountsProps {
    accounts: ConnectedAccount[] | null | undefined
    onDisconnect: (accountId: string) => void
    isDisconnecting: boolean
}

export function ConnectedAccounts({ accounts, onDisconnect, isDisconnecting }: ConnectedAccountsProps) {
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

    const handleDisconnect = (accountId: string) => {
        if (confirm('이 계정 연결을 해제하시겠습니까?')) {
            onDisconnect(accountId)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>연결된 계정</CardTitle>
                <CardDescription>소셜 로그인 계정을 관리할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {accounts && accounts.length > 0 ? (
                        accounts.map((account) => (
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
                                        onClick={() => handleDisconnect(account.id)}
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
    )
}
