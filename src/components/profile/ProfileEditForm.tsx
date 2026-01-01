import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import type { UserProfile } from '@/types/shared/database'
import { useEffect } from 'react'

const profileSchema = z.object({
    display_name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').max(50, '이름은 최대 50자까지 가능합니다'),
    bio: z.string().max(500, '자기소개는 최대 500자까지 가능합니다').optional(),
    phone: z.string().regex(/^[0-9-+() ]*$/, '올바른 전화번호 형식이 아닙니다').optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileEditFormProps {
    profile: UserProfile | null | undefined
    onUpdate: (data: { display_name: string; bio?: string; phone?: string }) => void
    isUpdating: boolean
}

export function ProfileEditForm({ profile, onUpdate, isUpdating }: ProfileEditFormProps) {
    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            display_name: profile?.display_name || '',
            bio: profile?.bio || '',
            phone: profile?.phone || '',
        },
    })

    // Update form values when profile data loads
    useEffect(() => {
        if (profile) {
            form.reset({
                display_name: profile.display_name || '',
                bio: profile.bio || '',
                phone: profile.phone || '',
            })
        }
    }, [profile, form])

    const onSubmit = (data: ProfileFormValues) => {
        onUpdate({
            display_name: data.display_name,
            bio: data.bio || undefined,
            phone: data.phone || undefined,
        })
    }

    return (
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
    )
}
