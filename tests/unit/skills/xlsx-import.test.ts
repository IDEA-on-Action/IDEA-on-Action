/**
 * xlsx Import 유닛 테스트
 *
 * @module tests/unit/skills/xlsx-import
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import {
  parseExcelFile,
  validateData,
  mapColumns,
  importToSupabase,
  batchImport,
  importExcelToDatabase,
} from '@/lib/skills/xlsx/import';
import type {
  ImportConfig,
  ColumnMapping,
  ValidationRule,
  ImportProgress,
} from '@/types/xlsx-import.types';

// Workers API 클라이언트 모킹 (Cloudflare Workers로 마이그레이션됨)
vi.mock('@/integrations/cloudflare/client', () => ({
  dataImportApi: {
    batchInsert: vi.fn().mockResolvedValue({
      data: [{ id: '1' }, { id: '2' }],
      error: null,
      status: 200,
    }),
  },
}));

// useAuth 모킹 (토큰 제공)
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    getAccessToken: vi.fn(() => 'test-token'),
  })),
}));

// localStorage 모킹 (importToDatabase에서 직접 접근)
// vi.stubGlobal을 사용하여 테스트 격리 보장
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => {
    if (key === 'workers_auth_tokens') {
      return JSON.stringify({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
        user: { id: 'test-user', email: 'test@example.com' },
      });
    }
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

// ============================================================================
// 테스트 헬퍼 함수
// ============================================================================

/**
 * Buffer를 ArrayBuffer로 안전하게 변환 (CI 환경 호환)
 */
function bufferToArrayBuffer(buffer: Buffer | ArrayBuffer): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  }
  // Buffer를 Uint8Array로 복사하여 새로운 ArrayBuffer 생성
  const uint8Array = new Uint8Array(buffer);
  const arrayBuffer = new ArrayBuffer(uint8Array.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(uint8Array);
  return arrayBuffer;
}

/**
 * Excel 파일 생성 헬퍼 (ExcelJS 기반 - File.arrayBuffer 모킹 포함)
 */
async function createTestExcelFile(
  data: unknown[][],
  sheetName = 'Sheet1',
  filename = 'test.xlsx'
): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // 데이터 추가
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // 버퍼로 변환 (CI 환경 호환)
  const buffer = await workbook.xlsx.writeBuffer();
  const arrayBuffer = bufferToArrayBuffer(buffer as Buffer);

  const file = new File([new Uint8Array(arrayBuffer)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // File.arrayBuffer 모킹 (Node.js 환경용)
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => arrayBuffer,
    writable: true,
    configurable: true,
  });

  return file;
}

// ============================================================================
// parseExcelFile 테스트
// ============================================================================

