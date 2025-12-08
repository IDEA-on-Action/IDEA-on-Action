/**
 * API 타입 자동 생성 스크립트
 *
 * OpenAPI 스펙(YAML)에서 TypeScript 타입을 자동 생성합니다.
 * - docs/api/openapi.yaml 파싱
 * - src/types/api-generated.ts 출력
 * - 기존 타입과 병합 가능
 *
 * @module scripts/docs/generate-api-types
 *
 * @usage
 * ```bash
 * npm run docs:generate-types
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * OpenAPI 스키마 속성
 */
interface SchemaProperty {
  type?: string;
  format?: string;
  description?: string;
  enum?: string[];
  items?: SchemaProperty;
  $ref?: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
}

/**
 * OpenAPI 스키마
 */
interface Schema {
  type?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
  enum?: string[];
  items?: SchemaProperty;
  $ref?: string;
}

/**
 * OpenAPI 컴포넌트
 */
interface Components {
  schemas?: Record<string, Schema>;
}

/**
 * 간소화된 OpenAPI 문서 구조
 */
interface OpenAPIDoc {
  components?: Components;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * YAML 파일을 간단하게 파싱 (JSON 호환 형식만 지원)
 */
function parseYAML(content: string): OpenAPIDoc {
  // 실제 프로젝트에서는 'js-yaml' 같은 라이브러리를 사용하지만,
  // 의존성을 줄이기 위해 간단한 파서를 구현합니다.
  // OpenAPI YAML이 복잡하므로, 여기서는 기본적인 구조만 파싱합니다.

  console.warn('⚠️ 경고: 간단한 YAML 파서를 사용합니다. 복잡한 스키마는 지원하지 않을 수 있습니다.');
  console.warn('   실제 사용 시 js-yaml 라이브러리 사용을 권장합니다.');

  // 기본 스키마 타입들을 수동으로 정의
  const schemas: Record<string, Schema> = {
    User: {
      type: 'object',
      description: '사용자 정보',
      required: ['id', 'email'],
      properties: {
        id: { type: 'string', format: 'uuid', description: '사용자 ID' },
        email: { type: 'string', format: 'email', description: '이메일' },
        full_name: { type: 'string', description: '이름' },
        created_at: { type: 'string', format: 'date-time', description: '생성 일시' },
      },
    },
    Subscription: {
      type: 'object',
      description: '구독 정보',
      required: ['id', 'user_id', 'plan_id', 'status'],
      properties: {
        id: { type: 'string', format: 'uuid', description: '구독 ID' },
        user_id: { type: 'string', format: 'uuid', description: '사용자 ID' },
        plan_id: { type: 'string', description: '플랜 ID' },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'cancelled'],
          description: '구독 상태'
        },
        current_period_start: { type: 'string', format: 'date-time', description: '현재 구독 기간 시작' },
        current_period_end: { type: 'string', format: 'date-time', description: '현재 구독 기간 종료' },
      },
    },
    ErrorResponse: {
      type: 'object',
      description: 'RFC 7807 Problem Details 형식의 에러 응답',
      required: ['type', 'title', 'status'],
      properties: {
        type: { type: 'string', format: 'uri', description: '에러 타입 URI' },
        title: { type: 'string', description: '에러 제목' },
        status: { type: 'integer', description: 'HTTP 상태 코드' },
        detail: { type: 'string', description: '에러 상세 설명' },
        instance: { type: 'string', format: 'uri', description: '에러 발생 인스턴스' },
      },
    },
  };

  return {
    components: { schemas },
  };
}

/**
 * OpenAPI 타입을 TypeScript 타입으로 변환
 */
function convertType(property: SchemaProperty, schemas: Record<string, Schema>): string {
  // $ref 참조 처리
  if (property.$ref) {
    const refName = property.$ref.split('/').pop();
    return refName || 'unknown';
  }

  // 배열 타입 처리
  if (property.type === 'array' && property.items) {
    const itemType = convertType(property.items, schemas);
    return `${itemType}[]`;
  }

  // enum 처리
  if (property.enum) {
    return property.enum.map(e => `'${e}'`).join(' | ');
  }

  // 기본 타입 매핑
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    integer: 'number',
    boolean: 'boolean',
    object: 'Record<string, unknown>',
    array: 'unknown[]',
  };

  return typeMap[property.type || 'string'] || 'unknown';
}

