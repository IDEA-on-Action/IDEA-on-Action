import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TurnstileWidget } from '@/components/forms/TurnstileWidget';
import { useSubmitProductInquiry } from '@/hooks/products/useProductInquiries';
import {
  DEPLOYMENT_OPTIONS,
  PRODUCT_INQUIRY_CONSENT,
  ROLE_OPTIONS,
  TIMELINE_OPTIONS,
  USE_CASE_MIN_LENGTH,
  type ProductInquiryProductId,
} from '@/data/products/product-inquiry';

const values = <T extends readonly { value: string }[]>(options: T) =>
  options.map((option) => option.value) as [T[number]['value'], ...T[number]['value'][]];

const productInquirySchema = z.object({
  company: z.string().trim().min(1, '회사 또는 기관명을 입력해야 합니다').max(200),
  name: z.string().trim().min(1, '이름을 입력해야 합니다').max(100),
  email: z.string().trim().email('업무 메일 주소의 형식이 올바르지 않습니다').max(254),
  phone: z.string().trim().max(40).optional(),
  role: z.enum(values(ROLE_OPTIONS)).optional(),
  use_case: z
    .string()
    .trim()
    .min(USE_CASE_MIN_LENGTH, `적용하려는 업무를 ${USE_CASE_MIN_LENGTH}자 이상 입력해야 합니다`)
    .max(5000),
  deployment: z.enum(values(DEPLOYMENT_OPTIONS), { required_error: '설치 환경을 선택해야 합니다' }),
  timeline: z.enum(values(TIMELINE_OPTIONS)).optional(),
  consent: z.boolean().refine((value) => value === true, '개인정보 수집·이용에 동의해야 합니다'),
  // 숨김 입력 칸. 사람은 채우지 않습니다.
  website: z.string().optional(),
});

type ProductInquiryFormValues = z.infer<typeof productInquirySchema>;

const UNDECIDED = '확정 전';

interface ProductInquiryFormProps {
  productId: ProductInquiryProductId;
  /** Cloudflare Turnstile 사이트 키. 없으면 위젯을 그리지 않습니다 (로컬 개발용). */
  turnstileSiteKey?: string;
}

export const ProductInquiryForm = ({
  productId,
  turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY,
}: ProductInquiryFormProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);
  const { mutateAsync: submitInquiry, isPending } = useSubmitProductInquiry();

  const form = useForm<ProductInquiryFormValues>({
    resolver: zodResolver(productInquirySchema),
    defaultValues: {
      company: '',
      name: '',
      email: '',
      phone: '',
      use_case: '',
      consent: false,
      website: '',
    },
  });

  const onSubmit = async (formValues: ProductInquiryFormValues) => {
    setSubmitError(null);
    try {
      await submitInquiry({
        ...formValues,
        product_id: productId,
        turnstile_token: turnstileToken || undefined,
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '문의를 접수하지 못했습니다.');
      // 토큰은 한 번만 쓸 수 있으므로 새로 받습니다
      setTurnstileToken('');
      setTurnstileReset((count) => count + 1);
    }
  };

  if (submitted) {
    return (
      <Alert role="status">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>문의가 접수되었습니다</AlertTitle>
        <AlertDescription>입력하신 업무 메일로 접수 확인 메일을 보냈습니다.</AlertDescription>
      </Alert>
    );
  }

  const needsTurnstile = Boolean(turnstileSiteKey);
  const consent = PRODUCT_INQUIRY_CONSENT;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>회사 또는 기관명 *</FormLabel>
                <FormControl>
                  <Input autoComplete="organization" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름 *</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>업무 메일 *</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
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
                <FormLabel>연락처</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>역할</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deployment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>설치 환경 *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEPLOYMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timeline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>희망 시기</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="use_case"
          render={({ field }) => (
            <FormItem>
              <FormLabel>적용하려는 업무 *</FormLabel>
              <FormControl>
                <Textarea className="min-h-[160px] resize-y" {...field} />
              </FormControl>
              <FormDescription>
                {USE_CASE_MIN_LENGTH}자 이상 입력해야 합니다 (현재 {field.value.trim().length}자)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 숨김 입력 칸: 자동 입력 프로그램만 채웁니다 */}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="product-inquiry-website">Website</label>
          <input id="product-inquiry-website" type="text" tabIndex={-1} autoComplete="off" {...form.register('website')} />
        </div>

        <section aria-labelledby="product-inquiry-consent" className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <h3 id="product-inquiry-consent" className="text-sm font-semibold">
            개인정보 수집·이용 안내
          </h3>
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[7rem_1fr]">
            <dt className="text-muted-foreground">처리 주체</dt>
            <dd>{consent.controller ?? UNDECIDED}</dd>
            <dt className="text-muted-foreground">수집 항목</dt>
            <dd>{consent.items.join(', ')}</dd>
            <dt className="text-muted-foreground">이용 목적</dt>
            <dd>{consent.purpose ?? UNDECIDED}</dd>
            <dt className="text-muted-foreground">보유 기간</dt>
            <dd>{consent.retention ?? UNDECIDED}</dd>
          </dl>

          <FormField
            control={form.control}
            name="consent"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel className="font-normal leading-5">개인정보 수집·이용에 동의합니다 *</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {needsTurnstile && turnstileSiteKey && (
          <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} resetKey={turnstileReset} />
        )}

        {submitError && (
          <Alert variant="destructive">
            <AlertTitle>문의를 접수하지 못했습니다</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isPending || (needsTurnstile && !turnstileToken)}>
          {isPending ? '접수하는 중입니다' : '문의 보내기'}
        </Button>
      </form>
    </Form>
  );
};
