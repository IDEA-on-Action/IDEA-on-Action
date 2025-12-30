/**
 * A2UI 컴포넌트 해석기
 * 컴포넌트 타입을 실제 React 컴포넌트로 매핑
 */

import type { ReactNode } from 'react';
import type { A2UIComponent, A2UIActionHandler } from '../types';
import { isAllowedComponent, filterAllowedProps } from '../catalog';

import {
  A2UIText,
  A2UIButton,
  A2UICard,
  A2UIBadge,
  A2UIAlert,
  A2UIRow,
  A2UIColumn,
  A2UISeparator,
  // 폼 컴포넌트
  A2UITextField,
  A2UISelect,
  A2UICheckbox,
  A2UIDatePicker,
  A2UITextarea,
} from './components';

// ============================================================================
// 컴포넌트 레지스트리
// ============================================================================

type ComponentRenderer = (props: {
  component: A2UIComponent;
  renderedChildren?: ReactNode;
  onAction?: A2UIActionHandler;
}) => ReactNode;

const componentRegistry: Record<string, ComponentRenderer> = {
  Text: ({ component }) => (
    <A2UIText
      text={component.text as string}
      variant={component.variant as 'default' | 'heading' | 'muted' | 'code'}
    />
  ),

  Button: ({ component, onAction }) => (
    <A2UIButton
      text={component.text as string}
      variant={component.variant as 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'}
      size={component.size as 'default' | 'sm' | 'lg' | 'icon'}
      disabled={component.disabled as boolean}
      onClick={component.onClick as Parameters<typeof A2UIButton>[0]['onClick']}
      onAction={onAction}
    />
  ),

  Card: ({ component, renderedChildren }) => (
    <A2UICard
      title={component.title as string}
      description={component.description as string}
      renderedChildren={renderedChildren}
    />
  ),

  Badge: ({ component }) => (
    <A2UIBadge
      text={component.text as string}
      variant={component.variant as 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning'}
    />
  ),

  Alert: ({ component }) => (
    <A2UIAlert
      title={component.title as string}
      description={component.description as string}
      variant={component.variant as 'default' | 'destructive'}
    />
  ),

  Row: ({ component, renderedChildren }) => (
    <A2UIRow
      gap={component.gap as 'none' | 'sm' | 'md' | 'lg'}
      align={component.align as 'start' | 'center' | 'end'}
      justify={component.justify as 'start' | 'center' | 'end' | 'between'}
      renderedChildren={renderedChildren}
    />
  ),

  Column: ({ component, renderedChildren }) => (
    <A2UIColumn
      gap={component.gap as 'none' | 'sm' | 'md' | 'lg'}
      align={component.align as 'start' | 'center' | 'end'}
      renderedChildren={renderedChildren}
    />
  ),

  Separator: ({ component }) => (
    <A2UISeparator
      orientation={component.orientation as 'horizontal' | 'vertical'}
    />
  ),

  // 폼 컴포넌트
  TextField: ({ component, onAction }) => (
    <A2UITextField
      label={component.label as string}
      placeholder={component.placeholder as string}
      value={component.value as string}
      disabled={component.disabled as boolean}
      required={component.required as boolean}
      type={component.type as 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'}
      bind={component.bind as string}
      onChange={component.onChange as Parameters<typeof A2UITextField>[0]['onChange']}
      onAction={onAction}
    />
  ),

  Select: ({ component, onAction }) => (
    <A2UISelect
      label={component.label as string}
      placeholder={component.placeholder as string}
      value={component.value as string}
      options={component.options as Parameters<typeof A2UISelect>[0]['options']}
      disabled={component.disabled as boolean}
      required={component.required as boolean}
      bind={component.bind as string}
      onChange={component.onChange as Parameters<typeof A2UISelect>[0]['onChange']}
      onAction={onAction}
    />
  ),

  Checkbox: ({ component, onAction }) => (
    <A2UICheckbox
      label={component.label as string}
      checked={component.checked as boolean}
      disabled={component.disabled as boolean}
      bind={component.bind as string}
      onChange={component.onChange as Parameters<typeof A2UICheckbox>[0]['onChange']}
      onAction={onAction}
    />
  ),

  DatePicker: ({ component, onAction }) => (
    <A2UIDatePicker
      label={component.label as string}
      value={component.value as string}
      disabled={component.disabled as boolean}
      required={component.required as boolean}
      placeholder={component.placeholder as string}
      bind={component.bind as string}
      onChange={component.onChange as Parameters<typeof A2UIDatePicker>[0]['onChange']}
      onAction={onAction}
    />
  ),

  Textarea: ({ component, onAction }) => (
    <A2UITextarea
      label={component.label as string}
      placeholder={component.placeholder as string}
      value={component.value as string}
      disabled={component.disabled as boolean}
      required={component.required as boolean}
      rows={component.rows as number}
      bind={component.bind as string}
      onChange={component.onChange as Parameters<typeof A2UITextarea>[0]['onChange']}
      onAction={onAction}
    />
  ),
};

// ============================================================================
// 컴포넌트 해석
// ============================================================================

export interface ResolveOptions {
  /** 액션 핸들러 */
  onAction?: A2UIActionHandler;
  /** 컴포넌트 맵 (ID → 컴포넌트) */
  componentMap: Map<string, A2UIComponent>;
  /** 렌더링된 컴포넌트 캐시 */
  renderCache: Map<string, ReactNode>;
}

/**
 * 컴포넌트 ID로 렌더링
 */
export function resolveComponentById(
  id: string,
  options: ResolveOptions
): ReactNode {
  // 캐시 확인
  if (options.renderCache.has(id)) {
    return options.renderCache.get(id);
  }

  const component = options.componentMap.get(id);
  if (!component) {
    console.warn(`[A2UI] 컴포넌트를 찾을 수 없음: ${id}`);
    return null;
  }

  const rendered = resolveComponent(component, options);
  options.renderCache.set(id, rendered);

  return rendered;
}

/**
 * 단일 컴포넌트 렌더링
 */
export function resolveComponent(
  component: A2UIComponent,
  options: ResolveOptions
): ReactNode {
  // 허용된 컴포넌트인지 확인
  if (!isAllowedComponent(component.component)) {
    console.warn(`[A2UI] 허용되지 않은 컴포넌트: ${component.component}`);
    return null;
  }

  // 렌더러 가져오기
  const renderer = componentRegistry[component.component];
  if (!renderer) {
    console.warn(`[A2UI] 렌더러를 찾을 수 없음: ${component.component}`);
    return null;
  }

  // 속성 필터링
  const filteredComponent = {
    ...component,
    ...filterAllowedProps(component.component, component),
  };

  // 자식 컴포넌트 렌더링
  let renderedChildren: ReactNode = null;
  if (component.children && Array.isArray(component.children)) {
    renderedChildren = (
      <>
        {component.children.map((childId) => (
          <div key={childId}>
            {resolveComponentById(childId, options)}
          </div>
        ))}
      </>
    );
  }

  // 컴포넌트 렌더링
  return (
    <div key={component.id} data-a2ui-id={component.id}>
      {renderer({
        component: filteredComponent,
        renderedChildren,
        onAction: options.onAction,
      })}
    </div>
  );
}

/**
 * 루트 컴포넌트 찾기
 * (다른 컴포넌트의 자식으로 참조되지 않는 컴포넌트)
 */
export function findRootComponents(components: A2UIComponent[]): string[] {
  const allIds = new Set(components.map(c => c.id));
  const childIds = new Set<string>();

  for (const component of components) {
    if (component.children && Array.isArray(component.children)) {
      for (const childId of component.children) {
        childIds.add(childId);
      }
    }
  }

  // 자식으로 참조되지 않는 ID = 루트
  return Array.from(allIds).filter(id => !childIds.has(id));
}
