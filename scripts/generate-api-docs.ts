/**
 * API 문서 생성 스크립트
 *
 * docx Skill을 활용하여 프롬프트 템플릿 API 문서를 자동 생성합니다.
 * - REST API 엔드포인트
 * - TypeScript 타입 정의
 * - 사용 예시 (React 훅, 컴포넌트)
 * - 테이블 형식의 API 레퍼런스
 *
 * @module scripts/generate-api-docs
 *
 * @usage
 * ```bash
 * # Node.js 직접 실행
 * npx tsx scripts/generate-api-docs.ts
 *
 * # 또는 npm script 추가 후
 * npm run generate-api-docs
 * ```
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * API 엔드포인트 정보
 */
interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requestBody?: {
    contentType: string;
    schema: string;
    example: string;
  };
  responseBody?: {
    contentType: string;
    schema: string;
    example: string;
  };
  parameters?: {
    name: string;
    in: 'query' | 'path' | 'header';
    required: boolean;
    type: string;
    description: string;
  }[];
}

/**
 * TypeScript 타입 정보
 */
interface TypeDefinition {
  name: string;
  description: string;
  properties: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}

/**
 * 코드 예시
 */
interface CodeExample {
  title: string;
  language: string;
  code: string;
}

// ============================================================================
// 데이터 준비
// ============================================================================

/**
 * API 엔드포인트 목록
 */
const API_ENDPOINTS: APIEndpoint[] = [
  {
    method: 'GET',
    path: '/api/prompt-templates',
    description: '프롬프트 템플릿 목록을 조회합니다. 필터링, 정렬, 페이지네이션을 지원합니다.',
    parameters: [
      { name: 'category', in: 'query', required: false, type: 'string', description: '템플릿 카테고리 (rfp, requirements, plan, report, chat, custom)' },
      { name: 'service_id', in: 'query', required: false, type: 'string', description: '서비스 ID (minu-find, minu-frame, minu-build, minu-keep)' },
      { name: 'is_public', in: 'query', required: false, type: 'boolean', description: '공개 여부 필터' },
      { name: 'search', in: 'query', required: false, type: 'string', description: '검색어 (name 또는 description)' },
      { name: 'page', in: 'query', required: false, type: 'number', description: '페이지 번호 (기본값: 1)' },
      { name: 'pageSize', in: 'query', required: false, type: 'number', description: '페이지 크기 (기본값: 50)' },
    ],
    responseBody: {
      contentType: 'application/json',
      schema: 'PromptTemplateListResponse',
      example: JSON.stringify({
        templates: [
          {
            id: 'uuid-123',
            name: 'RFP 생성 템플릿',
            category: 'rfp',
            is_public: true,
            created_at: '2025-11-27T00:00:00Z',
          },
        ],
        totalCount: 42,
        hasMore: true,
      }, null, 2),
    },
  },
  {
    method: 'POST',
    path: '/api/prompt-templates',
    description: '새로운 프롬프트 템플릿을 생성합니다.',
    requestBody: {
      contentType: 'application/json',
      schema: 'CreatePromptTemplateInput',
      example: JSON.stringify({
        name: '내 RFP 템플릿',
        description: '정부 SI 프로젝트용 RFP',
        category: 'rfp',
        system_prompt: '당신은 RFP 작성 전문가입니다.',
        user_prompt_template: '{{projectName}} 프로젝트의 RFP를 작성해주세요.',
        variables: [
          { name: 'projectName', type: 'string', required: true, description: '프로젝트명' },
        ],
        is_public: false,
      }, null, 2),
    },
    responseBody: {
      contentType: 'application/json',
      schema: 'PromptTemplate',
      example: JSON.stringify({
        id: 'uuid-456',
        name: '내 RFP 템플릿',
        category: 'rfp',
        created_at: '2025-11-27T00:00:00Z',
      }, null, 2),
    },
  },
  {
    method: 'PUT',
    path: '/api/prompt-templates/:id',
    description: '기존 프롬프트 템플릿을 수정합니다.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: '템플릿 ID (UUID)' },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: 'UpdatePromptTemplateInput',
      example: JSON.stringify({
        name: '수정된 템플릿명',
        is_public: true,
      }, null, 2),
    },
    responseBody: {
      contentType: 'application/json',
      schema: 'PromptTemplate',
      example: JSON.stringify({
        id: 'uuid-456',
        name: '수정된 템플릿명',
        is_public: true,
        updated_at: '2025-11-27T01:00:00Z',
      }, null, 2),
    },
  },
  {
    method: 'DELETE',
    path: '/api/prompt-templates/:id',
    description: '프롬프트 템플릿을 삭제합니다.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: '템플릿 ID (UUID)' },
    ],
    responseBody: {
      contentType: 'application/json',
      schema: 'void',
      example: JSON.stringify({ success: true }, null, 2),
    },
  },
];

/**
 * TypeScript 타입 목록
 */
