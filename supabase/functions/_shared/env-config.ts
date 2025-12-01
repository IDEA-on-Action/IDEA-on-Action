/**
 * 환경 설정 모듈
 *
 * Sandbox, Staging, Production 환경을 감지하고
 * 환경별 설정을 로드하는 공유 모듈
 */

/**
 * 지원하는 환경 타입
 */
export type Environment = 'production' | 'staging' | 'sandbox' | 'local'

/**
 * 환경별 설정 인터페이스
 */
export interface EnvironmentConfig {
  environment: Environment
  isProduction: boolean
  isStaging: boolean
  isSandbox: boolean
  isLocal: boolean
  features: FeatureFlags
  rateLimit: RateLimitConfig
  session: SessionConfig
  cache: CacheConfig
  logging: LoggingConfig
}

/**
 * 기능 플래그 인터페이스
 */
export interface FeatureFlags {
  mockPayments: boolean
  dataIsolation: boolean
  webhooksEnabled: boolean
  detailedLogging: boolean
  autoCleanup: boolean
  permissiveCors: boolean
}

/**
 * 속도 제한 설정
 */
export interface RateLimitConfig {
  enabled: boolean
  requests: number
  windowSeconds: number
}

/**
 * 세션 설정
 */
export interface SessionConfig {
  timeoutSeconds: number
  refreshEnabled: boolean
}

/**
 * 캐시 설정
 */
export interface CacheConfig {
  enabled: boolean
  ttlSeconds: number
}

/**
 * 로깅 설정
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  logSql: boolean
  logApiCalls: boolean
}

/**
 * 현재 환경 감지
 *
 * 다음 순서로 환경을 감지합니다:
 * 1. VITE_ENV 환경 변수
 * 2. VITE_MINU_ENV 환경 변수
 * 3. URL 기반 감지
 * 4. 기본값: 'local'
 *
 * @returns 감지된 환경
 */
export function detectEnvironment(): Environment {
  // 1. VITE_ENV 환경 변수 확인
  const viteEnv = Deno.env.get('VITE_ENV')
  if (viteEnv && isValidEnvironment(viteEnv)) {
    return viteEnv as Environment
  }

  // 2. VITE_MINU_ENV 환경 변수 확인
  const minuEnv = Deno.env.get('VITE_MINU_ENV')
  if (minuEnv && isValidEnvironment(minuEnv)) {
    return minuEnv as Environment
  }

  // 3. Supabase URL 기반 감지
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
  if (supabaseUrl) {
    if (supabaseUrl.includes('sandbox')) return 'sandbox'
    if (supabaseUrl.includes('staging')) return 'staging'
    if (supabaseUrl.includes('ideaonaction.ai')) return 'production'
  }

  // 4. 기본값: local
  return 'local'
}

/**
 * 유효한 환경인지 검증
 */
function isValidEnvironment(env: string): boolean {
  return ['production', 'staging', 'sandbox', 'local'].includes(env)
}

/**
 * 환경별 기본 설정
 */
const DEFAULT_CONFIGS: Record<Environment, Partial<EnvironmentConfig>> = {
  production: {
    features: {
      mockPayments: false,
      dataIsolation: false,
      webhooksEnabled: true,
      detailedLogging: false,
      autoCleanup: false,
      permissiveCors: false,
    },
    rateLimit: {
      enabled: true,
      requests: 100,
      windowSeconds: 60,
    },
    session: {
      timeoutSeconds: 7200, // 2시간
      refreshEnabled: true,
    },
    cache: {
      enabled: true,
      ttlSeconds: 300, // 5분
    },
    logging: {
      level: 'warn',
      logSql: false,
      logApiCalls: false,
    },
  },
  staging: {
    features: {
      mockPayments: true,
      dataIsolation: true,
      webhooksEnabled: true,
      detailedLogging: true,
      autoCleanup: true,
      permissiveCors: false,
    },
    rateLimit: {
      enabled: true,
      requests: 500,
      windowSeconds: 60,
    },
    session: {
      timeoutSeconds: 7200, // 2시간
      refreshEnabled: true,
    },
    cache: {
      enabled: true,
      ttlSeconds: 120, // 2분
    },
    logging: {
      level: 'info',
      logSql: true,
      logApiCalls: true,
    },
  },
  sandbox: {
    features: {
      mockPayments: true,
      dataIsolation: true,
      webhooksEnabled: false,
      detailedLogging: true,
      autoCleanup: true,
      permissiveCors: true,
    },
    rateLimit: {
      enabled: true,
      requests: 1000,
      windowSeconds: 60,
    },
    session: {
      timeoutSeconds: 3600, // 1시간
      refreshEnabled: false,
    },
    cache: {
      enabled: false,
      ttlSeconds: 60, // 1분
    },
    logging: {
      level: 'debug',
      logSql: true,
      logApiCalls: true,
    },
  },
  local: {
    features: {
      mockPayments: true,
      dataIsolation: true,
      webhooksEnabled: false,
      detailedLogging: true,
      autoCleanup: false,
      permissiveCors: true,
    },
    rateLimit: {
      enabled: false,
      requests: 10000,
      windowSeconds: 60,
    },
    session: {
      timeoutSeconds: 86400, // 24시간
      refreshEnabled: true,
    },
    cache: {
      enabled: false,
      ttlSeconds: 30,
    },
    logging: {
      level: 'debug',
      logSql: true,
      logApiCalls: true,
    },
  },
}