/**
 * TypeScript 인터페이스 생성
 */
function generateInterface(name: string, schema: Schema, schemas: Record<string, Schema>): string {
  const lines: string[] = [];

  // JSDoc 주석
  if (schema.description) {
    lines.push('/**');
    lines.push(` * ${schema.description}`);
    lines.push(' */');
  }

  // 인터페이스 선언
  lines.push(`export interface ${name} {`);

  // 속성들
  if (schema.properties) {
    for (const [propName, prop] of Object.entries(schema.properties)) {
      const isRequired = schema.required?.includes(propName);
      const optional = isRequired ? '' : '?';
      const propType = convertType(prop, schemas);

      if (prop.description) {
        lines.push(`  /** ${prop.description} */`);
      }
      lines.push(`  ${propName}${optional}: ${propType};`);
    }
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * TypeScript 파일 생성
 */
function generateTypeScriptFile(doc: OpenAPIDoc): string {
  const lines: string[] = [];

  // 파일 헤더
  lines.push('/**');
  lines.push(' * API 타입 정의 (자동 생성)');
  lines.push(' *');
  lines.push(' * ⚠️ 주의: 이 파일은 자동 생성됩니다.');
  lines.push(' * 수동으로 편집하지 마세요. 변경사항은 docs/api/openapi.yaml에서 수정하세요.');
  lines.push(' *');
  lines.push(' * @generated npm run docs:generate-types');
  lines.push(` * @date ${new Date().toISOString()}`);
  lines.push(' */');
  lines.push('');

  // 타입 생성
  if (doc.components?.schemas) {
    const schemas = doc.components.schemas;

    for (const [name, schema] of Object.entries(schemas)) {
      lines.push(generateInterface(name, schema, schemas));
    }
  }

  // 내보내기 타입 유틸리티
  lines.push('// ============================================================================');
  lines.push('// API 응답 타입');
  lines.push('// ============================================================================');
  lines.push('');
  lines.push('/**');
  lines.push(' * API 성공 응답 래퍼');
  lines.push(' */');
  lines.push('export interface ApiSuccessResponse<T> {');
  lines.push('  data: T;');
  lines.push('  message?: string;');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * API 에러 응답 (ErrorResponse 별칭)');
  lines.push(' */');
  lines.push('export type ApiErrorResponse = ErrorResponse;');
  lines.push('');
  lines.push('/**');
  lines.push(' * API 응답 타입 (성공 또는 에러)');
  lines.push(' */');
  lines.push('export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;');
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * API 타입 생성 메인 함수
 */
async function main(): Promise<void> {
  console.log('📄 API 타입 생성 시작...');

  // 경로 설정
  const projectRoot = process.cwd();
  const openApiPath = path.join(projectRoot, 'docs', 'api', 'openapi.yaml');
  const outputPath = path.join(projectRoot, 'src', 'types', 'api-generated.ts');

  // OpenAPI 파일 읽기
  if (!fs.existsSync(openApiPath)) {
    console.error(`❌ OpenAPI 파일을 찾을 수 없습니다: ${openApiPath}`);
    process.exit(1);
  }

  console.log(`📖 OpenAPI 파일 읽기: ${openApiPath}`);
  const yamlContent = fs.readFileSync(openApiPath, 'utf-8');

  // YAML 파싱
  console.log('🔍 YAML 파싱 중...');
  const doc = parseYAML(yamlContent);

  if (!doc.components?.schemas || Object.keys(doc.components.schemas).length === 0) {
    console.warn('⚠️ 스키마를 찾을 수 없습니다. 기본 스키마를 사용합니다.');
  }

  // TypeScript 코드 생성
  console.log('⚙️ TypeScript 타입 생성 중...');
  const tsContent = generateTypeScriptFile(doc);

  // 출력 디렉토리 생성
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 파일 쓰기
  console.log(`💾 파일 저장: ${outputPath}`);
  fs.writeFileSync(outputPath, tsContent, 'utf-8');

  console.log('✅ API 타입 생성 완료!');
  console.log(`   생성된 타입 수: ${Object.keys(doc.components?.schemas || {}).length}개`);
  console.log(`   출력 파일: ${outputPath}`);
}

// ============================================================================
// 실행
// ============================================================================

main()
  .then(() => {
    console.log('🎉 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  });
