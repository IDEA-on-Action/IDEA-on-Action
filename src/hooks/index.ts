/**
 * Hooks Barrel Export
 *
 * 서브폴더로 재구성된 hooks를 하위 호환성을 위해 re-export
 * @see Phase 1-2 프로젝트 구조 정리
 */

// ============================================================================
// Auth
// ============================================================================
export { use2FA } from './auth/use2FA';
export { useAdmins } from './auth/useAdmins';
export { useAuth } from './auth/useAuth';
export { useIsAdmin } from './auth/useIsAdmin';
export { useOAuthClient } from './auth/useOAuthClient';
export { usePermissions } from './auth/usePermissions';
export { useProfile } from './auth/useProfile';
export { useProfileSync } from './auth/useProfileSync';
export { useRBAC } from './auth/useRBAC';
export { useTokenRotation } from './auth/useTokenRotation';

// ============================================================================
// AI
// ============================================================================
export { useChat } from './ai/useChat';
export { useClaudeChat } from './ai/useClaudeChat';
export { useClaudeChatWithRAG } from './ai/useClaudeChatWithRAG';
export { useClaudeSkill } from './ai/useClaudeSkill';
export { useClaudeStreaming } from './ai/useClaudeStreaming';
export { useClaudeTools } from './ai/useClaudeTools';
export { useClaudeVision } from './ai/useClaudeVision';
export { useConversationManager } from './ai/useConversationManager';
export { usePromptTemplates } from './ai/usePromptTemplates';
export { useRAGDocuments } from './ai/useRAGDocuments';
export { useRAGHybridSearch } from './ai/useRAGHybridSearch';
export { useRAGSearch } from './ai/useRAGSearch';

// ============================================================================
// Analytics
// ============================================================================
export { useAnalyticsEvents } from './analytics/useAnalyticsEvents';
export { useAuditLogs } from './analytics/useAuditLogs';
export { useD1Monitoring } from './analytics/useD1Monitoring';
export { useLogs } from './analytics/useLogs';

// ============================================================================
// CMS
// ============================================================================
export { useBlogCategories } from './cms/useBlogCategories';
export { useBlogPosts } from './cms/useBlogPosts';
export { useChangelog } from './cms/useChangelog';
export { useLabItems } from './cms/useLabItems';
export { useNotices } from './cms/useNotices';
export { usePortfolioItems } from './cms/usePortfolioItems';
export { useTags } from './cms/useTags';

// ============================================================================
// Content
// ============================================================================
export { useContentVersions } from './content/useContentVersions';
export { useDocumentHistory } from './content/useDocumentHistory';
export { useRichTextEditor } from './content/useRichTextEditor';
export { useTemplateEditor } from './content/useTemplateEditor';
export { useTemplateVersions } from './content/useTemplateVersions';
export { useVersionControl } from './content/useVersionControl';

// ============================================================================
// Documents
// ============================================================================
export { useDocxGenerate } from './documents/useDocxGenerate';
export { usePDFGenerate } from './documents/usePDFGenerate';
export { usePptxGenerate } from './documents/usePptxGenerate';
export { useSkillExport } from './documents/useSkillExport';
export { useXlsxChart } from './documents/useXlsxChart';
export { useXlsxExport } from './documents/useXlsxExport';
export { useXlsxImport } from './documents/useXlsxImport';

// ============================================================================
// Integrations
// ============================================================================
export { useGitHubStats } from './integrations/useGitHubStats';
export { useIntegrations } from './integrations/useIntegrations';
export { useMCPAuth } from './integrations/useMCPAuth';
export { useMCPClient } from './integrations/useMCPClient';
export { useMCPPermission } from './integrations/useMCPPermission';
export { useMCPSync } from './integrations/useMCPSync';
export { useMCPToken } from './integrations/useMCPToken';
export { useMinuSandbox } from './integrations/useMinuSandbox';
export { useMinuSSO } from './integrations/useMinuSSO';
export { useWordPressPosts } from './integrations/useWordPressPosts';

// ============================================================================
// Media
// ============================================================================
export { useFileUpload } from './media/useFileUpload';
export { useMediaLibrary } from './media/useMediaLibrary';
export { useMediaList } from './media/useMediaList';
export { useMediaUpload } from './media/useMediaUpload';
export { useR2Storage } from './media/useR2Storage';
export { useStorageUrl } from './media/useStorageUrl';

// ============================================================================
// Newsletter
// ============================================================================
export { useNewsletter } from './newsletter/useNewsletter';
export { useNewsletterAdmin } from './newsletter/useNewsletterAdmin';
export { useNewsletterArchive } from './newsletter/useNewsletterArchive';
export { useNewsletterDrafts } from './newsletter/useNewsletterDrafts';

// ============================================================================
// Payments
// ============================================================================
export { useCart } from './payments/useCart';
export { useKakaoPay } from './payments/useKakaoPay';
export { useOrders } from './payments/useOrders';
export { usePayment } from './payments/usePayment';
export { useRevenue } from './payments/useRevenue';
export { useTossPay } from './payments/useTossPay';

// ============================================================================
// Projects
// ============================================================================
export { useBounties } from './projects/useBounties';
export { useProjects } from './projects/useProjects';
export { useProjectTypes } from './projects/useProjectTypes';
export { useProposals } from './projects/useProposals';
export { useRoadmap } from './projects/useRoadmap';
export { useRoadmapItems } from './projects/useRoadmapItems';
export { useWorkInquiries } from './projects/useWorkInquiries';

// ============================================================================
// Realtime
// ============================================================================
export { useAlertSettings } from './realtime/useAlertSettings';
export { useAlertSubscriptions } from './realtime/useAlertSubscriptions';
export { useNotifications } from './realtime/useNotifications';
export { useRealtimeDashboard } from './realtime/useRealtimeDashboard';
export { useRealtimeEventStream } from './realtime/useRealtimeEventStream';
export { useRealtimeServiceStatus } from './realtime/useRealtimeServiceStatus';
export { useRealtimeSubscription } from './realtime/useRealtimeSubscription';

// ============================================================================
// Services
// ============================================================================
export { useServiceEvents } from './services/useServiceEvents';
export { useServiceHealth } from './services/useServiceHealth';
export { useServiceIssues } from './services/useServiceIssues';
export { useServices } from './services/useServices';
export { useServicesPlatform } from './services/useServicesPlatform';

// ============================================================================
// Subscription
// ============================================================================
export { useBillingPortal } from './subscription/useBillingPortal';
export { useCanAccess } from './subscription/useCanAccess';
export { useSubscriptions } from './subscription/useSubscriptions';
export { useSubscriptionUsage } from './subscription/useSubscriptionUsage';

// ============================================================================
// Teams
// ============================================================================
export { useTeamMembers } from './teams/useTeamMembers';
export { useTeamMembership } from './teams/useTeamMembership';
export { useTeams } from './teams/useTeams';

// ============================================================================
// Utility Hooks (루트 레벨)
// ============================================================================
export { useA2UI } from './useA2UI';
export { useCRUD } from './useCRUD';
export { useDateRange } from './useDateRange';
export { useDebounce } from './useDebounce';
export { useMediaQuery } from './useMediaQuery';
export { usePageContext } from './usePageContext';
export { useSearch } from './useSearch';
export { useTheme } from './useTheme';
export { useToast } from './useToast';