const TYPE_DEFINITIONS: TypeDefinition[] = [
  {
    name: 'PromptTemplate',
    description: '프롬프트 템플릿 엔티티',
    properties: [
      { name: 'id', type: 'string', required: true, description: '템플릿 ID (UUID)' },
      { name: 'name', type: 'string', required: true, description: '템플릿명' },
      { name: 'description', type: 'string | null', required: false, description: '설명' },
      { name: 'category', type: 'PromptTemplateCategory', required: true, description: '카테고리' },
      { name: 'system_prompt', type: 'string | null', required: false, description: '시스템 프롬프트' },
      { name: 'user_prompt_template', type: 'string', required: true, description: '사용자 프롬프트 템플릿' },
      { name: 'variables', type: 'PromptTemplateVariable[]', required: true, description: '변수 목록' },
      { name: 'is_public', type: 'boolean', required: true, description: '공개 여부' },
      { name: 'created_at', type: 'string', required: true, description: '생성 일시 (ISO 8601)' },
    ],
  },
  {
    name: 'PromptTemplateVariable',
    description: '프롬프트 템플릿 변수',
    properties: [
      { name: 'name', type: 'string', required: true, description: '변수명 ({{name}} 형태로 사용)' },
      { name: 'type', type: 'PromptVariableType', required: true, description: '변수 타입' },
      { name: 'required', type: 'boolean', required: true, description: '필수 여부' },
      { name: 'default', type: 'string | number | boolean | null', required: false, description: '기본값' },
      { name: 'description', type: 'string', required: true, description: '설명' },
    ],
  },
  {
    name: 'CreatePromptTemplateInput',
    description: '템플릿 생성 입력 타입',
    properties: [
      { name: 'name', type: 'string', required: true, description: '템플릿명' },
      { name: 'description', type: 'string', required: false, description: '설명' },
      { name: 'category', type: 'PromptTemplateCategory', required: true, description: '카테고리' },
      { name: 'system_prompt', type: 'string', required: false, description: '시스템 프롬프트' },
      { name: 'user_prompt_template', type: 'string', required: true, description: '사용자 프롬프트 템플릿' },
      { name: 'variables', type: 'PromptTemplateVariable[]', required: false, description: '변수 목록' },
      { name: 'is_public', type: 'boolean', required: false, description: '공개 여부 (기본값: false)' },
    ],
  },
];

/**
 * 코드 예시 목록
 */
const CODE_EXAMPLES: CodeExample[] = [
  {
    title: 'React 훅 사용 예시 - 템플릿 목록 조회',
    language: 'typescript',
    code: `import { usePromptTemplates } from '@/hooks/usePromptTemplates';

function TemplateList() {
  const { data, isLoading, error } = usePromptTemplates({
    category: 'rfp',
    limit: 20,
  });

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error.message}</div>;

  return (
    <ul>
      {data?.templates.map((template) => (
        <li key={template.id}>{template.name}</li>
      ))}
    </ul>
  );
}`,
  },
  {
    title: 'React 훅 사용 예시 - 템플릿 생성',
    language: 'typescript',
    code: `import { useCreatePromptTemplate } from '@/hooks/usePromptTemplates';

function CreateTemplateButton() {
  const createTemplate = useCreatePromptTemplate();

  const handleCreate = async () => {
    await createTemplate.mutateAsync({
      name: '내 RFP 템플릿',
      category: 'rfp',
      system_prompt: '당신은 RFP 작성 전문가입니다.',
      user_prompt_template: '{{projectName}} 프로젝트의 RFP를 작성해주세요.',
      variables: [
        { name: 'projectName', type: 'string', required: true, description: '프로젝트명' },
      ],
    });
  };

  return (
    <button onClick={handleCreate} disabled={createTemplate.isPending}>
      템플릿 생성
    </button>
  );
}`,
  },
  {
    title: 'PromptTemplateSelector 컴포넌트 사용',
    language: 'typescript',
    code: `import { PromptTemplateSelector } from '@/components/ai/PromptTemplateSelector';

function AIChat() {
  const handlePromptGenerate = (prompt: string, template: PromptTemplate) => {
    console.log('생성된 프롬프트:', prompt);
    // Claude API 호출 등
  };

  return (
    <div>
      <h1>AI 채팅</h1>
      <PromptTemplateSelector
        onPromptGenerate={handlePromptGenerate}
        autoShowPreview={true}
      />
    </div>
  );
}`,
  },
];

// ============================================================================
// 문서 생성 함수
// ============================================================================

/**
 * Word 문서 생성
 */
