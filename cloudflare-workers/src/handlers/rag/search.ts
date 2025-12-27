/**
 * RAG 검색 핸들러
 * Wave 4: 핵심 비즈니스 - 하이브리드 검색 (Vectorize + FTS5)
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { authMiddleware, requireAuth, requireAdmin } from '../../middleware/auth';

const search = new Hono<AppType>();

// 청크 결과 타입
interface ChunkResult {
  id: string;
  document_id: string;
  content: string;
  metadata: string | null;
  title: string;
  source_url: string | null;
  service_id: string | null;
}

// 벡터 메타데이터 타입
interface VectorMetadata {
  documentId: string;
  chunkIndex?: number;
  serviceId?: string | null;
  isPublic?: number;
}

interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    serviceId?: string;
    isPublic?: boolean;
    status?: string;
  };
  searchType?: 'vector' | 'keyword' | 'hybrid';
  hybridWeight?: number; // 0.0 = 키워드만, 1.0 = 벡터만
}

interface SearchResult {
  id: string;
  documentId: string;
  title: string;
  content: string;
  score: number;
  matchType: 'vector' | 'keyword' | 'hybrid';
  metadata?: Record<string, unknown>;
}

// 임베딩 생성 (OpenAI API)
async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error('임베딩 생성 실패');
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>;
  };

  return data.data[0].embedding;
}

// 벡터 검색 (Vectorize)
async function vectorSearch(
  vectorize: VectorizeIndex,
  embedding: number[],
  limit: number,
  filters?: SearchRequest['filters']
): Promise<Array<{ id: string; score: number }>> {
  const options: VectorizeQueryOptions = {
    topK: limit,
    returnMetadata: 'none',
  };

  // 필터가 있으면 Vectorize 필터 형식으로 변환
  if (filters) {
    const vectorizeFilter: Record<string, string | number | boolean> = {};
    if (filters.serviceId) vectorizeFilter.serviceId = filters.serviceId;
    if (filters.isPublic !== undefined) vectorizeFilter.isPublic = filters.isPublic ? 1 : 0;
    if (Object.keys(vectorizeFilter).length > 0) {
      options.filter = vectorizeFilter;
    }
  }

  const results = await vectorize.query(embedding, options);

  return results.matches.map(match => ({
    id: match.id,
    score: match.score,
  }));
}

// 키워드 검색 (FTS5)
async function keywordSearch(
  db: D1Database,
  query: string,
  limit: number,
  filters?: SearchRequest['filters']
): Promise<Array<{ id: string; documentId: string; score: number }>> {
  // FTS5 MATCH 쿼리
  let sql = `
    SELECT
      rc.id,
      rc.document_id,
      bm25(rag_chunks_fts) as score
    FROM rag_chunks_fts
    JOIN rag_chunks rc ON rag_chunks_fts.rowid = rc.rowid
    JOIN rag_documents rd ON rc.document_id = rd.id
    WHERE rag_chunks_fts MATCH ?
  `;

  const params: unknown[] = [query];

  if (filters?.serviceId) {
    sql += ' AND rd.service_id = ?';
    params.push(filters.serviceId);
  }

  if (filters?.isPublic !== undefined) {
    sql += ' AND rd.is_public = ?';
    params.push(filters.isPublic ? 1 : 0);
  }

  if (filters?.status) {
    sql += ' AND rd.status = ?';
    params.push(filters.status);
  }

  sql += ' ORDER BY score LIMIT ?';
  params.push(limit);

  const result = await db.prepare(sql).bind(...params).all();

  return result.results.map(row => ({
    id: row.id as string,
    documentId: row.document_id as string,
    score: row.score as number,
  }));
}

// 결과 병합 (RRF - Reciprocal Rank Fusion)
function mergeResults(
  vectorResults: Array<{ id: string; score: number }>,
  keywordResults: Array<{ id: string; score: number }>,
  hybridWeight: number
): Array<{ id: string; score: number }> {
  const k = 60; // RRF 상수
  const scoreMap = new Map<string, number>();

  // 벡터 결과 점수 계산
  vectorResults.forEach((result, index) => {
    const rrfScore = hybridWeight * (1 / (k + index + 1));
    scoreMap.set(result.id, (scoreMap.get(result.id) || 0) + rrfScore);
  });

  // 키워드 결과 점수 계산
  keywordResults.forEach((result, index) => {
    const rrfScore = (1 - hybridWeight) * (1 / (k + index + 1));
    scoreMap.set(result.id, (scoreMap.get(result.id) || 0) + rrfScore);
  });

  // 점수순 정렬
  return Array.from(scoreMap.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

// POST /rag/search
search.post('/', authMiddleware, async (c) => {
  const db = c.env.DB;
  const vectorize = c.env.VECTORIZE;
  const auth = c.get('auth');

  const body = await c.req.json<SearchRequest>();
  const {
    query,
    limit = 10,
    threshold = 0.7,
    filters,
    searchType = 'hybrid',
    hybridWeight = 0.5,
  } = body;

  if (!query || query.trim().length === 0) {
    return c.json({ error: '검색어를 입력해주세요' }, 400);
  }

  const startTime = Date.now();

  try {
    let results: Array<{ id: string; score: number }> = [];

    // 벡터 검색
    if (searchType === 'vector' || searchType === 'hybrid') {
      const embedding = await generateEmbedding(query, c.env.OPENAI_API_KEY);
      const vectorResults = await vectorSearch(vectorize, embedding, limit * 2, filters);

      if (searchType === 'vector') {
        results = vectorResults.filter(r => r.score >= threshold);
      } else {
        // 하이브리드 검색
        const keywordResults = await keywordSearch(db, query, limit * 2, filters);
        results = mergeResults(vectorResults, keywordResults, hybridWeight);
      }
    } else {
      // 키워드만 검색
      const keywordResults = await keywordSearch(db, query, limit, filters);
      results = keywordResults.map(r => ({ id: r.id, score: Math.abs(r.score) }));
    }

    // 결과 제한
    results = results.slice(0, limit);

    // 청크 상세 정보 조회
    if (results.length === 0) {
      return c.json({
        results: [],
        total: 0,
        latencyMs: Date.now() - startTime,
      });
    }

    const chunkIds = results.map(r => r.id);
    const placeholders = chunkIds.map(() => '?').join(',');

    const chunks = await db
      .prepare(`
        SELECT
          rc.id,
          rc.document_id,
          rc.chunk_text as content,
          rc.metadata,
          rd.title,
          rd.source_url,
          rd.service_id
        FROM rag_chunks rc
        JOIN rag_documents rd ON rc.document_id = rd.id
        WHERE rc.id IN (${placeholders})
      `)
      .bind(...chunkIds)
      .all();

    // 결과 매핑
    const chunkMap = new Map<string, ChunkResult>();
    for (const chunk of chunks.results) {
      chunkMap.set(chunk.id as string, chunk as unknown as ChunkResult);
    }

    const searchResults: SearchResult[] = [];
    for (const result of results) {
      const chunk = chunkMap.get(result.id);
      if (!chunk) continue;

      searchResults.push({
        id: result.id,
        documentId: chunk.document_id,
        title: chunk.title,
        content: chunk.content,
        score: result.score,
        matchType: searchType,
        metadata: chunk.metadata ? JSON.parse(chunk.metadata) : undefined,
      });
    }

    const latencyMs = Date.now() - startTime;

    // 검색 로그 기록
    await db
      .prepare(`
        INSERT INTO rag_search_logs (id, user_id, query, results_count, top_score, search_type, filters, latency_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        auth?.userId || null,
        query,
        searchResults.length,
        searchResults[0]?.score || null,
        searchType,
        filters ? JSON.stringify(filters) : null,
        latencyMs
      )
      .run();

    return c.json({
      results: searchResults,
      total: searchResults.length,
      latencyMs,
    });
  } catch (error) {
    console.error('RAG 검색 오류:', error);
    return c.json({ error: '검색 중 오류가 발생했습니다' }, 500);
  }
});

// 문서 임베딩 생성 (관리자용)
search.post('/embed/:documentId', requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const vectorize = c.env.VECTORIZE;
  const documentId = c.req.param('documentId');

  try {
    // 문서 조회
    const document = await db
      .prepare('SELECT * FROM rag_documents WHERE id = ?')
      .bind(documentId)
      .first();

    if (!document) {
      return c.json({ error: '문서를 찾을 수 없습니다' }, 404);
    }

    // 상태 업데이트
    await db
      .prepare("UPDATE rag_documents SET status = 'processing', updated_at = datetime('now') WHERE id = ?")
      .bind(documentId)
      .run();

    // 청크 조회
    const chunks = await db
      .prepare('SELECT * FROM rag_chunks WHERE document_id = ? ORDER BY chunk_index')
      .bind(documentId)
      .all();

    if (chunks.results.length === 0) {
      return c.json({ error: '청크가 없습니다. 먼저 문서를 청킹해주세요' }, 400);
    }

    // 각 청크에 대해 임베딩 생성 및 저장
    const vectors: VectorizeVector[] = [];

    for (const chunk of chunks.results) {
      const embedding = await generateEmbedding(
        chunk.chunk_text as string,
        c.env.OPENAI_API_KEY
      );

      const vectorMetadata: VectorizeVectorMetadata = {
        documentId,
        chunkIndex: chunk.chunk_index as number,
        isPublic: document.is_public as number,
      };
      // serviceId가 있으면 추가
      if (document.service_id) {
        vectorMetadata.serviceId = document.service_id as string;
      }

      vectors.push({
        id: chunk.id as string,
        values: embedding,
        metadata: vectorMetadata,
      });
    }

    // Vectorize에 벡터 저장
    await vectorize.upsert(vectors);

    // 상태 업데이트
    await db
      .prepare("UPDATE rag_documents SET status = 'ready', processed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .bind(documentId)
      .run();

    return c.json({
      success: true,
      documentId,
      chunkCount: vectors.length,
      message: `${vectors.length}개 청크의 임베딩이 생성되었습니다`,
    });
  } catch (error) {
    console.error('임베딩 생성 오류:', error);

    // 실패 상태 업데이트
    await db
      .prepare("UPDATE rag_documents SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(String(error), documentId)
      .run();

    return c.json({ error: '임베딩 생성 중 오류가 발생했습니다' }, 500);
  }
});

// 유사 문서 조회
search.get('/similar/:documentId', authMiddleware, async (c) => {
  const db = c.env.DB;
  const vectorize = c.env.VECTORIZE;
  const documentId = c.req.param('documentId');
  const { limit = '5' } = c.req.query();

  try {
    // 문서의 첫 번째 청크 조회
    const firstChunk = await db
      .prepare('SELECT id FROM rag_chunks WHERE document_id = ? ORDER BY chunk_index LIMIT 1')
      .bind(documentId)
      .first();

    if (!firstChunk) {
      return c.json({ error: '문서를 찾을 수 없습니다' }, 404);
    }

    // Vectorize에서 해당 청크의 벡터 조회
    const vectorResult = await vectorize.getByIds([firstChunk.id as string]);

    if (!vectorResult || vectorResult.length === 0) {
      return c.json({ error: '임베딩을 찾을 수 없습니다' }, 404);
    }

    // 유사 문서 검색
    const similarResults = await vectorize.query(vectorResult[0].values, {
      topK: parseInt(limit) + 1, // 자기 자신 제외를 위해 +1
      returnMetadata: 'all',
    });

    // 자기 자신 제외
    const filteredResults = similarResults.matches.filter(match => {
      const meta = match.metadata as VectorMetadata | undefined;
      return meta?.documentId !== documentId;
    });

    // 문서 상세 정보 조회
    const documentIds = [...new Set(
      filteredResults
        .map(match => {
          const meta = match.metadata as VectorMetadata | undefined;
          return meta?.documentId;
        })
        .filter((id): id is string => Boolean(id))
    )];

    if (documentIds.length === 0) {
      return c.json({ similar: [] });
    }

    const placeholders = documentIds.map(() => '?').join(',');
    const documents = await db
      .prepare(`
        SELECT id, title, source_url, service_id
        FROM rag_documents
        WHERE id IN (${placeholders}) AND status = 'ready'
      `)
      .bind(...documentIds)
      .all();

    interface DocResult {
      id: string;
      title: string;
      source_url: string | null;
      service_id: string | null;
    }

    const documentMap = new Map<string, DocResult>();
    for (const doc of documents.results) {
      documentMap.set(doc.id as string, doc as unknown as DocResult);
    }

    const similar: Array<{
      id: string;
      title: string;
      sourceUrl: string | null;
      serviceId: string | null;
      score: number;
    }> = [];

    for (const match of filteredResults.slice(0, parseInt(limit))) {
      const meta = match.metadata as VectorMetadata | undefined;
      if (!meta?.documentId) continue;

      const doc = documentMap.get(meta.documentId);
      if (!doc) continue;

      similar.push({
        id: meta.documentId,
        title: doc.title,
        sourceUrl: doc.source_url,
        serviceId: doc.service_id,
        score: match.score,
      });
    }

    return c.json({ similar });
  } catch (error) {
    console.error('유사 문서 조회 오류:', error);
    return c.json({ error: '유사 문서 조회 중 오류가 발생했습니다' }, 500);
  }
});

export default search;
