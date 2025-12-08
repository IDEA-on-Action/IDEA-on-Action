/**
 * Rate Limiter 구현
 * @module lib/security/rate-limiter
 * @description 메모리 기반 Rate Limiting 시스템
 */

import type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitStatus,
  RateLimitStrategy,
  RateLimitStore,
  RateLimitMetrics,
} from '@/types/rate-limit.types';

/**
 * 메모리 기반 Rate Limit 저장소
 * @class MemoryStore
 * @implements {RateLimitStore}
 */
class MemoryStore implements RateLimitStore {
  private storage = new Map<string, RateLimitStatus>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 10초마다 만료된 데이터 정리
    this.cleanupInterval = setInterval(() => {
      void this.cleanup();
    }, 10000);
  }

  /**
   * 요청 카운트 증가
   * @param key - Rate Limit 키
   * @param windowMs - 시간 창 (밀리초)
   * @returns Rate Limit 상태
   */
  async increment(key: string, windowMs: number): Promise<RateLimitStatus> {
    const now = Date.now();
    const existing = this.storage.get(key);

    // 기존 윈도우가 만료되었거나 없는 경우 새로 생성
    if (!existing || now > existing.windowEnd) {
      const status: RateLimitStatus = {
        key,
        keyType: 'user',
        count: 1,
        limit: 0, // 나중에 설정됨
        windowStart: now,
        windowEnd: now + windowMs,
        firstRequestAt: now,
        lastRequestAt: now,
      };
      this.storage.set(key, status);
      return status;
    }

    // 기존 윈도우 업데이트
    existing.count += 1;
    existing.lastRequestAt = now;
    this.storage.set(key, existing);
    return existing;
  }

  /**
   * 상태 조회
   * @param key - Rate Limit 키
   * @returns Rate Limit 상태 또는 null
   */
  async get(key: string): Promise<RateLimitStatus | null> {
    const status = this.storage.get(key);
    if (!status) return null;

    // 만료된 상태는 null 반환
    if (Date.now() > status.windowEnd) {
      this.storage.delete(key);
      return null;
    }

    return status;
  }

  /**
   * 상태 초기화
   * @param key - Rate Limit 키
   */
  async reset(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * 만료된 데이터 정리
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, status] of this.storage.entries()) {
      if (now > status.windowEnd) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * 저장소 종료
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }
}

/**
 * Rate Limiter 클래스
 * @class RateLimiter
 * @description Rate Limiting 로직을 구현한 메인 클래스
 */
export class RateLimiter {
  private config: Required<Omit<RateLimitConfig, 'redisUrl' | 'errorMessage'>>;
  private store: RateLimitStore;
  private metrics: RateLimitMetrics;

  constructor(config: RateLimitConfig) {
    // 기본 설정 병합
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyPrefix: config.keyPrefix ?? 'ratelimit',
      strategy: config.strategy ?? RateLimitStrategy.FIXED_WINDOW,
      refillRate: config.refillRate ?? 10,
      bucketSize: config.bucketSize ?? config.maxRequests,
      segments: config.segments ?? 10,
      useRedis: config.useRedis ?? false,
      includeHeaders: config.includeHeaders ?? true,
      enableIpLimit: config.enableIpLimit ?? false,
      enableUserLimit: config.enableUserLimit ?? true,
      enableEndpointLimit: config.enableEndpointLimit ?? false,
    };

    // Redis 사용 시 에러 (향후 구현 예정)
    if (this.config.useRedis) {
      throw new Error('Redis store is not implemented yet. Use memory store.');
    }

    // 메모리 저장소 생성
    this.store = new MemoryStore();

