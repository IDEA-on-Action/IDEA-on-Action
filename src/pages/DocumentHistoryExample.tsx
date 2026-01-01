/**
 * DocumentHistory Example Page
 *
 * 문서 이력 기능 데모 페이지
 * - 문서 이력 테이블
 * - 통계 위젯
 * - 파일 유형별 필터 탭
 *
 * @module pages/DocumentHistoryExample
 */

import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Presentation, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentHistoryList } from '@/components/skills';
import { useDocumentStats, formatFileSize } from '@/hooks/content/useDocumentHistory';

// ============================================================================
// DocumentHistoryExample Page
// ============================================================================

export default function DocumentHistoryExample() {
  const [activeTab, setActiveTab] = useState<string>('all');

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">문서 이력</h1>
        <p className="text-muted-foreground mt-2">
          생성된 문서의 이력을 확인하고 관리할 수 있습니다.
        </p>
      </div>

      {/* 통계 위젯 */}
      <StatsWidget />

      {/* 문서 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>문서 목록</CardTitle>
          <CardDescription>
            생성된 문서를 파일 유형별로 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="xlsx">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </TabsTrigger>
              <TabsTrigger value="docx">
                <FileText className="h-4 w-4 mr-2" />
                Word
              </TabsTrigger>
              <TabsTrigger value="pptx">
                <Presentation className="h-4 w-4 mr-2" />
                PowerPoint
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <DocumentHistoryList
                onRedownload={(doc) => {
                  if (doc.storage_path) {
                    window.open(doc.storage_path, '_blank');
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="xlsx" className="mt-6">
              <DocumentHistoryList
                fileType="xlsx"
                emptyMessage="생성된 Excel 문서가 없습니다"
              />
            </TabsContent>

            <TabsContent value="docx" className="mt-6">
              <DocumentHistoryList
                fileType="docx"
                emptyMessage="생성된 Word 문서가 없습니다"
              />
            </TabsContent>

            <TabsContent value="pptx" className="mt-6">
              <DocumentHistoryList
                fileType="pptx"
                emptyMessage="생성된 PowerPoint 문서가 없습니다"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// StatsWidget Component
// ============================================================================

function StatsWidget() {
  const { stats, isLoading } = useDocumentStats();

  if (isLoading) {
    return <StatsWidgetSkeleton />;
  }

  // 총 개수와 총 크기 계산
  const totalCount = stats.reduce((acc, s) => acc + s.count, 0);
  const totalSize = stats.reduce((acc, s) => acc + s.total_size, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 전체 통계 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체 문서</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}개</div>
          <p className="text-xs text-muted-foreground">
            총 {formatFileSize(totalSize)}
          </p>
        </CardContent>
      </Card>

      {/* Excel 통계 */}
      <StatCard
        title="Excel"
        icon={<FileSpreadsheet className="h-4 w-4 text-green-600" />}
        stat={stats.find((s) => s.file_type === 'xlsx')}
      />

      {/* Word 통계 */}
      <StatCard
        title="Word"
        icon={<FileText className="h-4 w-4 text-blue-600" />}
        stat={stats.find((s) => s.file_type === 'docx')}
      />

      {/* PowerPoint 통계 */}
      <StatCard
        title="PowerPoint"
        icon={<Presentation className="h-4 w-4 text-orange-600" />}
        stat={stats.find((s) => s.file_type === 'pptx')}
      />
    </div>
  );
}

// ============================================================================
// StatCard Component
// ============================================================================

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  stat?: {
    count: number;
    total_size: number;
  };
}

function StatCard({ title, icon, stat }: StatCardProps) {
  const count = stat?.count || 0;
  const size = stat?.total_size || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}개</div>
        <p className="text-xs text-muted-foreground">{formatFileSize(size)}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// StatsWidgetSkeleton Component
// ============================================================================

function StatsWidgetSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-0 pb-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
