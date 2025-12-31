/**
 * A2UI ComponentResolver 유닛 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  resolveComponent,
  resolveComponentById,
  findRootComponents,
} from '@/lib/a2ui/renderer/ComponentResolver';
import { A2UIFormProvider } from '@/lib/a2ui/context';
import type { A2UIComponent, A2UIActionHandler } from '@/lib/a2ui/types';

// 테스트 헬퍼: FormProvider로 감싸기
function renderWithProvider(ui: React.ReactElement) {
  return render(
    <A2UIFormProvider>{ui}</A2UIFormProvider>
  );
}

describe('A2UI ComponentResolver', () => {
  describe('findRootComponents', () => {
    it('자식으로 참조되지 않는 컴포넌트를 루트로 찾아야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['child-1', 'child-2'] },
        { id: 'child-1', component: 'Text', text: '첫 번째' },
        { id: 'child-2', component: 'Text', text: '두 번째' },
      ];
      const roots = findRootComponents(components);
      expect(roots).toEqual(['root']);
    });

    it('여러 루트 컴포넌트를 찾아야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'root-1', component: 'Text', text: '첫 번째' },
        { id: 'root-2', component: 'Text', text: '두 번째' },
      ];
      const roots = findRootComponents(components);
      expect(roots).toHaveLength(2);
      expect(roots).toContain('root-1');
      expect(roots).toContain('root-2');
    });

    it('빈 배열은 빈 배열을 반환해야 함', () => {
      const roots = findRootComponents([]);
      expect(roots).toEqual([]);
    });

    it('중첩된 구조에서 루트를 찾아야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['card-1'] },
        { id: 'card-1', component: 'Card', title: '카드', children: ['text-1'] },
        { id: 'text-1', component: 'Text', text: '내용' },
      ];
      const roots = findRootComponents(components);
      expect(roots).toEqual(['root']);
    });
  });

  describe('resolveComponent', () => {
    const createOptions = (components: A2UIComponent[], onAction?: A2UIActionHandler) => ({
      onAction,
      componentMap: new Map(components.map(c => [c.id, c])),
      renderCache: new Map(),
    });

    it('Text 컴포넌트를 렌더링해야 함', () => {
      const component: A2UIComponent = {
        id: 'text-1',
        component: 'Text',
        text: '안녕하세요',
      };
      const options = createOptions([component]);
      const rendered = resolveComponent(component, options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByText('안녕하세요')).toBeInTheDocument();
    });

    it('Button 컴포넌트를 렌더링해야 함', () => {
      const component: A2UIComponent = {
        id: 'btn-1',
        component: 'Button',
        text: '클릭하세요',
      };
      const options = createOptions([component]);
      const rendered = resolveComponent(component, options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByRole('button', { name: '클릭하세요' })).toBeInTheDocument();
    });

    it('Card 컴포넌트를 렌더링해야 함', () => {
      const component: A2UIComponent = {
        id: 'card-1',
        component: 'Card',
        title: '카드 제목',
        description: '카드 설명',
      };
      const options = createOptions([component]);
      const rendered = resolveComponent(component, options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByText('카드 제목')).toBeInTheDocument();
      expect(screen.getByText('카드 설명')).toBeInTheDocument();
    });

    it('Badge 컴포넌트를 렌더링해야 함', () => {
      const component: A2UIComponent = {
        id: 'badge-1',
        component: 'Badge',
        text: '새로운',
        variant: 'success',
      };
      const options = createOptions([component]);
      const rendered = resolveComponent(component, options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByText('새로운')).toBeInTheDocument();
    });

    it('Alert 컴포넌트를 렌더링해야 함', () => {
      const component: A2UIComponent = {
        id: 'alert-1',
        component: 'Alert',
        title: '알림',
        description: '중요한 메시지입니다.',
      };
      const options = createOptions([component]);
      const rendered = resolveComponent(component, options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByText('알림')).toBeInTheDocument();
      expect(screen.getByText('중요한 메시지입니다.')).toBeInTheDocument();
    });

    it('허용되지 않은 컴포넌트는 null을 반환해야 함', () => {
      const component: A2UIComponent = {
        id: 'script-1',
        component: 'Script',
      };
      const options = createOptions([component]);
      const rendered = resolveComponent(component, options);

      expect(rendered).toBeNull();
    });

    it('허용되지 않은 속성을 필터링해야 함', () => {
      const component = {
        id: 'text-1',
        component: 'Text',
        text: '안녕하세요',
        dangerousHtml: '<script>alert(1)</script>',
      } as A2UIComponent;
      const options = createOptions([component]);
      const rendered = resolveComponent(component, options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByText('안녕하세요')).toBeInTheDocument();
      // dangerousHtml은 렌더링되지 않아야 함
    });
  });

  describe('resolveComponentById', () => {
    it('ID로 컴포넌트를 찾아 렌더링해야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'text-1', component: 'Text', text: 'ID로 찾기' },
      ];
      const options = {
        componentMap: new Map(components.map(c => [c.id, c])),
        renderCache: new Map(),
      };
      const rendered = resolveComponentById('text-1', options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByText('ID로 찾기')).toBeInTheDocument();
    });

    it('존재하지 않는 ID는 null을 반환해야 함', () => {
      const options = {
        componentMap: new Map(),
        renderCache: new Map(),
      };
      const rendered = resolveComponentById('non-existent', options);

      expect(rendered).toBeNull();
    });

    it('캐시를 사용해야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'text-1', component: 'Text', text: '캐시 테스트' },
      ];
      const options = {
        componentMap: new Map(components.map(c => [c.id, c])),
        renderCache: new Map(),
      };

      // 첫 번째 호출
      const rendered1 = resolveComponentById('text-1', options);
      // 두 번째 호출 - 캐시에서 가져와야 함
      const rendered2 = resolveComponentById('text-1', options);

      expect(rendered1).toBe(rendered2);
      expect(options.renderCache.has('text-1')).toBe(true);
    });
  });

  describe('중첩된 컴포넌트', () => {
    it('Column 안에 여러 자식을 렌더링해야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'col-1', component: 'Column', children: ['text-1', 'text-2'] },
        { id: 'text-1', component: 'Text', text: '첫 번째' },
        { id: 'text-2', component: 'Text', text: '두 번째' },
      ];
      const options = {
        componentMap: new Map(components.map(c => [c.id, c])),
        renderCache: new Map(),
      };
      const rendered = resolveComponent(components[0], options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByText('첫 번째')).toBeInTheDocument();
      expect(screen.getByText('두 번째')).toBeInTheDocument();
    });

    it('Row 안에 여러 자식을 렌더링해야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'row-1', component: 'Row', children: ['btn-1', 'btn-2'] },
        { id: 'btn-1', component: 'Button', text: '버튼 1' },
        { id: 'btn-2', component: 'Button', text: '버튼 2' },
      ];
      const options = {
        componentMap: new Map(components.map(c => [c.id, c])),
        renderCache: new Map(),
      };
      const rendered = resolveComponent(components[0], options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByRole('button', { name: '버튼 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '버튼 2' })).toBeInTheDocument();
    });

    it('Card 안에 자식을 렌더링해야 함', () => {
      const components: A2UIComponent[] = [
        { id: 'card-1', component: 'Card', title: '카드', children: ['content'] },
        { id: 'content', component: 'Text', text: '카드 내용' },
      ];
      const options = {
        componentMap: new Map(components.map(c => [c.id, c])),
        renderCache: new Map(),
      };
      const rendered = resolveComponent(components[0], options);

      renderWithProvider(<>{rendered}</>);
      expect(screen.getByText('카드')).toBeInTheDocument();
      expect(screen.getByText('카드 내용')).toBeInTheDocument();
    });
  });

  describe('액션 핸들러', () => {
    it('Button 클릭 시 onAction이 호출되어야 함', async () => {
      const onAction = vi.fn();
      const components: A2UIComponent[] = [
        {
          id: 'btn-1',
          component: 'Button',
          text: '제출',
          onClick: { action: 'submit', data: { formId: 'form-1' } },
        },
      ];
      const options = {
        onAction,
        componentMap: new Map(components.map(c => [c.id, c])),
        renderCache: new Map(),
      };
      const rendered = resolveComponent(components[0], options);
      const user = userEvent.setup();

      renderWithProvider(<>{rendered}</>);

      const button = screen.getByRole('button', { name: '제출' });
      await user.click(button);

      expect(onAction).toHaveBeenCalledWith({
        action: 'submit',
        data: { formId: 'form-1' },
      });
    });
  });
});