describe('parseExcelFile', () => {
  it('Excel 파일을 올바르게 파싱해야 한다', async () => {
    const file = await createTestExcelFile([
      ['이름', '나이', '이메일'],
      ['홍길동', '30', 'hong@example.com'],
      ['김철수', '25', 'kim@example.com'],
    ]);

    const result = await parseExcelFile(file);

    expect(result.sheetName).toBe('Sheet1');
    expect(result.headers).toEqual(['이름', '나이', '이메일']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      이름: '홍길동',
      나이: '30',
      이메일: 'hong@example.com',
    });
    expect(result.metadata.filename).toBe('test.xlsx');
    expect(result.metadata.availableSheets).toContain('Sheet1');
  });

  it('빈 행을 자동으로 제거해야 한다', async () => {
    // ExcelJS에서 빈 문자열도 데이터로 취급되므로 null만 사용
    const file = await createTestExcelFile([
      ['이름', '나이'],
      ['홍길동', '30'],
      [null, null],
      ['김철수', '25'],
    ]);

    const result = await parseExcelFile(file);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].이름).toBe('홍길동');
    expect(result.rows[1].이름).toBe('김철수');
  });

  it('지정된 시트를 파싱해야 한다', async () => {
    // 여러 시트가 있는 워크북 생성 (ExcelJS 사용)
    const workbook = new ExcelJS.Workbook();
    const ws1 = workbook.addWorksheet('Sheet1');
    ws1.addRow(['A', 'B']);
    ws1.addRow(['1', '2']);
    const ws2 = workbook.addWorksheet('Sheet2');
    ws2.addRow(['X', 'Y']);
    ws2.addRow(['3', '4']);

    const buffer = await workbook.xlsx.writeBuffer();
    const arrayBuffer = bufferToArrayBuffer(buffer as Buffer);
    const file = new File([new Uint8Array(arrayBuffer)], 'test.xlsx');

    // File.arrayBuffer 모킹 (CI 환경 호환)
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => arrayBuffer,
      writable: true,
      configurable: true,
    });

    const result = await parseExcelFile(file, 'Sheet2');

    expect(result.sheetName).toBe('Sheet2');
    expect(result.headers).toEqual(['X', 'Y']);
  });

  it('존재하지 않는 시트명을 지정하면 에러를 발생시켜야 한다', async () => {
    const file = await createTestExcelFile([['A'], ['1']]);

    await expect(parseExcelFile(file, 'NonExistent')).rejects.toThrow(
      '시트를 찾을 수 없습니다'
    );
  });

  it('빈 시트는 에러를 발생시켜야 한다', async () => {
    const file = await createTestExcelFile([]);

    // ExcelJS로 마이그레이션 후 빈 시트는 '헤더를 찾을 수 없습니다' 에러 발생
    await expect(parseExcelFile(file)).rejects.toThrow('헤더를 찾을 수 없습니다');
  });
});

// ============================================================================
// validateData 테스트
// ============================================================================

describe('validateData', () => {
  it('필수 필드가 비어있으면 에러를 반환해야 한다', () => {
    const data = [
      { 이름: '홍길동', 나이: '30' },
      { 이름: '', 나이: '25' },
    ];

    const mapping: ColumnMapping[] = [
      { excelColumn: '이름', dbField: 'name', type: 'string', required: true },
      { excelColumn: '나이', dbField: 'age', type: 'number' },
    ];

    const result = validateData(data, [], mapping);

    expect(result.isValid).toBe(false);
    expect(result.validRowCount).toBe(1);
    expect(result.invalidRowCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3); // 1-based + 헤더
    expect(result.errors[0].type).toBe('validation');
  });

  it('required 규칙을 검증해야 한다', () => {
    const data = [{ email: 'test@example.com' }, { email: '' }];

    const rules: ValidationRule[] = [
      {
        field: 'email',
        type: 'required',
        message: '이메일은 필수입니다',
      },
    ];

    const result = validateData(data, rules);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('이메일은 필수입니다');
  });

  it('format 규칙을 검증해야 한다', () => {
    const data = [
      { email: 'valid@example.com' },
      { email: 'invalid-email' },
    ];

    const rules: ValidationRule[] = [
      {
        field: 'email',
        type: 'format',
        message: '올바른 이메일 형식이 아닙니다',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    ];

    const result = validateData(data, rules);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].column).toBe('email');
  });

  it('range 규칙을 검증해야 한다', () => {
    const data = [{ age: 20 }, { age: 150 }];

    const rules: ValidationRule[] = [
      {
        field: 'age',
        type: 'range',
        message: '나이가 범위를 벗어났습니다',
        min: 0,
        max: 120,
      },
    ];

    const result = validateData(data, rules);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].value).toBe(150);
  });

  it('custom 규칙을 검증해야 한다', () => {
    const data = [{ username: 'user123' }, { username: 'ab' }];

    const rules: ValidationRule[] = [
      {
        field: 'username',
        type: 'custom',
        message: '사용자명은 최소 3자 이상이어야 합니다',
        validate: (value) => {
          return typeof value === 'string' && value.length >= 3;
        },
      },
    ];

    const result = validateData(data, rules);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('최소 3자');
  });

  it('모든 데이터가 유효하면 isValid가 true여야 한다', () => {
    const data = [
      { name: '홍길동', age: 30 },
      { name: '김철수', age: 25 },
    ];

    const mapping: ColumnMapping[] = [
      { excelColumn: 'name', dbField: 'name', type: 'string', required: true },
      { excelColumn: 'age', dbField: 'age', type: 'number', required: true },
    ];

    const result = validateData(data, [], mapping);

    expect(result.isValid).toBe(true);
    expect(result.validRowCount).toBe(2);
    expect(result.invalidRowCount).toBe(0);
  });
});

