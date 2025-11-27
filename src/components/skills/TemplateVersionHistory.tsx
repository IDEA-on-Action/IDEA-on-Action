/**
 * TemplateVersionHistory Component
 *
 * 템플릿 버전 히스토리 UI
 * - 버전 목록 타임라인 표시
 * - 버전 선택 및 미리보기
 * - 특정 버전으로 복원 (확인 다이얼로그)
 * - 버전 간 비교
 *
 * @module components/skills/TemplateVersionHistory
 */

import React, { useState, useMemo } from 'react';
import { useTemplateVersions } from '@/hooks/useTemplateVersions';
import type {
  TemplateVersionHistoryProps,
  TemplateVersionWithCreator,
  VersionDiff,
} from '@/types/template-version.types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  RotateCcw,
  FileText,
  User,
  Clock,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 템플릿 버전 히스토리 컴포넌트
 */
export function TemplateVersionHistory({
  templateId,
  className = '',
  onVersionSelect,
  onRestoreComplete,
  maxItems = 10,
}: TemplateVersionHistoryProps) {
  const { versions, isLoading, error, restoreVersion, compareVersions, stats } =
    useTemplateVersions({ templateId });

  const [selectedVersion, setSelectedVersion] =
    useState<TemplateVersionWithCreator | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] =
    useState<TemplateVersionWithCreator | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    v1: TemplateVersionWithCreator;
    v2: TemplateVersionWithCreator;
  } | null>(null);

  // 최신 버전 (현재 버전)
  const currentVersion = useMemo(() => versions[0] || null, [versions]);

  // 표시할 버전 목록 (제한)
  const displayedVersions = useMemo(
    () => versions.slice(0, maxItems),
    [versions, maxItems]
  );

  /**
   * 버전 선택 핸들러
   */
  const handleVersionSelect = (version: TemplateVersionWithCreator) => {
    setSelectedVersion(version);
    onVersionSelect?.(version);
  };

  /**
   * 복원 확인 다이얼로그 열기
   */
  const handleRestoreClick = (version: TemplateVersionWithCreator) => {
    setVersionToRestore(version);
    setRestoreConfirmOpen(true);
  };

  /**
   * 복원 실행
   */
  const handleRestoreConfirm = async () => {
    if (!versionToRestore) return;

    try {
      await restoreVersion(versionToRestore.id);
      setRestoreConfirmOpen(false);
      onRestoreComplete?.(versionToRestore);
    } catch (err) {
      console.error('버전 복원 실패:', err);
    }
  };

  /**
   * 버전 비교 모달 열기
   */
  const handleCompareClick = (version: TemplateVersionWithCreator) => {
    if (!currentVersion) return;
    setCompareVersions({ v1: currentVersion, v2: version });
    setCompareModalOpen(true);
  };

  /**
   * 버전 간 차이점 계산
   */
  const getDiff = useMemo(() => {
    if (!compareVersions) return null;
    return compareVersions(compareVersions.v1.id, compareVersions.v2.id);
  }, [compareVersions, compareVersions]);

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            버전 히스토리 로드 실패
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 빈 상태
  if (versions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            버전 히스토리
          </CardTitle>
          <CardDescription>아직 저장된 버전이 없습니다</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            버전 히스토리
          </CardTitle>
          <CardDescription>
            총 {stats?.total_versions || 0}개 버전 ·{' '}
            {stats?.unique_contributors || 0}명이 기여
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {displayedVersions.map((version, index) => {
                const isCurrent = version.id === currentVersion?.id;

                return (
                  <div
                    key={version.id}
                    className={`relative pl-6 pb-4 ${
                      index < displayedVersions.length - 1
                        ? 'border-l-2 border-border'
                        : ''
                    }`}
                  >
                    {/* 타임라인 점 */}
                    <div className="absolute left-0 top-2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                    {/* 버전 카드 */}
                    <Card
                      className={`cursor-pointer transition-all ${
                        selectedVersion?.id === version.id
                          ? 'ring-2 ring-primary'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleVersionSelect(version)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                버전 {version.version}
                              </CardTitle>
                              {isCurrent && (
                                <Badge variant="default">현재 버전</Badge>
                              )}
                            </div>
                            {version.change_summary && (
                              <CardDescription className="text-sm">
                                {version.change_summary}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {!isCurrent && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompareClick(version);
                                  }}
                                  title="현재 버전과 비교"
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreClick(version);
                                  }}
                                  title="이 버전으로 복원"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{version.creator_email || '알 수 없음'}</span>
                          </div>
                          <Separator orientation="vertical" className="h-4" />
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(version.created_at), {
                                addSuffix: true,
                                locale: ko,
                              })}
                            </span>
                          </div>
                          <Separator orientation="vertical" className="h-4" />
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>
                              {Object.keys(version.content).length}개 항목
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {versions.length > maxItems && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {versions.length - maxItems}개 버전 더 보기...
            </div>
          )}
        </CardContent>
      </Card>

      {/* 복원 확인 다이얼로그 */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>버전 복원 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {versionToRestore && (
                <>
                  <strong>버전 {versionToRestore.version}</strong>으로 복원하시겠습니까?
                  <br />
                  <br />
                  현재 버전의 변경사항이 새로운 버전으로 저장되며, 언제든지 다시
                  되돌릴 수 있습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              복원
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 버전 비교 모달 */}
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>버전 비교</DialogTitle>
            <DialogDescription>
              {compareVersions && (
                <>
                  버전 {compareVersions.v1.version} vs 버전{' '}
                  {compareVersions.v2.version}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {getDiff && (
            <div className="space-y-4">
              {/* 추가된 항목 */}
              {getDiff.diff.added.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">
                    추가됨 ({getDiff.diff.added.length})
                  </h4>
                  <ul className="space-y-1">
                    {getDiff.diff.added.map((key) => (
                      <li
                        key={key}
                        className="text-sm bg-green-50 dark:bg-green-950 px-3 py-1 rounded"
                      >
                        + {key}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 삭제된 항목 */}
              {getDiff.diff.removed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">
                    삭제됨 ({getDiff.diff.removed.length})
                  </h4>
                  <ul className="space-y-1">
                    {getDiff.diff.removed.map((key) => (
                      <li
                        key={key}
                        className="text-sm bg-red-50 dark:bg-red-950 px-3 py-1 rounded"
                      >
                        - {key}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 변경된 항목 */}
              {getDiff.diff.changed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 mb-2">
                    변경됨 ({getDiff.diff.changed.length})
                  </h4>
                  <ul className="space-y-1">
                    {getDiff.diff.changed.map((key) => (
                      <li
                        key={key}
                        className="text-sm bg-yellow-50 dark:bg-yellow-950 px-3 py-1 rounded"
                      >
                        ~ {key}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 변경사항 없음 */}
              {getDiff.diff.added.length === 0 &&
                getDiff.diff.removed.length === 0 &&
                getDiff.diff.changed.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      두 버전 간 차이가 없습니다.
                    </AlertDescription>
                  </Alert>
                )}

              {/* 변경 비율 */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">변경 비율</span>
                  <span className="font-medium">
                    {(getDiff.changeRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TemplateVersionHistory;
