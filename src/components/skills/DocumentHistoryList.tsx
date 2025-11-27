/**
 * DocumentHistoryList Component
 *
 * 생성된 문서 이력을 표시하는 테이블 컴포넌트
 * - 파일명, 유형, 크기, 생성일 표시
 * - 삭제 기능 (확인 다이얼로그)
 * - 재다운로드 기능 (storage_path 있는 경우)
 * - 빈 상태 표시
 * - 로딩 스켈레톤
 *
 * @module components/skills/DocumentHistoryList
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  Download,
  Trash2,
  FileX,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import useDocumentHistory, { formatFileSize } from '@/hooks/useDocumentHistory';
import type {
  DocumentHistoryListProps,
  GeneratedDocument,
} from '@/types/document-history.types';

// ============================================================================
// DocumentHistoryList Component
// ============================================================================

/**
 * 문서 이력 목록 컴포넌트
 *
 * @example
 * ```tsx
 * <DocumentHistoryList
 *   fileType="xlsx"
 *   onRedownload={(doc) => window.open(doc.storage_path!)}
 * />
 * ```
 */
export function DocumentHistoryList({
  fileType,
  className,
  onRedownload,
  emptyMessage = '생성된 문서가 없습니다',
}: DocumentHistoryListProps) {
  const { documents, isLoading, deleteDocument } = useDocumentHistory({ fileType });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // 삭제 다이얼로그 열기
  const handleDeleteClick = (id: string) => {
    setSelectedDocId(id);
    setDeleteDialogOpen(true);
  };

  // 삭제 확인
  const handleDeleteConfirm = async () => {
    if (selectedDocId) {
      await deleteDocument(selectedDocId);
      setDeleteDialogOpen(false);
      setSelectedDocId(null);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return <DocumentHistoryListSkeleton />;
  }

  // 빈 상태
  if (documents.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <>
      <div className={cn('w-full', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">유형</TableHead>
              <TableHead>파일명</TableHead>
              <TableHead className="w-32">크기</TableHead>
              <TableHead className="w-48">생성일</TableHead>
              <TableHead className="w-32 text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <DocumentHistoryRow
                key={doc.id}
                document={doc}
                onDelete={handleDeleteClick}
                onRedownload={onRedownload}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>문서를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 문서 이력이 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// DocumentHistoryRow Component
// ============================================================================

interface DocumentHistoryRowProps {
  document: GeneratedDocument;
  onDelete: (id: string) => void;
  onRedownload?: (doc: GeneratedDocument) => void;
}

function DocumentHistoryRow({ document, onDelete, onRedownload }: DocumentHistoryRowProps) {
  const hasStoragePath = !!document.storage_path;

  return (
    <TableRow>
      {/* 파일 유형 아이콘 */}
      <TableCell>
        <FileTypeIcon fileType={document.file_type} />
      </TableCell>

      {/* 파일명 */}
      <TableCell className="font-medium">{document.file_name}</TableCell>

      {/* 파일 크기 */}
      <TableCell className="text-muted-foreground">
        {formatFileSize(document.file_size)}
      </TableCell>

      {/* 생성일 */}
      <TableCell className="text-muted-foreground">
        {format(new Date(document.generated_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
      </TableCell>

      {/* 액션 버튼 */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {/* 재다운로드 버튼 (storage_path가 있는 경우) */}
          {hasStoragePath && onRedownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRedownload(document)}
              title="다시 다운로드"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {/* 삭제 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(document.id)}
            title="삭제"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ============================================================================
// FileTypeIcon Component
// ============================================================================

interface FileTypeIconProps {
  fileType: 'xlsx' | 'docx' | 'pptx';
}

function FileTypeIcon({ fileType }: FileTypeIconProps) {
  const iconMap = {
    xlsx: FileSpreadsheet,
    docx: FileText,
    pptx: Presentation,
  };

  const colorMap = {
    xlsx: 'text-green-600',
    docx: 'text-blue-600',
    pptx: 'text-orange-600',
  };

  const Icon = iconMap[fileType];

  return <Icon className={cn('h-5 w-5', colorMap[fileType])} />;
}

// ============================================================================
// EmptyState Component
// ============================================================================

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileX className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

// ============================================================================
// DocumentHistoryListSkeleton Component
// ============================================================================

function DocumentHistoryListSkeleton() {
  return (
    <div className="w-full space-y-4">
      {/* 테이블 헤더 */}
      <div className="flex gap-4 pb-2 border-b">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* 테이블 행 (5개) */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Default Export
// ============================================================================

export default DocumentHistoryList;