/**
 * 환경 설정 로드
 *
 * @param env - 환경 (생략시 자동 감지)
 * @returns 환경별 설정
 */
export function loadEnvironmentConfig(env?: Environment): EnvironmentConfig {
  const environment = env || detectEnvironment()
  const defaultConfig = DEFAULT_CONFIGS[environment]

  return {
    environment,
    isProduction: environment === 'production',
    isStaging: environment === 'staging',
    isSandbox: environment === 'sandbox',
    isLocal: environment === 'local',
    features: defaultConfig.features!,
    rateLimit: defaultConfig.rateLimit!,
    session: defaultConfig.session!,
    cache: defaultConfig.cache!,
    logging: defaultConfig.logging!,
  }
}

/**
 * 특정 기능이 활성화되어 있는지 확인
 *
 * @param feature - 확인할 기능명
 * @param env - 환경 (생략시 자동 감지)
 * @returns 기능 활성화 여부
 */
export function isFeatureEnabled(
  feature: keyof FeatureFlags,
  env?: Environment
): boolean {
  const config = loadEnvironmentConfig(env)
  return config.features[feature]
}

/**
 * Sandbox 모드인지 확인
 *
 * @returns Sandbox 모드 여부
 */
export function isSandboxMode(): boolean {
  const environment = detectEnvironment()
  return environment === 'sandbox'
}

/**
 * Production 모드인지 확인
 *
 * @returns Production 모드 여부
 */
export function isProductionMode(): boolean {
  const environment = detectEnvironment()
  return environment === 'production'
}

/**
 * 환경별 로거
 */
export class EnvironmentLogger {
  private config: EnvironmentConfig

  constructor(env?: Environment) {
    this.config = loadEnvironmentConfig(env)
  }

  /**
   * Debug 레벨 로그
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[${this.config.environment.toUpperCase()}] [DEBUG]`, message, ...args)
    }
  }

  /**
   * Info 레벨 로그
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[${this.config.environment.toUpperCase()}] [INFO]`, message, ...args)
    }
  }

  /**
   * Warn 레벨 로그
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[${this.config.environment.toUpperCase()}] [WARN]`, message, ...args)
    }
  }

  /**
   * Error 레벨 로그
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[${this.config.environment.toUpperCase()}] [ERROR]`, message, ...args)
    }
  }

  /**
   * SQL 쿼리 로그
   */
  sql(query: string, params?: unknown[]): void {
    if (this.config.logging.logSql) {
      console.debug(`[${this.config.environment.toUpperCase()}] [SQL]`, query, params)
    }
  }

  /**
   * API 호출 로그
   */
  api(method: string, path: string, statusCode?: number): void {
    if (this.config.logging.logApiCalls) {
      console.info(
        `[${this.config.environment.toUpperCase()}] [API]`,
        method,
        path,
        statusCode ? `- ${statusCode}` : ''
      )
    }
  }

  /**
   * 로그 레벨 검증
   */
  private shouldLog(level: LoggingConfig['level']): boolean {
    const levels: LoggingConfig['level'][] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.config.logging.level)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex >= currentLevelIndex
  }
}

/**
 * 기본 로거 인스턴스
 */
export const logger = new EnvironmentLogger()

/**
 * 환경 정보 출력 (디버깅용)
 */
export function printEnvironmentInfo(): void {
  const config = loadEnvironmentConfig()
  console.log('='.repeat(60))
  console.log('Environment Configuration')
  console.log('='.repeat(60))
  console.log(`Environment: ${config.environment}`)
  console.log(`Production: ${config.isProduction}`)
  console.log(`Staging: ${config.isStaging}`)
  console.log(`Sandbox: ${config.isSandbox}`)
  console.log(`Local: ${config.isLocal}`)
  console.log('\nFeature Flags:')
  Object.entries(config.features).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })
  console.log('\nRate Limit:')
  console.log(`  Enabled: ${config.rateLimit.enabled}`)
  console.log(`  Requests: ${config.rateLimit.requests}`)
  console.log(`  Window: ${config.rateLimit.windowSeconds}s`)
  console.log('\nSession:')
  console.log(`  Timeout: ${config.session.timeoutSeconds}s`)
  console.log(`  Refresh: ${config.session.refreshEnabled}`)
  console.log('\nCache:')
  console.log(`  Enabled: ${config.cache.enabled}`)
  console.log(`  TTL: ${config.cache.ttlSeconds}s`)
  console.log('\nLogging:')
  console.log(`  Level: ${config.logging.level}`)
  console.log(`  SQL: ${config.logging.logSql}`)
  console.log(`  API Calls: ${config.logging.logApiCalls}`)
  console.log('='.repeat(60))
}