    // 메트릭 초기화
    this.metrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      blockRate: 0,
      byKey: {},
      collectionStartedAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };
  }

  /**
   * Rate Limit 확인
   * @param key - Rate Limit 키 (user_id, ip 등)
   * @returns Rate Limit 결과
   */
  async checkRateLimit(key: string): Promise<RateLimitResult> {
    const prefixedKey = `${this.config.keyPrefix}:${key}`;

    // 전략에 따라 처리
    switch (this.config.strategy) {
      case RateLimitStrategy.FIXED_WINDOW:
        return this.fixedWindowCheck(prefixedKey);
      case RateLimitStrategy.SLIDING_WINDOW:
        return this.slidingWindowCheck(prefixedKey);
      case RateLimitStrategy.TOKEN_BUCKET:
        return this.tokenBucketCheck(prefixedKey);
      default:
        return this.fixedWindowCheck(prefixedKey);
    }
  }

  /**
   * 고정 윈도우 방식 Rate Limit 확인
   * @private
   */
  private async fixedWindowCheck(key: string): Promise<RateLimitResult> {
    const status = await this.store.increment(key, this.config.windowMs);
    status.limit = this.config.maxRequests;

    const allowed = status.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - status.count);

    // 메트릭 업데이트
    this.updateMetrics(key, allowed);

    return {
      allowed,
      remaining,
      resetAt: status.windowEnd,
      current: status.count,
      limit: this.config.maxRequests,
      retryAfter: allowed ? 0 : status.windowEnd - Date.now(),
    };
  }

  /**
   * 슬라이딩 윈도우 방식 Rate Limit 확인
   * @private
   */
  private async slidingWindowCheck(key: string): Promise<RateLimitResult> {
    // 간단한 구현: 고정 윈도우와 동일하게 처리
    // 실제로는 세그먼트별로 카운트를 관리해야 함
    return this.fixedWindowCheck(key);
  }

  /**
   * 토큰 버킷 방식 Rate Limit 확인
   * @private
   */
  private async tokenBucketCheck(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const status = await this.store.get(key);

    if (!status) {
      // 새 버킷 생성
      const newStatus: RateLimitStatus = {
        key,
        keyType: 'user',
        count: this.config.bucketSize - 1, // 1개 토큰 소비
        limit: this.config.bucketSize,
        windowStart: now,
        windowEnd: now + this.config.windowMs,
        firstRequestAt: now,
        lastRequestAt: now,
      };
      await this.store.increment(key, this.config.windowMs);

      this.updateMetrics(key, true);

      return {
        allowed: true,
        remaining: newStatus.count,
        resetAt: newStatus.windowEnd,
        current: 1,
        limit: this.config.bucketSize,
        retryAfter: 0,
      };
    }

    // 경과 시간에 따라 토큰 보충
    const elapsed = now - (status.lastRequestAt ?? status.windowStart);
    const tokensToAdd = Math.floor(elapsed / 1000) * this.config.refillRate;
    const currentTokens = Math.min(
      this.config.bucketSize,
      status.count + tokensToAdd
    );

    const allowed = currentTokens >= 1;
    const remaining = allowed ? currentTokens - 1 : currentTokens;

    if (allowed) {
      status.count = remaining;
      status.lastRequestAt = now;
      await this.store.increment(key, this.config.windowMs);
    }

    this.updateMetrics(key, allowed);

    return {
      allowed,
      remaining,
      resetAt: status.windowEnd,
      current: this.config.bucketSize - remaining,
      limit: this.config.bucketSize,
      retryAfter: allowed ? 0 : Math.ceil((1 - currentTokens) / this.config.refillRate * 1000),
    };
  }

  /**
   * Rate Limit 초기화
   * @param key - Rate Limit 키
   */
  async resetRateLimit(key: string): Promise<void> {
    const prefixedKey = `${this.config.keyPrefix}:${key}`;
    await this.store.reset(prefixedKey);
  }

  /**
   * 남은 요청 수 조회
   * @param key - Rate Limit 키
   * @returns 남은 요청 수
   */
  async getRemainingRequests(key: string): Promise<number> {
    const result = await this.checkRateLimit(key);
    return result.remaining;
  }

  /**
   * Rate Limit 상태 조회
   * @param key - Rate Limit 키
   * @returns Rate Limit 상태 또는 null
   */
  async getStatus(key: string): Promise<RateLimitStatus | null> {
    const prefixedKey = `${this.config.keyPrefix}:${key}`;
    return this.store.get(prefixedKey);
  }

  /**
   * 메트릭 업데이트
   * @private
   */
  private updateMetrics(key: string, allowed: boolean): void {
    this.metrics.totalRequests += 1;
    if (allowed) {
      this.metrics.allowedRequests += 1;
    } else {
      this.metrics.blockedRequests += 1;
    }
    this.metrics.blockRate = this.metrics.blockedRequests / this.metrics.totalRequests;
    this.metrics.lastUpdatedAt = Date.now();

    // 키별 메트릭
    if (!this.metrics.byKey[key]) {
      this.metrics.byKey[key] = {
        requests: 0,
        blocked: 0,
        lastRequestAt: Date.now(),
      };
    }
    this.metrics.byKey[key].requests += 1;
    if (!allowed) {
      this.metrics.byKey[key].blocked += 1;
    }
    this.metrics.byKey[key].lastRequestAt = Date.now();
  }

  /**
   * 메트릭 조회
   * @returns Rate Limit 메트릭
   */
  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /**
   * 메트릭 초기화
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      blockRate: 0,
      byKey: {},
      collectionStartedAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };
  }

  /**
   * Rate Limiter 종료
   */
  destroy(): void {
    if (this.store instanceof MemoryStore) {
      this.store.destroy();
    }
  }
}

/**
 * Rate Limiter 인스턴스 생성
 * @param config - Rate Limit 설정
 * @returns Rate Limiter 인스턴스
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * 기본 Rate Limiter (100 requests/minute)
 */
export const defaultRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1분
  keyPrefix: 'default',
});
