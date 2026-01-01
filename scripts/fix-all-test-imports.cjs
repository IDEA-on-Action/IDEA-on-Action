const fs = require('fs');
const path = require('path');

// 훅 경로 매핑 (구 경로 -> 신규 경로)
const hookMappings = {
  // auth
  'use2FA': 'auth/use2FA',
  'useIsAdmin': 'auth/useIsAdmin',
  'useOAuthClient': 'auth/useOAuthClient',
  'usePermissions': 'auth/usePermissions',
  'useProfile': 'auth/useProfile',
  'useRBAC': 'auth/useRBAC',
  'useAdmins': 'auth/useAdmins',
  // ai
  'useChat': 'ai/useChat',
  'useClaudeChat': 'ai/useClaudeChat',
  'useClaudeChatWithRAG': 'ai/useClaudeChatWithRAG',
  'useClaudeSkill': 'ai/useClaudeSkill',
  'useClaudeStreaming': 'ai/useClaudeStreaming',
  'useClaudeTools': 'ai/useClaudeTools',
  'useClaudeVision': 'ai/useClaudeVision',
  'useConversationManager': 'ai/useConversationManager',
  'usePromptTemplates': 'ai/usePromptTemplates',
  'useRAGDocuments': 'ai/useRAGDocuments',
  'useRAGHybridSearch': 'ai/useRAGHybridSearch',
  'useRAGSearch': 'ai/useRAGSearch',
  // analytics
  'useAnalyticsEvents': 'analytics/useAnalyticsEvents',
  'useAuditLogs': 'analytics/useAuditLogs',
  'useLogs': 'analytics/useLogs',
  'useD1Monitoring': 'analytics/useD1Monitoring',
  // cms
  'useBlogCategories': 'cms/useBlogCategories',
  'useBlogPosts': 'cms/useBlogPosts',
  'useChangelog': 'cms/useChangelog',
  'useNotices': 'cms/useNotices',
  'usePortfolioItems': 'cms/usePortfolioItems',
  'useTags': 'cms/useTags',
  'useLabItems': 'cms/useLabItems',
  // content
  'useContentVersions': 'content/useContentVersions',
  'useDocumentHistory': 'content/useDocumentHistory',
  'useRichTextEditor': 'content/useRichTextEditor',
  'useTemplateEditor': 'content/useTemplateEditor',
  'useTemplateVersions': 'content/useTemplateVersions',
  'useVersionControl': 'content/useVersionControl',
  // documents
  'useDocxGenerate': 'documents/useDocxGenerate',
  'usePDFGenerate': 'documents/usePDFGenerate',
  'usePptxGenerate': 'documents/usePptxGenerate',
  'useSkillExport': 'documents/useSkillExport',
  'useXlsxChart': 'documents/useXlsxChart',
  'useXlsxExport': 'documents/useXlsxExport',
  'useXlsxImport': 'documents/useXlsxImport',
  // integrations
  'useIntegrations': 'integrations/useIntegrations',
  'useMCPAuth': 'integrations/useMCPAuth',
  'useMCPClient': 'integrations/useMCPClient',
  'useMCPPermission': 'integrations/useMCPPermission',
  'useMCPSync': 'integrations/useMCPSync',
  'useMCPToken': 'integrations/useMCPToken',
  'useMinuSSO': 'integrations/useMinuSSO',
  'useWordPressPosts': 'integrations/useWordPressPosts',
  'useGitHubStats': 'integrations/useGitHubStats',
  // media
  'useFileUpload': 'media/useFileUpload',
  'useMediaLibrary': 'media/useMediaLibrary',
  'useMediaList': 'media/useMediaList',
  'useMediaUpload': 'media/useMediaUpload',
  'useR2Storage': 'media/useR2Storage',
  'useStorageUrl': 'media/useStorageUrl',
  // newsletter
  'useNewsletter': 'newsletter/useNewsletter',
  'useNewsletterAdmin': 'newsletter/useNewsletterAdmin',
  'useNewsletterArchive': 'newsletter/useNewsletterArchive',
  'useNewsletterDrafts': 'newsletter/useNewsletterDrafts',
  // payments
  'useCart': 'payments/useCart',
  'useKakaoPay': 'payments/useKakaoPay',
  'useOrders': 'payments/useOrders',
  'usePayment': 'payments/usePayment',
  'useRevenue': 'payments/useRevenue',
  'useTossPay': 'payments/useTossPay',
  // projects
  'useBounties': 'projects/useBounties',
  'useProjects': 'projects/useProjects',
  'useProjectTypes': 'projects/useProjectTypes',
  'useProposals': 'projects/useProposals',
  'useRoadmap': 'projects/useRoadmap',
  'useRoadmapItems': 'projects/useRoadmapItems',
  'useWorkInquiries': 'projects/useWorkInquiries',
  // realtime
  'useAlertSettings': 'realtime/useAlertSettings',
  'useAlertSubscriptions': 'realtime/useAlertSubscriptions',
  'useNotifications': 'realtime/useNotifications',
  'useRealtimeDashboard': 'realtime/useRealtimeDashboard',
  'useRealtimeEventStream': 'realtime/useRealtimeEventStream',
  'useRealtimeServiceStatus': 'realtime/useRealtimeServiceStatus',
  'useRealtimeSubscription': 'realtime/useRealtimeSubscription',
  // services
  'useServiceEvents': 'services/useServiceEvents',
  'useServiceHealth': 'services/useServiceHealth',
  'useServiceIssues': 'services/useServiceIssues',
  'useServices': 'services/useServices',
  'useServicesPlatform': 'services/useServicesPlatform',
  // subscription
  'useBillingPortal': 'subscription/useBillingPortal',
  'useCanAccess': 'subscription/useCanAccess',
  'useSubscriptions': 'subscription/useSubscriptions',
  'useSubscriptionUsage': 'subscription/useSubscriptionUsage',
  // teams
  'useTeamMembers': 'teams/useTeamMembers',
  'useTeamMembership': 'teams/useTeamMembership',
  'useTeams': 'teams/useTeams',
};

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

let modifiedCount = 0;
let modifiedFiles = [];

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let modified = false;

  // 각 훅에 대해 경로 변경
  Object.entries(hookMappings).forEach(([hookName, newPath]) => {
    // 이미 올바른 경로면 스킵
    if (content.includes(`@/hooks/${newPath}'`) || content.includes(`@/hooks/${newPath}"`)) {
      return;
    }

    // 다양한 패턴 처리
    const patterns = [
      [`from '@/hooks/${hookName}'`, `from '@/hooks/${newPath}'`],
      [`from "@/hooks/${hookName}"`, `from "@/hooks/${newPath}"`],
      [`vi.mock('@/hooks/${hookName}'`, `vi.mock('@/hooks/${newPath}'`],
      [`vi.mock("@/hooks/${hookName}"`, `vi.mock("@/hooks/${newPath}"`],
      [`vi.unmock('@/hooks/${hookName}'`, `vi.unmock('@/hooks/${newPath}'`],
      [`import('@/hooks/${hookName}')`, `import('@/hooks/${newPath}')`],
    ];

    patterns.forEach(([oldPattern, newPattern]) => {
      if (content.includes(oldPattern)) {
        content = content.split(oldPattern).join(newPattern);
        modified = true;
      }
    });
  });

  if (modified) {
    fs.writeFileSync(filepath, content, 'utf8');
    modifiedCount++;
    modifiedFiles.push(filepath);
  }
}

walkDir('tests', processFile);

console.log('Modified files:');
modifiedFiles.forEach(f => console.log('  -', f));
console.log('\nTotal files modified:', modifiedCount);
