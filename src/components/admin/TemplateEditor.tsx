/**
 * TemplateEditor Component
 *
 * 섹션 기반 템플릿 편집 UI
 * - 드래그 앤 드롭 필드 순서 변경
 * - 필드 추가/수정/삭제
 * - 미리보기 패널
 *
 * @module components/admin/TemplateEditor
 */

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TemplateEditorProps, TemplateSection, TemplateField } from '@/types/template-editor.types';
import { useTemplateEditor } from '@/hooks/useTemplateEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TemplateFieldEditor } from './TemplateFieldEditor';
import {
  Plus,
  Save,
  Download,
  Upload,
  Eye,
  AlertCircle,
  Loader2,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * 정렬 가능한 섹션 아이템
 */
interface SortableSectionItemProps {
  section: TemplateSection;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Omit<TemplateSection, 'id' | 'fields'>>) => void;
  onRemove: () => void;
  onAddField: () => void;
  onUpdateField: (fieldId: string, updates: Partial<Omit<TemplateField, 'id'>>) => void;
  onRemoveField: (fieldId: string) => void;
  onReorderFields: (fieldIds: string[]) => void;
}

function SortableSectionItem({
  section,
  isActive,
  onSelect,
  onUpdate,
  onRemove,
  onAddField,
  onUpdateField,
  onRemoveField,
  onReorderFields,
}: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = section.fields.findIndex((f) => f.id === active.id);
      const newIndex = section.fields.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(section.fields, oldIndex, newIndex);
        onReorderFields(newFields.map((f) => f.id));
      }
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn('mb-4', isActive && 'ring-2 ring-primary')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2 flex-1">
            <div {...attributes} {...listeners} className="cursor-move">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1" onClick={onSelect}>
              <Input
                value={section.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="섹션 제목"
                className="font-semibold"
              />
              {section.description && (
                <Textarea
                  value={section.description}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="섹션 설명"
                  rows={2}
                  className="text-sm text-muted-foreground"
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAddField}>
              <Plus className="h-4 w-4 mr-2" />
              필드 추가
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {section.fields.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFieldDragEnd}
            >
              <SortableContext
                items={section.fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {section.fields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      onUpdate={(updates) => onUpdateField(field.id, updates)}
                      onRemove={() => onRemoveField(field.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>필드가 없습니다. 필드를 추가해주세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 정렬 가능한 필드 아이템
 */
interface SortableFieldItemProps {
  field: TemplateField;
  onUpdate: (updates: Partial<Omit<TemplateField, 'id'>>) => void;
  onRemove: () => void;
}

function SortableFieldItem({ field, onUpdate, onRemove }: SortableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TemplateFieldEditor field={field} onUpdate={onUpdate} onRemove={onRemove} />
    </div>
  );
}

/**
 * 템플릿 에디터 컴포넌트
 */
export function TemplateEditor({
  templateId,
  initialState,
  onSave,
  className,
}: TemplateEditorProps) {
  const {
    state,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    addField,
    updateField,
    removeField,
    reorderFields,
    save,
    exportJSON,
    importJSON,
    isLoading,
    isSaving,
    error,
  } = useTemplateEditor({
    templateId,
    initialState,
    onSave,
    autoSave: true,
    autoSaveInterval: 30000, // 30초
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 섹션 추가 핸들러
  const handleAddSection = () => {
    addSection({
      title: '새 섹션',
      description: '',
      fields: [],
      collapsible: true,
      defaultCollapsed: false,
    });
  };

  // 필드 추가 핸들러
  const handleAddField = (sectionId: string) => {
    addField(sectionId, {
      name: `field_${Date.now()}`,
      type: 'text',
      label: '새 필드',
      placeholder: '',
    });
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = state.sections.findIndex((s) => s.id === active.id);
      const newIndex = state.sections.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(state.sections, oldIndex, newIndex);
        reorderSections(newSections.map((s) => s.id));
      }
    }
  };

  // JSON 내보내기 핸들러
  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${templateId || 'new'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON 가져오기 핸들러
  const handleImport = () => {
    try {
      importJSON(importText);
      setImportDialogOpen(false);
      setImportText('');
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-bold">템플릿 에디터</h2>
        <div className="flex items-center gap-2">
          {state.isDirty && (
            <span className="text-sm text-muted-foreground">변경 사항 있음</span>
          )}
          {state.lastSaved && (
            <span className="text-sm text-muted-foreground">
              마지막 저장: {new Date(state.lastSaved).toLocaleTimeString('ko-KR')}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                가져오기
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>JSON 가져오기</DialogTitle>
                <DialogDescription>
                  템플릿 JSON을 붙여넣어 가져오기
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="JSON 데이터를 여기에 붙여넣으세요..."
                rows={10}
              />
              <Button onClick={handleImport}>가져오기</Button>
            </DialogContent>
          </Dialog>
          <Button onClick={save} disabled={isSaving || !state.isDirty}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'preview')}>
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="editor">에디터</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            미리보기
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">섹션 관리</h3>
            <Button onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              섹션 추가
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-250px)]">
            {state.sections.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={state.sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {state.sections.map((section) => (
                    <SortableSectionItem
                      key={section.id}
                      section={section}
                      isActive={state.activeSection === section.id}
                      onSelect={() => {}}
                      onUpdate={(updates) => updateSection(section.id, updates)}
                      onRemove={() => removeSection(section.id)}
                      onAddField={() => handleAddField(section.id)}
                      onUpdateField={(fieldId, updates) =>
                        updateField(section.id, fieldId, updates)
                      }
                      onRemoveField={(fieldId) => removeField(section.id, fieldId)}
                      onReorderFields={(fieldIds) => reorderFields(section.id, fieldIds)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  섹션이 없습니다. 섹션을 추가해주세요.
                </p>
                <Button onClick={handleAddSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  첫 섹션 추가
                </Button>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="max-w-2xl mx-auto space-y-6">
              {state.sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                    {section.description && (
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label>
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea placeholder={field.placeholder} disabled />
                        ) : (
                          <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            disabled
                          />
                        )}
                        {field.helpText && (
                          <p className="text-sm text-muted-foreground">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {state.sections.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>미리보기할 섹션이 없습니다.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
