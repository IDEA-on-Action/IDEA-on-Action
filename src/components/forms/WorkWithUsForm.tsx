import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useSubmitWorkInquiry, type WorkInquiry } from '@/hooks/projects/useWorkInquiries';
import { toast } from 'sonner';

const proposalSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상 입력해주세요'),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  company: z.string().optional(),
  package: z.enum(['MVP', 'Growth', 'Custom'], {
    required_error: '패키지를 선택해주세요',
  }),
  budget: z.string().optional(),
  brief: z.string().min(50, '최소 50자 이상 입력해주세요'),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

const packageLabels = {
  MVP: 'MVP 개발 - 빠른 시장 검증',
  Growth: 'Growth 패키지 - 성장 가속화',
  Custom: 'Custom - 맞춤형 솔루션',
};

const contactLabels = {
  email: '이메일',
  phone: '전화',
  calendar: '캘린더 (미팅 예약)',
};

export const WorkWithUsForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutateAsync: submitInquiry } = useSubmitWorkInquiry();

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      package: 'MVP',
      budget: '',
      brief: '',
    },
  });

  const onSubmit = async (values: ProposalFormValues) => {
    try {
      setIsSubmitting(true);
      await submitInquiry(values as WorkInquiry);
      toast.success('문의가 접수되었습니다!', {
        description: '빠른 시일 내에 연락드리겠습니다. 감사합니다!',
      });
      form.reset();
    } catch (error) {
      console.error('제안서 제출 실패:', error);
      toast.error('제안서 전송에 실패했습니다', {
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름 *</FormLabel>
                <FormControl>
                  <Input placeholder="홍길동" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일 *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="example@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Company */}
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>회사명</FormLabel>
                <FormControl>
                  <Input placeholder="회사명 (선택)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Package */}
          <FormField
            control={form.control}
            name="package"
            render={({ field }) => (
              <FormItem>
                <FormLabel>협업 패키지 *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="패키지 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(packageLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Budget */}
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>예산</FormLabel>
                <FormControl>
                  <Input placeholder="예: 500만원 ~ 1000만원" {...field} />
                </FormControl>
                <FormDescription>대략적인 예산 범위를 입력해주세요</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preferred Contact */}
          <FormField
            control={form.control}
            name="preferred_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>선호하는 연락 방법</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="연락 방법 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(contactLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Phone (conditional) */}
        {form.watch('preferred_contact') === 'phone' && (
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>전화번호</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="010-1234-5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Brief */}
        <FormField
          control={form.control}
          name="brief"
          render={({ field }) => (
            <FormItem>
              <FormLabel>프로젝트 설명 *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="프로젝트에 대해 상세히 설명해주세요. 어떤 문제를 해결하고 싶으신가요? 목표는 무엇인가요? (최소 50자)"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormDescription>{field.value?.length || 0} / 50자</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '전송 중...' : '제안서 보내기'}
        </Button>
      </form>
    </Form>
  );
};
