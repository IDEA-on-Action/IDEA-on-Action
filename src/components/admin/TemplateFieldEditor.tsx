/**
 * TemplateFieldEditor Component
 *
 * 개별 필드 편집 폼
 * - 필드 타입 선택 (text, textarea, number, date, select, checkbox)
 * - 검증 규칙 설정
 *
 * @module components/admin/TemplateFieldEditor
 */

import { useState } from 'react';
import {
  TemplateFieldEditorProps,
  FieldType,
  FIELD_TYPE_LABEL_MAP,
  FieldOption,
} from '@/types/template-editor.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 필드 에디터 컴포넌트
 */
export function TemplateFieldEditor({
  field,
  onUpdate,
  onRemove,
  className,
}: TemplateFieldEditorProps) {
  const [showOptions, setShowOptions] = useState(
    field.type === 'select' || field.type === 'radio'
  );

  // 필드 타입 변경 핸들러
  const handleTypeChange = (type: FieldType) => {
    onUpdate({ type });
    setShowOptions(type === 'select' || type === 'radio');
  };

  // 옵션 추가 핸들러
  const handleAddOption = () => {
    const newOption: FieldOption = {
      value: `option-${Date.now()}`,
      label: '새 옵션',
    };
    onUpdate({
      options: [...(field.options || []), newOption],
    });
  };

  // 옵션 업데이트 핸들러
  const handleUpdateOption = (index: number, updates: Partial<FieldOption>) => {
    const updatedOptions = [...(field.options || [])];
    updatedOptions[index] = { ...updatedOptions[index], ...updates };
    onUpdate({ options: updatedOptions });
  };

  // 옵션 삭제 핸들러
  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...(field.options || [])];
    updatedOptions.splice(index, 1);
    onUpdate({ options: updatedOptions });
  };

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          <CardTitle className="text-base">{field.label || '새 필드'}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`field-name-${field.id}`}>필드 이름 (키)</Label>
            <Input
              id={`field-name-${field.id}`}
              value={field.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="예: email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`field-type-${field.id}`}>필드 타입</Label>
            <Select value={field.type} onValueChange={handleTypeChange}>
              <SelectTrigger id={`field-type-${field.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_TYPE_LABEL_MAP).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`field-label-${field.id}`}>필드 라벨</Label>
          <Input
            id={`field-label-${field.id}`}
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="예: 이메일 주소"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`field-placeholder-${field.id}`}>플레이스홀더</Label>
          <Input
            id={`field-placeholder-${field.id}`}
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            placeholder="예: user@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`field-help-${field.id}`}>도움말 텍스트</Label>
          <Textarea
            id={`field-help-${field.id}`}
            value={field.helpText || ''}
            onChange={(e) => onUpdate({ helpText: e.target.value })}
            placeholder="사용자에게 표시될 도움말 메시지"
            rows={2}
          />
        </div>

        {/* 검증 규칙 */}
        <Separator />
        <div className="space-y-3">
          <h4 className="text-sm font-medium">검증 규칙</h4>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`field-required-${field.id}`}
              checked={field.validation?.required || false}
              onCheckedChange={(checked) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    required: checked === true,
                  },
                })
              }
            />
            <Label htmlFor={`field-required-${field.id}`}>필수 입력</Label>
          </div>

          {(field.type === 'text' || field.type === 'textarea') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`field-min-${field.id}`}>최소 길이</Label>
                <Input
                  id={`field-min-${field.id}`}
                  type="number"
                  value={field.validation?.minLength || ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        minLength: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`field-max-${field.id}`}>최대 길이</Label>
                <Input
                  id={`field-max-${field.id}`}
                  type="number"
                  value={field.validation?.maxLength || ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        maxLength: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`field-min-${field.id}`}>최솟값</Label>
                <Input
                  id={`field-min-${field.id}`}
                  type="number"
                  value={field.validation?.min || ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        min: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`field-max-${field.id}`}>최댓값</Label>
                <Input
                  id={`field-max-${field.id}`}
                  type="number"
                  value={field.validation?.max || ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        max: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`field-pattern-${field.id}`}>정규식 패턴</Label>
            <Input
              id={`field-pattern-${field.id}`}
              value={field.validation?.pattern || ''}
              onChange={(e) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    pattern: e.target.value,
                  },
                })
              }
              placeholder="예: ^[A-Za-z0-9]+$"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`field-message-${field.id}`}>검증 실패 메시지</Label>
            <Input
              id={`field-message-${field.id}`}
              value={field.validation?.message || ''}
              onChange={(e) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    message: e.target.value,
                  },
                })
              }
              placeholder="검증 실패 시 표시될 메시지"
            />
          </div>
        </div>

        {/* 선택 옵션 (select, radio) */}
        {showOptions && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">선택 옵션</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  옵션 추가
                </Button>
              </div>

              {field.options?.map((option, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 border rounded"
                >
                  <Input
                    value={option.value}
                    onChange={(e) =>
                      handleUpdateOption(index, { value: e.target.value })
                    }
                    placeholder="값"
                    className="flex-1"
                  />
                  <Input
                    value={option.label}
                    onChange={(e) =>
                      handleUpdateOption(index, { label: e.target.value })
                    }
                    placeholder="라벨"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {(!field.options || field.options.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  옵션이 없습니다. 옵션을 추가해주세요.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
