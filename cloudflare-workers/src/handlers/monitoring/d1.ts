/**
 * D1 Database 모니터링 핸들러
 * D1 성능 메트릭 및 통계 제공
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const d1Monitoring = new Hono<AppType>();

interface TableStats {
  name: string;
  rowCount: number;
  sizeBytes: number;
  indexCount: number;
}

interface QueryStats {
  totalQueries: number;
  avgExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  slowQueries: number;
  failedQueries: number;
}

interface D1Metrics {
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastChecked: string;
    error?: string;
  };
  tables: TableStats[];
  queryStats: QueryStats;
  slowQueries: Array<{
    query: string;
    executionTime: number;
    timestamp: string;
    rowsAffected?: number;
  }>;
  timeSeries: Array<{
    timestamp: string;
    queries: number;
    avgResponseTime: number;
    errors: number;
  }>;
  totalTables: number;
  totalSizeBytes: number;
  collectedAt: string;
}

// 쿼리 기록을 위한 KV 키 (시계열 데이터)
const METRICS_KEY_PREFIX = 'd1_metrics_';
const SLOW_QUERIES_KEY = 'd1_slow_queries';
const QUERY_STATS_KEY = 'd1_query_stats';

/**
 * D1 메트릭 조회
 * GET /monitoring/d1
 */
