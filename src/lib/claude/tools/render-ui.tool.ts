/**
 * render_ui Tool
 * AI 에이전트가 동적 UI를 생성할 수 있게 해주는 Claude Tool
 */

import type { A2UIComponent, A2UIMessage, A2UISurfaceType, RenderUIToolInput } from '@/lib/a2ui/types';
import { validateComponents, sanitizeMessage } from '@/lib/a2ui/validator';
import { ALLOWED_COMPONENTS } from '@/lib/a2ui/catalog';

/** 확장된 render_ui 입력 (surfaceType 포함) */
export interface RenderUIToolInputExtended extends RenderUIToolInput {
  /** Surface 타입 (inline: 채팅 내, sidePanel: 사이드 패널) */
  surfaceType?: A2UISurfaceType;
  /** 사이드 패널 제목 (surfaceType이 sidePanel일 때) */
  title?: string;
  /** 사이드 패널 크기 (surfaceType이 sidePanel일 때) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// ============================================================================
// Tool 정의
// ============================================================================

export const renderUiToolDefinition = {
  name: 'render_ui',
  description: `채팅창에 동적 UI를 렌더링합니다.

사용 가능한 컴포넌트:

기본 컴포넌트:
- Text: 마크다운 텍스트 (props: text, variant)
- Button: 클릭 버튼 (props: text, variant, size, disabled, onClick)
- Card: 정보 카드 (props: title, description, children)
- Badge: 상태 뱃지 (props: text, variant)
- Alert: 알림 메시지 (props: title, description, variant)
- Row: 가로 레이아웃 (props: gap, align, justify, children)
- Column: 세로 레이아웃 (props: gap, align, children)
- Separator: 구분선 (props: orientation)

폼 컴포넌트:
- TextField: 텍스트 입력 (props: label, placeholder, value, type, disabled, required, bind, onChange)
- Select: 드롭다운 선택 (props: label, placeholder, value, options, disabled, required, bind, onChange)
- Checkbox: 체크박스 (props: label, checked, disabled, bind, onChange)
- DatePicker: 날짜 선택 (props: label, value, placeholder, disabled, required, bind, onChange)
- Textarea: 여러 줄 입력 (props: label, placeholder, value, rows, disabled, required, bind, onChange)

데이터 표시 컴포넌트:
- Table: 데이터 테이블 (props: columns, rows, actions, emptyMessage, striped, hoverable)
- List: 리스트 컨테이너 (props: variant, gap, children) - children은 ListItem만 허용
- ListItem: 리스트 아이템 (props: title, description, leading, trailing, clickable, disabled, onClick)

로딩/프로그레스 컴포넌트:
- Spinner: 로딩 스피너 (props: size, label, centered)
- Progress: 진행률 바 (props: value, max, label, showPercent, size, variant)
- Skeleton: 스켈레톤 로딩 (props: variant, width, height, lines, noAnimation)

차트 컴포넌트:
- BarChart: 막대 차트 (props: data, xAxisKey, series, title, showGrid, showLegend, showTooltip, height, horizontal)
- LineChart: 선 차트 (props: data, xAxisKey, series, title, showGrid, showLegend, showTooltip, height, curveType)
- PieChart: 파이/도넛 차트 (props: data, title, donut, centerLabel, centerValue, showLegend, showTooltip, height, showLabels)

고급 인터랙션 컴포넌트:
- Accordion: 접이식 패널 (props: items, type, defaultValue, collapsible)
- Tabs: 탭 인터페이스 (props: tabs, defaultValue, align)
- Modal: 모달 다이얼로그 (props: title, description, triggerText, triggerVariant, content, confirmText, cancelText, onConfirm, onCancel, size)
- Drawer: 하단 드로어 (props: title, description, triggerText, triggerVariant, content, confirmText, cancelText, onConfirm, onCancel)

미디어 컴포넌트:
- Image: 이미지 (props: src, alt, width, height, aspectRatio, objectFit, rounded, caption, fallbackText)
- Avatar: 사용자 아바타 (props: src, alt, fallback, size, status)
- Video: 비디오 플레이어 (props: src, poster, title, width, height, aspectRatio, controls, autoPlay, loop, muted, rounded, caption)
- Audio: 오디오 플레이어 (props: src, title, artist, cover, controls, autoPlay, loop, muted, compact)

스트리밍 컴포넌트:
- StreamingText: 타이핑 효과 텍스트 (props: text, streaming, speed, variant, markdown, showCursor)
- StreamingIndicator: 진행 표시기 (props: isStreaming, progress, label, variant, size)

각 컴포넌트는 id(필수), component(필수), 그리고 컴포넌트별 속성을 가집니다.
children 배열에 다른 컴포넌트의 id를 넣어 중첩 구조를 만들 수 있습니다.

surfaceType 옵션:
- inline (기본): 채팅 메시지 내에 UI 표시
- sidePanel: 사이드 패널에 UI 표시 (상세 정보, 폼 등에 적합)

예시 1 (인라인):
{
  "components": [
    { "id": "root", "component": "Column", "children": ["title", "content"] },
    { "id": "title", "component": "Text", "text": "### 제목", "variant": "heading" },
    { "id": "content", "component": "Card", "title": "카드 제목", "description": "설명" }
  ]
}

예시 2 (사이드 패널):
{
  "surfaceType": "sidePanel",
  "title": "이슈 상세",
  "size": "lg",
  "components": [...]
}`,

  input_schema: {
    type: 'object',
    properties: {
      surfaceId: {
        type: 'string',
        description: '렌더링할 Surface ID (기본: 자동 생성)',
      },
      surfaceType: {
        type: 'string',
        enum: ['inline', 'sidePanel'],
        description: 'Surface 타입: inline(채팅 내), sidePanel(사이드 패널)',
      },
      title: {
        type: 'string',
        description: '사이드 패널 제목 (surfaceType이 sidePanel일 때)',
      },
      size: {
        type: 'string',
        enum: ['sm', 'md', 'lg', 'xl'],
        description: '사이드 패널 크기 (surfaceType이 sidePanel일 때)',
      },
      components: {
        type: 'array',
        description: '렌더링할 컴포넌트 배열',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '컴포넌트 고유 ID' },
            component: {
              type: 'string',
              enum: Array.from(ALLOWED_COMPONENTS),
              description: '컴포넌트 타입',
            },
            children: {
              type: 'array',
              items: { type: 'string' },
              description: '자식 컴포넌트 ID 배열',
            },
            // Text props
            text: { type: 'string' },
            variant: { type: 'string' },
            // Button props
            size: { type: 'string' },
            disabled: { type: 'boolean' },
            onClick: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                data: { type: 'object' },
              },
            },
            // Card props
            title: { type: 'string' },
            description: { type: 'string' },
            // Layout props
            gap: { type: 'string' },
            align: { type: 'string' },
            justify: { type: 'string' },
            // Separator props
            orientation: { type: 'string' },
            // Form props
            label: { type: 'string' },
            placeholder: { type: 'string' },
            value: { type: 'string' },
            required: { type: 'boolean' },
            bind: { type: 'string' },
            onChange: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                data: { type: 'object' },
              },
            },
            // TextField props
            type: { type: 'string', enum: ['text', 'email', 'password', 'number', 'tel', 'url'] },
            // Select props
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  label: { type: 'string' },
                  disabled: { type: 'boolean' },
                },
              },
            },
            // Checkbox props
            checked: { type: 'boolean' },
            // Textarea props
            rows: { type: 'number' },
            // Table props
            columns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  header: { type: 'string' },
                  width: { type: 'string' },
                  align: { type: 'string', enum: ['left', 'center', 'right'] },
                },
              },
            },
            // Table rows (데이터 행 배열)
            rows: {
              type: 'array',
              items: { type: 'object' },
            },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  variant: { type: 'string' },
                  onClick: {
                    type: 'object',
                    properties: {
                      action: { type: 'string' },
                      data: { type: 'object' },
                    },
                  },
                },
              },
            },
            emptyMessage: { type: 'string' },
            striped: { type: 'boolean' },
            hoverable: { type: 'boolean' },
            // ListItem props
            leading: { type: 'string' },
            trailing: { type: 'string' },
            clickable: { type: 'boolean' },
            // Spinner props
            centered: { type: 'boolean' },
            // Progress props
            max: { type: 'number' },
            showPercent: { type: 'boolean' },
            // Skeleton props
            width: { type: 'string' },
            height: { type: 'string' },
            lines: { type: 'number' },
            noAnimation: { type: 'boolean' },
            // Chart common props
            data: {
              type: 'array',
              items: { type: 'object' },
              description: '차트 데이터 배열',
            },
            xAxisKey: { type: 'string', description: 'X축 데이터 키' },
            series: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dataKey: { type: 'string' },
                  label: { type: 'string' },
                  color: { type: 'string' },
                  stackId: { type: 'string' },
                  strokeDasharray: { type: 'string' },
                  showDots: { type: 'boolean' },
                  strokeWidth: { type: 'number' },
                },
              },
              description: '데이터 시리즈 배열',
            },
            showGrid: { type: 'boolean' },
            showLegend: { type: 'boolean' },
            showTooltip: { type: 'boolean' },
            horizontal: { type: 'boolean' },
            curveType: { type: 'string', enum: ['linear', 'monotone', 'step'] },
            // PieChart specific props
            donut: { type: 'boolean' },
            centerLabel: { type: 'string' },
            centerValue: { type: ['string', 'number'] },
            showLabels: { type: 'boolean' },
            // Accordion props
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  content: { type: 'string' },
                },
              },
              description: '아코디언/탭 아이템 배열',
            },
            collapsible: { type: 'boolean' },
            // Tabs props
            tabs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  content: { type: 'string' },
                  disabled: { type: 'boolean' },
                },
              },
            },
            align: { type: 'string', enum: ['start', 'center', 'end'] },
            // Modal/Drawer props
            triggerText: { type: 'string' },
            triggerVariant: { type: 'string', enum: ['default', 'secondary', 'outline', 'ghost', 'destructive'] },
            content: { type: 'string' },
            confirmText: { type: 'string' },
            cancelText: { type: 'string' },
            onConfirm: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                data: { type: 'object' },
              },
            },
            onCancel: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                data: { type: 'object' },
              },
            },
            // Media props
            src: { type: 'string', description: '미디어 URL' },
            alt: { type: 'string', description: '대체 텍스트' },
            poster: { type: 'string', description: '비디오 포스터 이미지' },
            aspectRatio: { type: 'string', description: '가로세로 비율 (예: "16/9")' },
            objectFit: { type: 'string', enum: ['contain', 'cover', 'fill', 'none', 'scale-down'] },
            caption: { type: 'string', description: '캡션 텍스트' },
            fallbackText: { type: 'string', description: '로딩 실패 시 텍스트' },
            // Avatar props
            fallback: { type: 'string', description: '폴백 이니셜' },
            status: { type: 'string', enum: ['online', 'offline', 'away', 'busy'] },
            // Video/Audio props
            controls: { type: 'boolean' },
            autoPlay: { type: 'boolean' },
            loop: { type: 'boolean' },
            muted: { type: 'boolean' },
            // Audio props
            artist: { type: 'string' },
            cover: { type: 'string' },
            compact: { type: 'boolean' },
            // StreamingText props
            streaming: { type: 'boolean', description: '스트리밍 활성화' },
            speed: { type: 'number', description: '타이핑 속도 (ms)' },
            markdown: { type: 'boolean', description: '마크다운 렌더링' },
            showCursor: { type: 'boolean', description: '커서 표시' },
            // StreamingIndicator props
            isStreaming: { type: 'boolean' },
            progress: { type: 'number', description: '진행률 (0-100)' },
          },
          required: ['id', 'component'],
        },
      },
      data: {
        type: 'object',
        description: '컴포넌트에서 사용할 데이터 모델',
      },
    },
    required: ['components'],
  },
};

// ============================================================================
// Tool 실행
// ============================================================================

export interface RenderUIToolResult {
  type: 'a2ui';
  message: A2UIMessage;
  surfaceType: A2UISurfaceType;
  success: boolean;
  errors?: string[];
}

/**
 * render_ui Tool 실행
 */
export function executeRenderUi(input: RenderUIToolInputExtended): RenderUIToolResult {
  const surfaceType: A2UISurfaceType = input.surfaceType || 'inline';

  // 컴포넌트 검증
  const validation = validateComponents(input.components as A2UIComponent[]);

  if (!validation.valid) {
    return {
      type: 'a2ui',
      message: {
        surfaceId: '',
        components: [],
      },
      surfaceType,
      success: false,
      errors: validation.errors.map(e => e.message),
    };
  }

  // Surface ID 생성
  const surfaceId = input.surfaceId || `${surfaceType}_${Date.now()}`;

  // A2UI 메시지 생성
  const message: A2UIMessage = {
    surfaceId,
    catalogId: 'ideaonaction-chat-v1',
    components: input.components as A2UIComponent[],
    data: {
      ...input.data,
      // 사이드 패널 메타데이터 포함
      ...(surfaceType === 'sidePanel' && {
        title: input.title || '상세 정보',
        size: input.size || 'md',
      }),
    },
  };

  // 정화
  const sanitized = sanitizeMessage(message);

  return {
    type: 'a2ui',
    message: sanitized,
    surfaceType,
    success: true,
  };
}

// ============================================================================
// Tool 핸들러 (ToolRegistry 호환)
// ============================================================================

export const renderUiToolHandler = {
  name: 'render_ui',
  definition: renderUiToolDefinition,
  execute: executeRenderUi,
};