// ============================================================================
// mapColumns 테스트
// ============================================================================

describe('mapColumns', () => {
  it('Excel 컬럼을 DB 필드로 매핑해야 한다', () => {
    const data = [
      { 이름: '홍길동', 나이: '30', 활성: 'true' },
    ];

    const mapping: ColumnMapping[] = [
      { excelColumn: '이름', dbField: 'name', type: 'string' },
      { excelColumn: '나이', dbField: 'age', type: 'number' },
      { excelColumn: '활성', dbField: 'is_active', type: 'boolean' },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0]).toEqual({
      name: '홍길동',
      age: 30,
      is_active: true,
    });
  });

  it('문자열을 숫자로 변환해야 한다', () => {
    const data = [{ price: '1000' }];
    const mapping: ColumnMapping[] = [
      { excelColumn: 'price', dbField: 'price', type: 'number' },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0].price).toBe(1000);
    expect(typeof result[0].price).toBe('number');
  });

  it('문자열을 불린으로 변환해야 한다', () => {
    const data = [
      { active: 'true' },
      { active: 'false' },
      { active: '1' },
      { active: 'yes' },
    ];
    const mapping: ColumnMapping[] = [
      { excelColumn: 'active', dbField: 'is_active', type: 'boolean' },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0].is_active).toBe(true);
    expect(result[1].is_active).toBe(false);
    expect(result[2].is_active).toBe(true);
    expect(result[3].is_active).toBe(true);
  });

  it('날짜 문자열을 ISO 형식으로 변환해야 한다', () => {
    const data = [{ created: '2025-01-01' }];
    const mapping: ColumnMapping[] = [
      { excelColumn: 'created', dbField: 'created_at', type: 'date' },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0].created_at).toContain('2025-01-01');
  });

  it('기본값을 적용해야 한다', () => {
    const data = [{ name: '' }];
    const mapping: ColumnMapping[] = [
      {
        excelColumn: 'name',
        dbField: 'name',
        type: 'string',
        defaultValue: 'Unknown',
      },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0].name).toBe('Unknown');
  });

  it('transform 함수를 적용해야 한다', () => {
    const data = [{ name: 'john doe' }];
    const mapping: ColumnMapping[] = [
      {
        excelColumn: 'name',
        dbField: 'name',
        type: 'string',
        transform: (value) => String(value).toUpperCase(),
      },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0].name).toBe('JOHN DOE');
  });

  it('JSON 문자열을 파싱해야 한다', () => {
    const data = [{ metadata: '{"key": "value"}' }];
    const mapping: ColumnMapping[] = [
      { excelColumn: 'metadata', dbField: 'metadata', type: 'json' },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0].metadata).toEqual({ key: 'value' });
  });

  it('잘못된 JSON 문자열은 null로 처리해야 한다', () => {
    const data = [{ metadata: 'invalid json' }];
    const mapping: ColumnMapping[] = [
      { excelColumn: 'metadata', dbField: 'metadata', type: 'json' },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0].metadata).toBeNull();
  });

  it('숫자 변환 실패 시 null을 반환해야 한다', () => {
    const data = [{ age: 'not-a-number' }];
    const mapping: ColumnMapping[] = [
      { excelColumn: 'age', dbField: 'age', type: 'number' },
    ];

    const result = mapColumns(data, mapping);

    expect(result[0].age).toBeNull();
  });
});

// ============================================================================
// importToSupabase 테스트
// ============================================================================

