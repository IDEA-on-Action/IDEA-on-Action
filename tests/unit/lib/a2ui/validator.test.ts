/**
 * A2UI Validator 유닛 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  validateComponent,
  validateComponents,
  validateMessage,
  validateAction,
  sanitizeComponent,
  sanitizeMessage,
} from '@/lib/a2ui/validator';
import type { A2UIComponent, A2UIMessage, A2UIUserAction } from '@/lib/a2ui/types';

describe('A2UI Validator', () => {
  describe('validateComponent', () => {
    it('유효한 컴포넌트를 검증해야 함', () => {
      const component: A2UIComponent = {
        id: 'text-1',
        component: 'Text',
        text: '안녕하세요',
      };
      const result = validateComponent(component);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('id가 없으면 에러를 반환해야 함', () => {
      const component = {
        component: 'Text',
        text: '안녕하세요',
      } as A2UIComponent;
      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
    });

    it('component 타입이 없으면 에러를 반환해야 함', () => {
      const component = {
        id: 'text-1',
        text: '안녕하세요',
      } as A2UIComponent;
      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_COMPONENT_TYPE')).toBe(true);
    });

    it('허용되지 않은 컴포넌트 타입은 에러를 반환해야 함', () => {
      const component: A2UIComponent = {
        id: 'script-1',
        component: 'Script',
      };
      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'UNKNOWN_COMPONENT')).toBe(true);
    });

    it('허용되지 않은 속성은 경고를 반환해야 함', () => {
      const component = {
        id: 'text-1',
        component: 'Text',
        text: '안녕하세요',
        dangerousHtml: '<script>alert(1)</script>',
      } as A2UIComponent;
      const result = validateComponent(component);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'UNKNOWN_PROP')).toBe(true);
    });
  });

  describe('validateComponents', () => {
    it('유효한 컴포넌트 배열을 검증해야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'col-1', component: 'Column', children: ['text-1', 'btn-1'] },
        { id: 'text-1', component: 'Text', text: '제목' },
        { id: 'btn-1', component: 'Button', text: '클릭' },
      ];
      const result = validateComponents(components);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('중복된 ID는 에러를 반환해야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'same-id', component: 'Text', text: '첫 번째' },
        { id: 'same-id', component: 'Text', text: '두 번째' },
      ];
      const result = validateComponents(components);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_ID')).toBe(true);
    });

    it('존재하지 않는 자식 참조는 경고를 반환해야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'col-1', component: 'Column', children: ['non-existent'] },
      ];
      const result = validateComponents(components);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_CHILD')).toBe(true);
    });

    it('빈 배열은 유효해야 함', () => {
      const result = validateComponents([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMessage', () => {
    it('유효한 메시지를 검증해야 함', () => {
      const message: A2UIMessage = {
        surfaceId: 'surface-1',
        components: [
          { id: 'text-1', component: 'Text', text: '안녕하세요' },
        ],
      };
      const result = validateMessage(message);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('surfaceId가 없으면 에러를 반환해야 함', () => {
      const message = {
        components: [
          { id: 'text-1', component: 'Text', text: '안녕하세요' },
        ],
      } as A2UIMessage;
      const result = validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_SURFACE_ID')).toBe(true);
    });

    it('components가 없으면 에러를 반환해야 함', () => {
      const message = {
        surfaceId: 'surface-1',
      } as A2UIMessage;
      const result = validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_COMPONENTS')).toBe(true);
    });

    it('빈 components 배열은 경고를 반환해야 함', () => {
      const message: A2UIMessage = {
        surfaceId: 'surface-1',
        components: [],
      };
      const result = validateMessage(message);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'EMPTY_COMPONENTS')).toBe(true);
    });

    it('data가 객체가 아니면 에러를 반환해야 함', () => {
      const message = {
        surfaceId: 'surface-1',
        components: [{ id: 'text-1', component: 'Text', text: '테스트' }],
        data: 'invalid' as unknown,
      } as A2UIMessage;
      const result = validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DATA')).toBe(true);
    });
  });

  describe('validateAction', () => {
    it('유효한 액션을 검증해야 함', () => {
      const action: A2UIUserAction = {
        action: 'submit',
        data: { formId: 'form-1' },
      };
      const result = validateAction(action);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('action이 없으면 에러를 반환해야 함', () => {
      const action = {
        data: { formId: 'form-1' },
      } as A2UIUserAction;
      const result = validateAction(action);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_ACTION')).toBe(true);
    });

    it('허용되지 않은 액션은 에러를 반환해야 함', () => {
      const action: A2UIUserAction = {
        action: 'delete_all',
      };
      const result = validateAction(action);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'UNKNOWN_ACTION')).toBe(true);
    });
  });

  describe('sanitizeComponent', () => {
    it('유효한 컴포넌트를 정화해야 함', () => {
      const component: A2UIComponent = {
        id: 'text-1',
        component: 'Text',
        text: '안녕하세요',
        variant: 'heading',
      };
      const sanitized = sanitizeComponent(component);
      expect(sanitized).not.toBeNull();
      expect(sanitized?.id).toBe('text-1');
      expect(sanitized?.component).toBe('Text');
      expect(sanitized?.text).toBe('안녕하세요');
    });

    it('허용되지 않은 속성을 제거해야 함', () => {
      const component = {
        id: 'text-1',
        component: 'Text',
        text: '안녕하세요',
        dangerousHtml: '<script>',
        malicious: 'data',
      } as A2UIComponent;
      const sanitized = sanitizeComponent(component);
      expect(sanitized).not.toBeNull();
      expect(sanitized).not.toHaveProperty('dangerousHtml');
      expect(sanitized).not.toHaveProperty('malicious');
    });

    it('허용되지 않은 컴포넌트는 null을 반환해야 함', () => {
      const component: A2UIComponent = {
        id: 'script-1',
        component: 'Script',
      };
      const sanitized = sanitizeComponent(component);
      expect(sanitized).toBeNull();
    });
  });

  describe('sanitizeMessage', () => {
    it('유효한 메시지를 정화해야 함', () => {
      const message: A2UIMessage = {
        surfaceId: 'surface-1',
        components: [
          { id: 'text-1', component: 'Text', text: '안녕하세요' },
          { id: 'btn-1', component: 'Button', text: '클릭' },
        ],
      };
      const sanitized = sanitizeMessage(message);
      expect(sanitized.surfaceId).toBe('surface-1');
      expect(sanitized.components).toHaveLength(2);
    });

    it('허용되지 않은 컴포넌트를 제거해야 함', () => {
      const message: A2UIMessage = {
        surfaceId: 'surface-1',
        components: [
          { id: 'text-1', component: 'Text', text: '안녕하세요' },
          { id: 'script-1', component: 'Script' },
          { id: 'btn-1', component: 'Button', text: '클릭' },
        ],
      };
      const sanitized = sanitizeMessage(message);
      expect(sanitized.components).toHaveLength(2);
      expect(sanitized.components.every(c => c.component !== 'Script')).toBe(true);
    });

    it('컴포넌트의 허용되지 않은 속성을 제거해야 함', () => {
      const message: A2UIMessage = {
        surfaceId: 'surface-1',
        components: [
          {
            id: 'text-1',
            component: 'Text',
            text: '안녕하세요',
            dangerousHtml: '<script>',
          } as A2UIComponent,
        ],
      };
      const sanitized = sanitizeMessage(message);
      expect(sanitized.components[0]).not.toHaveProperty('dangerousHtml');
    });
  });
});
