/**
 * IntegrationForm Component
 *
 * 연동 생성/수정 폼 컴포넌트
 * - 연동 유형별 설정 필드
 * - 유효성 검사
 * - 서비스 연결 (선택)
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useServices } from '@/hooks/useServicesPlatform';
import {
  useCreateIntegration,
  useUpdateIntegration,
} from '@/hooks/useIntegrations';
import type {
  ServiceIntegrationWithService,
  IntegrationType,
  AuthType,
  CreateIntegrationInput,
  UpdateIntegrationInput,
} from '@/types/integrations/integrations';
import { INTEGRATION_TYPE_INFO } from '@/types/integrations/integrations';

// ============================================================================
// Form Schema
// ============================================================================

const integrationSchema = z.object({
  name: z.string().min(1, '연동 이름을 입력하세요'),
  integration_type: z.enum([
    'notion',
    'github',
    'slack',
    'google_calendar',
    'stripe',
    'custom',
  ]),
  service_id: z.string().optional(),
  external_id: z.string().optional(),
  external_url: z.string().url('올바른 URL을 입력하세요').optional().or(z.literal('')),
  auth_type: z.enum(['api_key', 'oauth2', 'webhook', 'none']),
  credentials_key: z.string().optional(),
  health_check_url: z.string().url('올바른 URL을 입력하세요').optional().or(z.literal('')),
  is_bidirectional: z.boolean(),
  // Type-specific config fields
  config_workspace_id: z.string().optional(),
  config_page_id: z.string().optional(),
  config_database_id: z.string().optional(),
  config_owner: z.string().optional(),
  config_repo: z.string().optional(),
  config_branch: z.string().optional(),
  config_channel_id: z.string().optional(),
  config_endpoint: z.string().optional(),
});

type IntegrationFormValues = z.infer<typeof integrationSchema>;

// ============================================================================
// Props
// ============================================================================

interface IntegrationFormProps {
  integration?: ServiceIntegrationWithService | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function IntegrationForm({
  integration,
  onSuccess,
  onCancel,
}: IntegrationFormProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<IntegrationType>(
    integration?.integration_type || 'notion'
  );

  // Queries
  const { data: services } = useServices();

  // Mutations
  const createMutation = useCreateIntegration();
  const updateMutation = useUpdateIntegration();

  // Form setup
  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: integration?.name || '',
      integration_type: integration?.integration_type || 'notion',
      service_id: integration?.service_id || undefined,
      external_id: integration?.external_id || '',
      external_url: integration?.external_url || '',
      auth_type: integration?.auth_type || 'api_key',
      credentials_key: integration?.credentials_key || '',
      health_check_url: integration?.health_check_url || '',
      is_bidirectional: integration?.is_bidirectional || false,
      // Extract config fields
      config_workspace_id: (integration?.config as Record<string, string>)?.workspace_id || '',
      config_page_id: (integration?.config as Record<string, string>)?.page_id || '',
      config_database_id: (integration?.config as Record<string, string>)?.database_id || '',
      config_owner: (integration?.config as Record<string, string>)?.owner || '',
      config_repo: (integration?.config as Record<string, string>)?.repo || '',
      config_branch: (integration?.config as Record<string, string>)?.branch || 'main',
      config_channel_id: (integration?.config as Record<string, string>)?.channel_id || '',
      config_endpoint: (integration?.config as Record<string, string>)?.endpoint || '',
    },
  });

  // Watch integration type for conditional fields
  const integrationType = form.watch('integration_type');

  useEffect(() => {
    setSelectedType(integrationType as IntegrationType);
  }, [integrationType]);

  // Build config object based on type
  const buildConfig = (values: IntegrationFormValues) => {
    switch (values.integration_type) {
      case 'notion':
        return {
          workspace_id: values.config_workspace_id || undefined,
          page_id: values.config_page_id || undefined,
          database_id: values.config_database_id || undefined,
        };
      case 'github':
        return {
          owner: values.config_owner || undefined,
          repo: values.config_repo || undefined,
          branch: values.config_branch || 'main',
        };
      case 'slack':
        return {
          channel_id: values.config_channel_id || undefined,
        };
      case 'custom':
        return {
          endpoint: values.config_endpoint || undefined,
        };
      default:
        return {};
    }
  };

  // Submit handler
  const onSubmit = async (values: IntegrationFormValues) => {
    try {
      const config = buildConfig(values);

      if (integration) {
        // Update existing
        const input: UpdateIntegrationInput & { id: string } = {
          id: integration.id,
          name: values.name,
          external_id: values.external_id || undefined,
          external_url: values.external_url || undefined,
          auth_type: values.auth_type,
          credentials_key: values.credentials_key || undefined,
          health_check_url: values.health_check_url || undefined,
          is_bidirectional: values.is_bidirectional,
          config,
        };

        await updateMutation.mutateAsync(input);
        toast({
          title: '연동 수정 완료',
          description: '연동 설정이 업데이트되었습니다.',
        });
      } else {
        // Create new
        const input: CreateIntegrationInput = {
          name: values.name,
          integration_type: values.integration_type,
          service_id: values.service_id || undefined,
          external_id: values.external_id || undefined,
          external_url: values.external_url || undefined,
          auth_type: values.auth_type,
          credentials_key: values.credentials_key || undefined,
          health_check_url: values.health_check_url || undefined,
          is_bidirectional: values.is_bidirectional,
          config,
        };

        await createMutation.mutateAsync(input);
        toast({
          title: '연동 생성 완료',
          description: '새 연동이 추가되었습니다.',
        });
      }

      onSuccess();
    } catch (error) {
      toast({
        title: integration ? '연동 수정 실패' : '연동 생성 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>연동 이름 *</FormLabel>
                <FormControl>
                  <Input placeholder="예: 메인 Notion 워크스페이스" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="integration_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>연동 유형 *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!!integration} // Can't change type after creation
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="연동 유형 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(INTEGRATION_TYPE_INFO).map((info) => (
                      <SelectItem key={info.type} value={info.type}>
                        {info.name} - {info.description_ko}
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
            name="service_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>연결할 서비스 (선택)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="서비스 선택 (선택사항)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  특정 서비스와 연동을 연결합니다.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Type-specific Config Fields */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-medium">
            {INTEGRATION_TYPE_INFO[selectedType]?.name} 설정
          </h3>

          {/* Notion Config */}
          {selectedType === 'notion' && (
            <>
              <FormField
                control={form.control}
                name="config_workspace_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace ID</FormLabel>
                    <FormControl>
                      <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config_page_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page ID</FormLabel>
                    <FormControl>
                      <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config_database_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database ID</FormLabel>
                    <FormControl>
                      <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* GitHub Config */}
          {selectedType === 'github' && (
            <>
              <FormField
                control={form.control}
                name="config_owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner (사용자/조직)</FormLabel>
                    <FormControl>
                      <Input placeholder="예: IDEA-on-Action" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config_repo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository</FormLabel>
                    <FormControl>
                      <Input placeholder="예: idea-on-action" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config_branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <FormControl>
                      <Input placeholder="main" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Slack Config */}
          {selectedType === 'slack' && (
            <FormField
              control={form.control}
              name="config_channel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel ID</FormLabel>
                  <FormControl>
                    <Input placeholder="C01XXXXXXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Custom Config */}
          {selectedType === 'custom' && (
            <FormField
              control={form.control}
              name="config_endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.example.com/webhook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* External URL & ID */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-medium">외부 연결 정보</h3>

          <FormField
            control={form.control}
            name="external_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>외부 ID</FormLabel>
                <FormControl>
                  <Input placeholder="외부 서비스의 고유 ID" {...field} />
                </FormControl>
                <FormDescription>
                  Notion 페이지 ID, GitHub 저장소 이름 등
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="external_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>외부 URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormDescription>
                  외부 서비스로 바로 이동할 수 있는 URL
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Auth Settings */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-medium">인증 설정</h3>

          <FormField
            control={form.control}
            name="auth_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>인증 방식</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="none">인증 없음</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="credentials_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>인증 정보 키</FormLabel>
                <FormControl>
                  <Input placeholder="예: NOTION_API_KEY" {...field} />
                </FormControl>
                <FormDescription>
                  환경변수 또는 Vault의 키 이름
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Health Check */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-medium">상태 모니터링</h3>

          <FormField
            control={form.control}
            name="health_check_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Health Check URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormDescription>
                  연동 상태를 확인할 URL (선택)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_bidirectional"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">양방향 동기화</FormLabel>
                  <FormDescription>
                    변경 사항을 양방향으로 동기화합니다.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {integration ? '수정' : '생성'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
