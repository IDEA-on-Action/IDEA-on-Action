/**
 * RichTextEditor Component
 * CMS Phase 5: Rich Text Editor
 *
 * WYSIWYG editor with markdown toggle support using Tiptap
 */

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { EditorContent } from '@tiptap/react'
import { useRichTextEditor } from '@/hooks/useRichTextEditor'
import { EditorToolbar } from './EditorToolbar'
import { Textarea } from '@/components/ui/textarea'
import type { RichTextEditorProps, EditorMode } from '@/types/editor.types'
import { DEFAULT_EDITOR_CONFIG } from '@/types/editor.types'
import { htmlToMarkdown, markdownToHtml } from '@/lib/editor/markdown-utils'
import { cn } from '@/lib/utils'

/**
 * Rich Text Editor with WYSIWYG and Markdown modes
 *
 * @example
 * ```tsx
 * <RichTextEditor
 *   value={content}
 *   onChange={(markdown) => setContent(markdown)}
 *   config={{ placeholder: 'Write your post...' }}
 * />
 * ```
 */
export function RichTextEditor({
  value = '',
  onChange,
  onHtmlChange,
  defaultMode = 'wysiwyg',
  config = DEFAULT_EDITOR_CONFIG,
  outputFormat = 'markdown',
  disabled = false,
  error = false,
  errorMessage,
  className,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<EditorMode>(defaultMode)
  const [markdownContent, setMarkdownContent] = useState(() => {
    // If value looks like HTML, convert to markdown
    if (value.includes('<')) {
      return htmlToMarkdown(value)
    }
    return value
  })

  // Initialize editor with the hook
  const {
    editor,
    characterCount,
    wordCount,
  } = useRichTextEditor({
    initialContent: value.includes('<') ? value : markdownToHtml(value),
    config: {
      ...config,
      editable: !disabled,
    },
  })

  // Sync external value changes
  useEffect(() => {
    if (!editor) return

    const currentHtml = editor.getHTML()
    const newHtml = value.includes('<') ? value : markdownToHtml(value)

    // Only update if content is actually different
    if (currentHtml !== newHtml && newHtml !== markdownToHtml(htmlToMarkdown(currentHtml))) {
      editor.commands.setContent(newHtml)
      setMarkdownContent(value.includes('<') ? htmlToMarkdown(value) : value)
    }
  }, [value, editor])

  // Handle mode change
  const handleModeChange = useCallback((newMode: EditorMode) => {
    if (!editor) return

    if (newMode === 'markdown' && mode === 'wysiwyg') {
      // Switching to markdown - convert current HTML to markdown
      const html = editor.getHTML()
      setMarkdownContent(htmlToMarkdown(html))
    } else if (newMode === 'wysiwyg' && mode === 'markdown') {
      // Switching to WYSIWYG - convert markdown to HTML
      const html = markdownToHtml(markdownContent)
      editor.commands.setContent(html)
    }

    setMode(newMode)
  }, [editor, mode, markdownContent])

  // Handle markdown textarea change
  const handleMarkdownChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMarkdown = e.target.value
    setMarkdownContent(newMarkdown)

    // Emit changes
    if (outputFormat === 'markdown' && onChange) {
      onChange(newMarkdown)
    } else if (outputFormat === 'html' && onChange) {
      onChange(markdownToHtml(newMarkdown))
    }
    if (onHtmlChange) {
      onHtmlChange(markdownToHtml(newMarkdown))
    }
  }, [onChange, onHtmlChange, outputFormat])

  // Handle WYSIWYG content update
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const html = editor.getHTML()
      const markdown = htmlToMarkdown(html)

      // Only emit changes in WYSIWYG mode
      if (mode === 'wysiwyg') {
        if (outputFormat === 'markdown' && onChange) {
          onChange(markdown)
        } else if (outputFormat === 'html' && onChange) {
          onChange(html)
        }
        if (onHtmlChange) {
          onHtmlChange(html)
        }
        // Keep markdown in sync for mode switching
        setMarkdownContent(markdown)
      }
    }

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, mode, onChange, onHtmlChange, outputFormat])

  const minHeight = config.minHeight ?? 200
  const maxHeight = config.maxHeight ?? 600

  return (
    <div
      className={cn(
        'rounded-lg border bg-background',
        error && 'border-destructive',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Toolbar */}
      <EditorToolbar
        editor={editor}
        mode={mode}
        onModeChange={handleModeChange}
        showModeToggle
        disabled={disabled}
      />

      {/* Editor Content */}
      <div className="relative">
        {mode === 'wysiwyg' ? (
          <div
            className={cn(
              'prose prose-sm dark:prose-invert max-w-none',
              'px-4 py-3',
              'focus-within:outline-none',
              '[&_.ProseMirror]:outline-none',
              '[&_.ProseMirror]:min-h-[inherit]',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
              'min-h-[var(--editor-min-height)]',
              'max-h-[var(--editor-max-height)]',
              'overflow-y-auto'
            )}
            style={
              {
                '--editor-min-height': `${minHeight}px`,
                '--editor-max-height': `${maxHeight}px`,
              } as CSSProperties
            }
          >
            <EditorContent editor={editor} />
          </div>
        ) : (
          <Textarea
            value={markdownContent}
            onChange={handleMarkdownChange}
            disabled={disabled}
            placeholder={config.placeholder}
            className={cn(
              'rounded-none rounded-b-lg border-0 resize-none font-mono text-sm',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'min-h-[var(--editor-min-height)]',
              'max-h-[var(--editor-max-height)]'
            )}
            style={
              {
                '--editor-min-height': `${minHeight}px`,
                '--editor-max-height': `${maxHeight}px`,
              } as CSSProperties
            }
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground rounded-b-lg">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>{characterCount} characters</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="capitalize">{mode} mode</span>
          {outputFormat === 'markdown' && (
            <span className="text-muted-foreground/70">| Markdown output</span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && errorMessage && (
        <p className="px-3 py-1.5 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}

export default RichTextEditor