describe('importToSupabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('데이터를 Supabase에 삽입해야 한다', async () => {
    const data = [
      { name: '홍길동', age: 30 },
      { name: '김철수', age: 25 },
    ];

    const result = await importToSupabase('users', data);

    expect(result.success).toBe(true);
    expect(result.insertedIds).toEqual(['1', '2']);
  });
});

// ============================================================================
// batchImport 테스트
// ============================================================================

describe('batchImport', () => {
  it('데이터를 배치 단위로 삽입해야 한다', async () => {
    const data = Array.from({ length: 250 }, (_, i) => ({
      name: `User ${i}`,
      age: 20 + i,
    }));

    const progressCalls: ImportProgress[] = [];
    const result = await batchImport({
      tableName: 'users',
      data,
      batchSize: 100,
      onProgress: (progress) => progressCalls.push(progress),
    });

    expect(result.successCount).toBe(250);
    expect(result.totalCount).toBe(250);
    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0].stage).toBe('importing');
  });

  it('배치 크기를 지정할 수 있어야 한다', async () => {
    const data = Array.from({ length: 50 }, (_, i) => ({
      name: `User ${i}`,
    }));

    const progressCalls: ImportProgress[] = [];
    await batchImport({
      tableName: 'users',
      data,
      batchSize: 10,
      onProgress: (progress) => progressCalls.push(progress),
    });

    // 50개 데이터, 배치 크기 10 = 5개 배치
    const batchProgresses = progressCalls.filter((p) => p.currentBatch !== undefined);
    const maxBatch = Math.max(...batchProgresses.map((p) => p.currentBatch || 0));
    expect(maxBatch).toBe(5);
  });

  it('진행률을 올바르게 계산해야 한다', async () => {
    const data = Array.from({ length: 100 }, (_, i) => ({
      name: `User ${i}`,
    }));

    const progressCalls: ImportProgress[] = [];
    await batchImport({
      tableName: 'users',
      data,
      batchSize: 25,
      onProgress: (progress) => progressCalls.push(progress),
    });

    const lastProgress = progressCalls[progressCalls.length - 1];
    expect(lastProgress.percentage).toBe(100);
    expect(lastProgress.processedRows).toBe(100);
  });
});

// ============================================================================
// importExcelToDatabase 통합 테스트
// ============================================================================

describe('importExcelToDatabase', () => {
  it('전체 가져오기 프로세스를 실행해야 한다', async () => {
    const file = await createTestExcelFile([
      ['이름', '나이', '이메일'],
      ['홍길동', '30', 'hong@example.com'],
      ['김철수', '25', 'kim@example.com'],
    ]);

    const config: ImportConfig = {
      columnMapping: [
        { excelColumn: '이름', dbField: 'name', type: 'string', required: true },
        { excelColumn: '나이', dbField: 'age', type: 'number' },
        { excelColumn: '이메일', dbField: 'email', type: 'string' },
      ],
      batchSize: 100,
    };

    const progressCalls: ImportProgress[] = [];
    const result = await importExcelToDatabase(
      file,
      'users',
      config,
      (progress) => progressCalls.push(progress)
    );

    expect(result.successCount).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(progressCalls.length).toBeGreaterThan(0);

    // 모든 단계를 거쳐야 함
    const stages = progressCalls.map((p) => p.stage);
    expect(stages).toContain('parsing');
    expect(stages).toContain('validating');
    expect(stages).toContain('mapping');
    expect(stages).toContain('importing');
  });

  it('검증 실패 시 가져오기를 중단해야 한다', async () => {
    const file = await createTestExcelFile([
      ['이름', '나이'],
      ['홍길동', '30'],
      ['', '25'], // 필수 필드 누락
    ]);

    const config: ImportConfig = {
      columnMapping: [
        { excelColumn: '이름', dbField: 'name', type: 'string', required: true },
        { excelColumn: '나이', dbField: 'age', type: 'number' },
      ],
    };

    const result = await importExcelToDatabase(file, 'users', config);

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
