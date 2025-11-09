/**
 * Newsletter Form Component
 *
 * 뉴스레터 구독 폼
 * - 이메일 입력
 * - 유효성 검사
 * - 구독 신청
 */

import { useState } from 'react'
import { useSubscribeNewsletter } from '@/hooks/useNewsletter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Loader2 } from 'lucide-react'

export interface NewsletterFormProps {
  variant?: 'inline' | 'stacked'
  placeholder?: string
  buttonText?: string
  showIcon?: boolean
}

export function NewsletterForm({
  variant = 'inline',
  placeholder = '이메일 주소를 입력하세요',
  buttonText = '구독하기',
  showIcon = true,
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const subscribe = useSubscribeNewsletter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    await subscribe.mutateAsync(email)

    // 성공 시 이메일 초기화
    if (subscribe.isSuccess) {
      setEmail('')
    }
  }

  if (variant === 'stacked') {
    return (
      <form onSubmit={handleSubmit} className="space-y-3 w-full">
        <div className="relative">
          {showIcon && (
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <Input
            type="email"
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={subscribe.isPending}
            required
            className={showIcon ? 'pl-10' : ''}
          />
        </div>
        <Button
          type="submit"
          disabled={subscribe.isPending || !email.trim()}
          className="w-full"
        >
          {subscribe.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              구독 중...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </form>
    )
  }

  // Inline variant
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
      <div className="relative flex-1">
        {showIcon && (
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <Input
          type="email"
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={subscribe.isPending}
          required
          className={showIcon ? 'pl-10' : ''}
        />
      </div>
      <Button
        type="submit"
        disabled={subscribe.isPending || !email.trim()}
      >
        {subscribe.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          buttonText
        )}
      </Button>
    </form>
  )
}
