/**
 * A2UI 카탈로그 유닛 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CATALOG,
  ALLOWED_COMPONENTS,
  ALLOWED_ACTIONS,
  isAllowedComponent,
  isAllowedAction,
  getComponentDefinition,
  isAllowedProp,
  filterAllowedProps,
} from '@/lib/a2ui/catalog';

describe('A2UI Catalog', () => {
  describe('DEFAULT_CATALOG', () => {
    it('카탈로그 ID가 정의되어 있어야 함', () => {
      expect(DEFAULT_CATALOG.catalogId).toBe('ideaonaction-chat-v1');
    });

    it('버전이 정의되어 있어야 함', () => {
      expect(DEFAULT_CATALOG.version).toBe('1.0.0');
    });

    it('컴포넌트가 정의되어 있어야 함', () => {
      expect(Object.keys(DEFAULT_CATALOG.components).length).toBeGreaterThan(0);
    });
  });

  describe('ALLOWED_COMPONENTS', () => {
    it('기본 컴포넌트가 포함되어 있어야 함', () => {
      expect(ALLOWED_COMPONENTS.has('Text')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('Button')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('Card')).toBe(true);
    });

    it('폼 컴포넌트가 포함되어 있어야 함', () => {
      expect(ALLOWED_COMPONENTS.has('TextField')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('Select')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('Checkbox')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('DatePicker')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('Textarea')).toBe(true);
    });

    it('차트 컴포넌트가 포함되어 있어야 함', () => {
      expect(ALLOWED_COMPONENTS.has('BarChart')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('LineChart')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('PieChart')).toBe(true);
    });

    it('미디어 컴포넌트가 포함되어 있어야 함', () => {
      expect(ALLOWED_COMPONENTS.has('Image')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('Avatar')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('Video')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('Audio')).toBe(true);
    });

    it('스트리밍 컴포넌트가 포함되어 있어야 함', () => {
      expect(ALLOWED_COMPONENTS.has('StreamingText')).toBe(true);
      expect(ALLOWED_COMPONENTS.has('StreamingIndicator')).toBe(true);
    });
  });

  describe('isAllowedComponent', () => {
    it('허용된 컴포넌트는 true를 반환해야 함', () => {
      expect(isAllowedComponent('Text')).toBe(true);
      expect(isAllowedComponent('Button')).toBe(true);
      expect(isAllowedComponent('Card')).toBe(true);
    });

    it('허용되지 않은 컴포넌트는 false를 반환해야 함', () => {
      expect(isAllowedComponent('Script')).toBe(false);
      expect(isAllowedComponent('Iframe')).toBe(false);
      expect(isAllowedComponent('Unknown')).toBe(false);
    });

    it('빈 문자열은 false를 반환해야 함', () => {
      expect(isAllowedComponent('')).toBe(false);
    });
  });

  describe('getComponentDefinition', () => {
    it('Text 컴포넌트 정의를 반환해야 함', () => {
      const def = getComponentDefinition('Text');
      expect(def).toBeDefined();
      expect(def?.name).toBe('Text');
      expect(def?.allowedProps).toContain('text');
      expect(def?.allowedProps).toContain('variant');
    });

    it('Button 컴포넌트 정의를 반환해야 함', () => {
      const def = getComponentDefinition('Button');
      expect(def).toBeDefined();
      expect(def?.actionProps).toContain('onClick');
    });

    it('TextField 컴포넌트 정의를 반환해야 함', () => {
      const def = getComponentDefinition('TextField');
      expect(def).toBeDefined();
      expect(def?.bindableProps).toContain('value');
      expect(def?.actionProps).toContain('onChange');
    });

    it('존재하지 않는 컴포넌트는 undefined를 반환해야 함', () => {
      expect(getComponentDefinition('Unknown')).toBeUndefined();
    });
  });

  describe('isAllowedProp', () => {
    it('Text 컴포넌트의 text 속성은 허용되어야 함', () => {
      expect(isAllowedProp('Text', 'text')).toBe(true);
    });

    it('Text 컴포넌트의 variant 속성은 허용되어야 함', () => {
      expect(isAllowedProp('Text', 'variant')).toBe(true);
    });

    it('Text 컴포넌트의 onClick 속성은 허용되지 않아야 함', () => {
      expect(isAllowedProp('Text', 'onClick')).toBe(false);
    });

    it('Button 컴포넌트의 onClick 속성은 허용되어야 함', () => {
      expect(isAllowedProp('Button', 'onClick')).toBe(true);
    });

    it('id와 component 속성은 항상 허용되어야 함', () => {
      expect(isAllowedProp('Text', 'id')).toBe(true);
      expect(isAllowedProp('Text', 'component')).toBe(true);
      expect(isAllowedProp('Button', 'id')).toBe(true);
      expect(isAllowedProp('Button', 'component')).toBe(true);
    });

    it('children은 allowChildren이 true인 컴포넌트에서만 허용되어야 함', () => {
      expect(isAllowedProp('Card', 'children')).toBe(true);
      expect(isAllowedProp('Row', 'children')).toBe(true);
      expect(isAllowedProp('Text', 'children')).toBe(false);
      expect(isAllowedProp('Button', 'children')).toBe(false);
    });

    it('존재하지 않는 컴포넌트의 속성은 false를 반환해야 함', () => {
      expect(isAllowedProp('Unknown', 'text')).toBe(false);
    });
  });

  describe('filterAllowedProps', () => {
    it('Text 컴포넌트의 허용된 속성만 반환해야 함', () => {
      const props = {
        id: 'text-1',
        component: 'Text',
        text: '안녕하세요',
        variant: 'heading',
        onClick: { action: 'test' }, // 허용되지 않음
        dangerousHtml: '<script>', // 허용되지 않음
      };
      const filtered = filterAllowedProps('Text', props);
      expect(filtered).toHaveProperty('text');
      expect(filtered).toHaveProperty('variant');
      expect(filtered).toHaveProperty('id');
      expect(filtered).toHaveProperty('component');
      expect(filtered).not.toHaveProperty('onClick');
      expect(filtered).not.toHaveProperty('dangerousHtml');
    });

    it('Button 컴포넌트의 허용된 속성만 반환해야 함', () => {
      const props = {
        id: 'btn-1',
        component: 'Button',
        text: '클릭',
        onClick: { action: 'submit' },
        malicious: 'data',
      };
      const filtered = filterAllowedProps('Button', props);
      expect(filtered).toHaveProperty('text');
      expect(filtered).toHaveProperty('onClick');
      expect(filtered).not.toHaveProperty('malicious');
    });

    it('존재하지 않는 컴포넌트는 빈 객체를 반환해야 함', () => {
      const props = { text: '테스트' };
      const filtered = filterAllowedProps('Unknown', props);
      expect(filtered).toEqual({});
    });
  });

  describe('ALLOWED_ACTIONS', () => {
    it('조회 액션이 포함되어 있어야 함', () => {
      expect(ALLOWED_ACTIONS.has('view_issue')).toBe(true);
      expect(ALLOWED_ACTIONS.has('view_event')).toBe(true);
      expect(ALLOWED_ACTIONS.has('view_project')).toBe(true);
    });

    it('UI 액션이 포함되어 있어야 함', () => {
      expect(ALLOWED_ACTIONS.has('navigate')).toBe(true);
      expect(ALLOWED_ACTIONS.has('refresh')).toBe(true);
      expect(ALLOWED_ACTIONS.has('dismiss')).toBe(true);
    });

    it('폼 액션이 포함되어 있어야 함', () => {
      expect(ALLOWED_ACTIONS.has('submit')).toBe(true);
      expect(ALLOWED_ACTIONS.has('cancel')).toBe(true);
      expect(ALLOWED_ACTIONS.has('reset')).toBe(true);
    });
  });

  describe('isAllowedAction', () => {
    it('허용된 액션은 true를 반환해야 함', () => {
      expect(isAllowedAction('submit')).toBe(true);
      expect(isAllowedAction('navigate')).toBe(true);
      expect(isAllowedAction('view_issue')).toBe(true);
    });

    it('허용되지 않은 액션은 false를 반환해야 함', () => {
      expect(isAllowedAction('delete_all')).toBe(false);
      expect(isAllowedAction('execute_script')).toBe(false);
      expect(isAllowedAction('unknown')).toBe(false);
    });
  });
});
