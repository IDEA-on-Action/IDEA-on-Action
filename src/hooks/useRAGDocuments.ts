/**
 * RAG 문서 관리 훅
 *
 * RAG 시스템에서 사용하는 문서의 CRUD 및 임베딩 트리거 기능
 *
 * @module hooks/useRAGDocuments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// 타입 정의 (임시 - rag.types.ts가 생성되면 import로 대체)
// ============================================================================

/**
 * RAG 문서 상태
 */
export type RAGDocumentStatus = 'active' | 'archived' | 'processing';

/**
 * RAG 문서
 */
export interface RAGDocument {
  id: string;
  serviceId: string | null;
  title: string;
  content: string;
  contentType: 'text' | 'markdown' | 'html';
  sourceUrl: string | null;
  metadata: Record<string, unknown> | null;
  status: RAGDocumentStatus;
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  embeddingError: string | null;
  chunkCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DB 레코드 타입
 */
interface RAGDocumentDB {
  id: string;
  service_id: string | null;
  title: string;
  content: string;
  content_type: 'text' | 'markdown' | 'html';
  source_url: string | null;
  metadata: Record<string, unknown> | null;
  status: RAGDocumentStatus;
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed';
  embedding_error: string | null;
  chunk_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * 문서 생성 입력
 */
export interface CreateRAGDocumentInput {
  serviceId?: string;
  title: string;
  content: string;
  contentType?: 'text' | 'markdown' | 'html';
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
  autoEmbed?: boolean; // true면 생성 후 즉시 임베딩 트리거
}

/**
 * 문서 업데이트 입력
 */
export interface UpdateRAGDocumentInput {
  title?: string;
  content?: string;
  contentType?: 'text' | 'markdown' | 'html';
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
  status?: RAGDocumentStatus;
  reEmbed?: boolean; // true면 업데이트 후 재임베딩
}

/**
 * 문서 목록 응답
 */
export interface RAGDocumentsResponse {
  data: RAGDocument[];
  count: number | null;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * DB 레코드를 클라이언트 객체로 변환
 */
function dbToRAGDocument(db: RAGDocumentDB): RAGDocument {
  return {
    id: db.id,
    serviceId: db.service_id,
    title: db.title,
    content: db.content,
    contentType: db.content_type,
    sourceUrl: db.source_url,
    metadata: db.metadata,
    status: db.status,
    embeddingStatus: db.embedding_status,
    embeddingError: db.embedding_error,
    chunkCount: db.chunk_count,
    createdBy: db.created_by,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * 클라이언트 객체를 DB 레코드로 변환
 */
function ragDocumentToDb(doc: Partial<RAGDocument>): Partial<RAGDocumentDB> {
  const db: Partial<RAGDocumentDB> = {};

  if (doc.serviceId !== undefined) db.service_id = doc.serviceId;
  if (doc.title !== undefined) db.title = doc.title;
  if (doc.content !== undefined) db.content = doc.content;
  if (doc.contentType !== undefined) db.content_type = doc.contentType;
  if (doc.sourceUrl !== undefined) db.source_url = doc.sourceUrl;
  if (doc.metadata !== undefined) db.metadata = doc.metadata;
  if (doc.status !== undefined) db.status = doc.status;
  if (doc.embeddingStatus !== undefined) db.embedding_status = doc.embeddingStatus;
  if (doc.embeddingError !== undefined) db.embedding_error = doc.embeddingError;
  if (doc.chunkCount !== undefined) db.chunk_count = doc.chunkCount;

  return db;
}

// ============================================================================
// 훅 옵션 및 반환 타입
// ============================================================================

/**
 * 문서 목록 조회 옵션
 */
export interface UseRAGDocumentsOptions {
  serviceId?: string;
  status?: RAGDocumentStatus;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 문서 목록 조회 반환 타입
 */
export interface UseRAGDocumentsReturn {
  documents: RAGDocument[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;

  createDocument: (data: CreateRAGDocumentInput) => Promise<RAGDocument>;
  updateDocument: (id: string, data: UpdateRAGDocumentInput) => Promise<RAGDocument>;
  deleteDocument: (id: string) => Promise<void>;
  triggerEmbedding: (id: string) => Promise<void>;
  refetch: () => void;
}

// ============================================================================
// 메인 훅
// ============================================================================

/**
 * RAG 문서 관리 훅
 *
 * @param options - 조회 옵션
 * @returns 문서 목록 및 CRUD 함수
 *
 * @example
 * ```tsx
 * const {
 *   documents,
 *   isLoading,
 *   createDocument,
 *   updateDocument,
 *   deleteDocument,
 *   triggerEmbedding,
 * } = useRAGDocuments({
 *   serviceId: 'minu-find',
 *   status: 'active',
 * });
 *
 * // 문서 생성 (자동 임베딩)
 * await createDocument({
 *   title: 'Product Guide',
 *   content: '...',
 *   autoEmbed: true,
 * });
 *
 * // 문서 업데이트 (재임베딩)
 * await updateDocument('doc-id', {
 *   content: 'Updated content',
 *   reEmbed: true,
 * });
 *
 * // 임베딩 트리거
 * await triggerEmbedding('doc-id');
 * ```
 */
export function useRAGDocuments(options?: UseRAGDocumentsOptions): UseRAGDocumentsReturn {
  const {
    serviceId,
    status,
    enabled = true,
    limit = 50,
    offset = 0,
  } = options || {};

  const queryClient = useQueryClient();

  // ============================================================================
  // 문서 목록 조회
  // ============================================================================

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<RAGDocumentsResponse>({
    queryKey: ['rag-documents', { serviceId, status, limit, offset }],
    queryFn: async () => {
      let query = supabase
        .from('rag_documents')
        .select('*', { count: 'exact' });

      // 필터 적용
      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      // 페이지네이션
      query = query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('RAG documents query error:', error);
        throw new Error(`문서 목록을 불러오는데 실패했습니다: ${error.message}`);
      }

      return {
        data: (data as RAGDocumentDB[]).map(dbToRAGDocument),
        count,
      };
    },
    enabled,
    staleTime: 30 * 1000, // 30초
  });

  // ============================================================================
  // 문서 생성
  // ============================================================================

  const createMutation = useMutation({
    mutationFn: async (input: CreateRAGDocumentInput) => {
      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      // DB 레코드 생성
      const dbRecord: Partial<RAGDocumentDB> = {
        service_id: input.serviceId || null,
        title: input.title,
        content: input.content,
        content_type: input.contentType || 'text',
        source_url: input.sourceUrl || null,
        metadata: input.metadata || null,
        status: 'active',
        embedding_status: input.autoEmbed ? 'pending' : 'pending',
        created_by: user.id,
      };

      // Insert
      const { data, error } = await supabase
        .from('rag_documents')
        .insert(dbRecord)
        .select()
        .single();

      if (error) {
        console.error('Create RAG document error:', error);

        if (error.code === '42501') {
          throw new Error('권한이 없습니다. 관리자 계정으로 로그인해주세요.');
        }

        throw new Error(`문서 생성에 실패했습니다: ${error.message}`);
      }

      const newDocument = dbToRAGDocument(data as RAGDocumentDB);

      // 자동 임베딩 요청
      if (input.autoEmbed) {
        try {
          await supabase.functions.invoke('rag-embedding/trigger', {
            body: { document_id: newDocument.id },
          });
        } catch (err) {
          console.error('Auto-embed trigger error:', err);
          // 임베딩 실패는 사용자에게 알리지 않음 (백그라운드 작업)
        }
      }

      return newDocument;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });

      // Success toast
      toast.success(`문서 "${data.title}"이(가) 생성되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ============================================================================
  // 문서 업데이트
  // ============================================================================

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: updates }: { id: string; data: UpdateRAGDocumentInput }) => {
      // 클라이언트 객체를 DB 레코드로 변환
      const dbUpdates = ragDocumentToDb(updates as Partial<RAGDocument>);

      // 재임베딩 요청 시 상태 변경
      if (updates.reEmbed) {
        dbUpdates.embedding_status = 'pending';
        dbUpdates.embedding_error = null;
      }

      // Update
      const { data, error } = await supabase
        .from('rag_documents')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update RAG document error:', error);

        if (error.code === '42501') {
          throw new Error('권한이 없습니다. 문서 생성자만 수정할 수 있습니다.');
        }

        throw new Error(`문서 수정에 실패했습니다: ${error.message}`);
      }

      const updatedDocument = dbToRAGDocument(data as RAGDocumentDB);

      // 재임베딩 요청
      if (updates.reEmbed) {
        try {
          await supabase.functions.invoke('rag-embedding/trigger', {
            body: { document_id: id },
          });
        } catch (err) {
          console.error('Re-embed trigger error:', err);
        }
      }

      return updatedDocument;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });

      // Success toast
      toast.success(`문서 "${data.title}"이(가) 수정되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ============================================================================
  // 문서 삭제
  // ============================================================================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rag_documents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete RAG document error:', error);

        if (error.code === '42501') {
          throw new Error('권한이 없습니다. 문서 생성자만 삭제할 수 있습니다.');
        }

        throw new Error(`문서 삭제에 실패했습니다: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });

      // Success toast
      toast.success('문서가 삭제되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ============================================================================
  // 임베딩 트리거
  // ============================================================================

  const embeddingMutation = useMutation({
    mutationFn: async (id: string) => {
      // 문서 상태를 'pending'으로 업데이트
      const { error: updateError } = await supabase
        .from('rag_documents')
        .update({
          embedding_status: 'pending',
          embedding_error: null,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Update embedding status error:', updateError);
        throw new Error('임베딩 상태 업데이트에 실패했습니다.');
      }

      // Edge Function 호출
      const { error } = await supabase.functions.invoke('rag-embedding/trigger', {
        body: { document_id: id },
      });

      if (error) {
        console.error('Trigger embedding error:', error);
        throw new Error(`임베딩 트리거에 실패했습니다: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });

      // Success toast
      toast.success('임베딩이 시작되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ============================================================================
  // 반환
  // ============================================================================

  return {
    documents: data?.data || [],
    isLoading,
    error: error as Error | null,
    totalCount: data?.count || 0,

    createDocument: createMutation.mutateAsync,
    updateDocument: (id, updates) => updateMutation.mutateAsync({ id, data: updates }),
    deleteDocument: deleteMutation.mutateAsync,
    triggerEmbedding: embeddingMutation.mutateAsync,
    refetch,
  };
}

// ============================================================================
// 내보내기
// ============================================================================

export default useRAGDocuments;
