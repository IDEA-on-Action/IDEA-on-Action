/**
 * Claude 모델 정보 (동적 로딩용)
 *
 * @description Vite 동적/정적 import 혼재 경고 해결을 위해 분리
 */

export const CLAUDE_MODEL_INFO = {
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: '가장 빠르고 효율적인 모델',
    contextWindow: 200000,
    maxOutput: 8192,
  },
  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: '가장 강력한 모델',
    contextWindow: 200000,
    maxOutput: 4096,
  },
  'claude-3-sonnet-20240229': {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    description: '균형 잡힌 성능',
    contextWindow: 200000,
    maxOutput: 4096,
  },
  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: '빠른 응답',
    contextWindow: 200000,
    maxOutput: 4096,
  },
} as const;