d1Monitoring.get('/', async (c) => {
  const startTime = performance.now();

  try {
    // 1. 데이터베이스 상태 체크
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let healthError: string | undefined;

    try {
      await c.env.DB.prepare('SELECT 1').first();
    } catch (error) {
      healthStatus = 'unhealthy';
      healthError = error instanceof Error ? error.message : 'Unknown error';
    }

    // 2. 테이블 통계 수집
    const tables = await getTableStats(c.env.DB);

    // 3. 쿼리 통계 가져오기 (KV에서)
    const queryStats = await getQueryStats(c.env.CACHE);

    // 4. 슬로우 쿼리 목록
    const slowQueries = await getSlowQueries(c.env.CACHE);

    // 5. 시계열 데이터 (최근 24시간)
    const timeSeries = await getTimeSeries(c.env.CACHE);

    // 6. 총 크기 계산
    const totalSizeBytes = tables.reduce((sum, t) => sum + t.sizeBytes, 0);

    const responseTime = Math.round(performance.now() - startTime);

    const metrics: D1Metrics = {
      health: {
        status: healthStatus,
        responseTime,
        lastChecked: new Date().toISOString(),
        error: healthError,
      },
      tables,
      queryStats,
      slowQueries,
      timeSeries,
      totalTables: tables.length,
      totalSizeBytes,
      collectedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('[D1Monitoring] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * 테이블 목록만 조회
 * GET /monitoring/d1/tables
 */
d1Monitoring.get('/tables', async (c) => {
  try {
    const tables = await getTableStats(c.env.DB);
    return c.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * 헬스체크만 조회
 * GET /monitoring/d1/health
 */
d1Monitoring.get('/health', async (c) => {
  const startTime = performance.now();

  try {
    await c.env.DB.prepare('SELECT 1').first();

    return c.json({
      success: true,
      data: {
        status: 'healthy',
        responseTime: Math.round(performance.now() - startTime),
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({
      success: true,
      data: {
        status: 'unhealthy',
        responseTime: Math.round(performance.now() - startTime),
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * 쿼리 실행 기록 (내부 API용)
 * POST /monitoring/d1/record
 *
 * 이 엔드포인트는 쿼리 실행 후 호출하여 메트릭을 기록합니다.
 */
d1Monitoring.post('/record', async (c) => {
  try {
    const body = await c.req.json<{
      query: string;
      executionTime: number;
      rowsAffected?: number;
      success: boolean;
    }>();

    await recordQueryMetrics(c.env.CACHE, body);

    return c.json({ success: true });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================
// 헬퍼 함수들
// ============================================

/**
 * 테이블 통계 수집
 */
async function getTableStats(db: D1Database): Promise<TableStats[]> {
  try {
    // SQLite에서 테이블 목록 조회
    const tablesResult = await db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_cf_%'
      ORDER BY name
    `).all<{ name: string }>();

    const tables: TableStats[] = [];

    for (const table of tablesResult.results) {
      try {
        // 행 수 조회
        const countResult = await db.prepare(
          `SELECT COUNT(*) as count FROM "${table.name}"`
        ).first<{ count: number }>();

        // 인덱스 수 조회
        const indexResult = await db.prepare(`
          SELECT COUNT(*) as count FROM sqlite_master
          WHERE type='index' AND tbl_name=?
        `).bind(table.name).first<{ count: number }>();

        // 테이블 크기 추정 (페이지 수 × 페이지 크기)
        // D1은 정확한 크기 조회가 제한적이므로 행 수 기반 추정
        const estimatedSize = (countResult?.count || 0) * 500; // 평균 행 크기 추정

        tables.push({
          name: table.name,
          rowCount: countResult?.count || 0,
          sizeBytes: estimatedSize,
          indexCount: indexResult?.count || 0,
        });
      } catch {
        // 개별 테이블 조회 실패 시 스킵
        tables.push({
          name: table.name,
          rowCount: 0,
          sizeBytes: 0,
          indexCount: 0,
        });
      }
    }

    return tables;
  } catch (error) {
    console.error('[D1Monitoring] getTableStats error:', error);
    return [];
  }
}

/**
 * 쿼리 통계 가져오기
 */
async function getQueryStats(cache: KVNamespace): Promise<QueryStats> {
  try {
    const statsStr = await cache.get(QUERY_STATS_KEY);
    if (statsStr) {
      return JSON.parse(statsStr);
    }
  } catch {
    // 캐시 읽기 실패 시 기본값 반환
  }

  return {
    totalQueries: 0,
    avgExecutionTime: 0,
    maxExecutionTime: 0,
    minExecutionTime: 0,
    slowQueries: 0,
    failedQueries: 0,
  };
}

/**
 * 슬로우 쿼리 목록 가져오기
 */
async function getSlowQueries(cache: KVNamespace): Promise<Array<{
  query: string;
  executionTime: number;
  timestamp: string;
  rowsAffected?: number;
}>> {
  try {
    const queriesStr = await cache.get(SLOW_QUERIES_KEY);
    if (queriesStr) {
      return JSON.parse(queriesStr);
    }
  } catch {
    // 캐시 읽기 실패 시 빈 배열 반환
  }

  return [];
}

/**
 * 시계열 데이터 가져오기 (최근 24시간)
 */
async function getTimeSeries(cache: KVNamespace): Promise<Array<{
  timestamp: string;
  queries: number;
  avgResponseTime: number;
  errors: number;
}>> {
  const series: Array<{
    timestamp: string;
    queries: number;
    avgResponseTime: number;
    errors: number;
  }> = [];

  try {
    const now = new Date();

    // 최근 24시간의 시간별 데이터
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now);
      hour.setHours(hour.getHours() - i);
      hour.setMinutes(0, 0, 0);

      const key = `${METRICS_KEY_PREFIX}${hour.toISOString().slice(0, 13)}`;
      const dataStr = await cache.get(key);

      if (dataStr) {
        const data = JSON.parse(dataStr);
        series.push({
          timestamp: hour.toISOString(),
          queries: data.queries || 0,
          avgResponseTime: data.avgResponseTime || 0,
          errors: data.errors || 0,
        });
      } else {
        series.push({
          timestamp: hour.toISOString(),
          queries: 0,
          avgResponseTime: 0,
          errors: 0,
        });
      }
    }
  } catch (error) {
    console.error('[D1Monitoring] getTimeSeries error:', error);
  }

  return series;
}

/**
 * 쿼리 실행 메트릭 기록
 */
async function recordQueryMetrics(
  cache: KVNamespace,
  record: {
    query: string;
    executionTime: number;
    rowsAffected?: number;
    success: boolean;
  }
): Promise<void> {
  try {
    // 1. 현재 시간대 키
    const now = new Date();
    const hourKey = `${METRICS_KEY_PREFIX}${now.toISOString().slice(0, 13)}`;

    // 2. 시간별 메트릭 업데이트
    const hourDataStr = await cache.get(hourKey);
    const hourData = hourDataStr ? JSON.parse(hourDataStr) : {
      queries: 0,
      totalTime: 0,
      avgResponseTime: 0,
      errors: 0,
    };

    hourData.queries += 1;
    hourData.totalTime += record.executionTime;
    hourData.avgResponseTime = hourData.totalTime / hourData.queries;
    if (!record.success) {
      hourData.errors += 1;
    }

    // TTL: 25시간 (약간의 여유)
    await cache.put(hourKey, JSON.stringify(hourData), { expirationTtl: 90000 });

    // 3. 전체 쿼리 통계 업데이트
    const statsStr = await cache.get(QUERY_STATS_KEY);
    const stats: QueryStats = statsStr ? JSON.parse(statsStr) : {
      totalQueries: 0,
      avgExecutionTime: 0,
      maxExecutionTime: 0,
      minExecutionTime: Infinity,
      slowQueries: 0,
      failedQueries: 0,
    };

    stats.totalQueries += 1;
    stats.avgExecutionTime = (stats.avgExecutionTime * (stats.totalQueries - 1) + record.executionTime) / stats.totalQueries;
    stats.maxExecutionTime = Math.max(stats.maxExecutionTime, record.executionTime);
    stats.minExecutionTime = Math.min(stats.minExecutionTime === Infinity ? record.executionTime : stats.minExecutionTime, record.executionTime);

    if (record.executionTime > 100) {
      stats.slowQueries += 1;
    }

    if (!record.success) {
      stats.failedQueries += 1;
    }

    await cache.put(QUERY_STATS_KEY, JSON.stringify(stats), { expirationTtl: 86400 });

    // 4. 슬로우 쿼리 기록 (100ms 이상)
    if (record.executionTime > 100) {
      const slowQueriesStr = await cache.get(SLOW_QUERIES_KEY);
      let slowQueries = slowQueriesStr ? JSON.parse(slowQueriesStr) : [];

      slowQueries.unshift({
        query: record.query.slice(0, 100), // 첫 100자만
        executionTime: record.executionTime,
        timestamp: now.toISOString(),
        rowsAffected: record.rowsAffected,
      });

      // 최근 10개만 유지
      slowQueries = slowQueries.slice(0, 10);

      await cache.put(SLOW_QUERIES_KEY, JSON.stringify(slowQueries), { expirationTtl: 86400 });
    }
  } catch (error) {
    console.error('[D1Monitoring] recordQueryMetrics error:', error);
  }
}

export default d1Monitoring;