async function generateAPIDocument(): Promise<void> {
  console.log('📄 API 문서 생성 시작...');

  // 문서 섹션 구성
  const sections: (Paragraph | Table)[] = [];

  // 1. 제목
  sections.push(
    new Paragraph({
      text: 'IDEA on Action',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  sections.push(
    new Paragraph({
      text: '프롬프트 템플릿 API 문서',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // 2. 문서 정보
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '버전: ',
          bold: true,
        }),
        new TextRun('2.21.0'),
      ],
      spacing: { after: 100 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '생성 일시: ',
          bold: true,
        }),
        new TextRun(new Date().toLocaleString('ko-KR')),
      ],
      spacing: { after: 400 },
    })
  );

  // 3. 개요
  sections.push(
    new Paragraph({
      text: '개요',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  sections.push(
    new Paragraph({
      text: 'IDEA on Action 프로젝트의 프롬프트 템플릿 관리 API 문서입니다. Claude Skills 통합을 위한 템플릿 CRUD 기능을 제공합니다.',
      spacing: { after: 400 },
    })
  );

  // 4. REST API 엔드포인트
  sections.push(
    new Paragraph({
      text: 'REST API 엔드포인트',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  for (const endpoint of API_ENDPOINTS) {
    // 엔드포인트 제목
    sections.push(
      new Paragraph({
        text: `${endpoint.method} ${endpoint.path}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );

    // 설명
    sections.push(
      new Paragraph({
        text: endpoint.description,
        spacing: { after: 200 },
      })
    );

    // 파라미터 테이블
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      sections.push(
        new Paragraph({
          text: '파라미터',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      sections.push(createParameterTable(endpoint.parameters));
    }

    // 요청 본문
    if (endpoint.requestBody) {
      sections.push(
        new Paragraph({
          text: '요청 본문',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Content-Type: ',
              bold: true,
            }),
            new TextRun(endpoint.requestBody.contentType),
          ],
          spacing: { after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Schema: ',
              bold: true,
            }),
            new TextRun(endpoint.requestBody.schema),
          ],
          spacing: { after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: '예시:',
          bold: true,
          spacing: { after: 50 },
        })
      );

      sections.push(
        new Paragraph({
          text: endpoint.requestBody.example,
          style: 'CodeBlock',
          spacing: { after: 200 },
        })
      );
    }

    // 응답 본문
    if (endpoint.responseBody) {
      sections.push(
        new Paragraph({
          text: '응답 본문',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Content-Type: ',
              bold: true,
            }),
            new TextRun(endpoint.responseBody.contentType),
          ],
          spacing: { after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: '예시:',
          bold: true,
          spacing: { after: 50 },
        })
      );

      sections.push(
        new Paragraph({
          text: endpoint.responseBody.example,
          style: 'CodeBlock',
          spacing: { after: 200 },
        })
      );
    }
  }

  // 5. TypeScript 타입 정의
  sections.push(
    new Paragraph({
      text: 'TypeScript 타입 정의',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  for (const type of TYPE_DEFINITIONS) {
    sections.push(
      new Paragraph({
        text: type.name,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );

    sections.push(
      new Paragraph({
        text: type.description,
        spacing: { after: 200 },
      })
    );

    sections.push(createTypeTable(type.properties));
  }

  // 6. 사용 예시
  sections.push(
    new Paragraph({
      text: '사용 예시',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  for (const example of CODE_EXAMPLES) {
    sections.push(
      new Paragraph({
        text: example.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );

    sections.push(
      new Paragraph({
        text: example.code,
        style: 'CodeBlock',
        spacing: { after: 200 },
      })
    );
  }

  // 문서 생성
  const doc = new Document({
    creator: 'IDEA on Action',
    title: '프롬프트 템플릿 API 문서',
    description: 'Claude Skills 통합을 위한 프롬프트 템플릿 API 레퍼런스',
    sections: [
      {
        children: sections,
      },
    ],
  });

  // 파일 저장
  const buffer = await Packer.toBuffer(doc);
  const outputDir = path.join(process.cwd(), 'docs', 'api');
  const outputPath = path.join(outputDir, 'prompt-templates-api.docx');

  // 디렉토리 생성 (없으면)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ API 문서 생성 완료: ${outputPath}`);
}

/**
 * 파라미터 테이블 생성
 */
function createParameterTable(
  parameters: APIEndpoint['parameters']
): Table {
  if (!parameters) {
    return new Table({ rows: [] });
  }

  const rows: TableRow[] = [
    // 헤더
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: '이름', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: '위치', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: '타입', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: '필수', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: '설명', bold: true })] }),
      ],
    }),
    // 데이터 행
    ...parameters.map(
      (param) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(param.name)] }),
            new TableCell({ children: [new Paragraph(param.in)] }),
            new TableCell({ children: [new Paragraph(param.type)] }),
            new TableCell({ children: [new Paragraph(param.required ? 'O' : 'X')] }),
            new TableCell({ children: [new Paragraph(param.description)] }),
          ],
        })
    ),
  ];

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * 타입 속성 테이블 생성
 */
function createTypeTable(
  properties: TypeDefinition['properties']
): Table {
  const rows: TableRow[] = [
    // 헤더
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: '속성명', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: '타입', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: '필수', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: '설명', bold: true })] }),
      ],
    }),
    // 데이터 행
    ...properties.map(
      (prop) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(prop.name)] }),
            new TableCell({ children: [new Paragraph(prop.type)] }),
            new TableCell({ children: [new Paragraph(prop.required ? 'O' : 'X')] }),
            new TableCell({ children: [new Paragraph(prop.description)] }),
          ],
        })
    ),
  ];

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ============================================================================
// 메인 실행
// ============================================================================

generateAPIDocument()
  .then(() => {
    console.log('🎉 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  });
