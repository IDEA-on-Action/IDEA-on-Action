/**
 * useRichTextEditor Hook
 * CMS Phase 5: Rich Text Editor
 *
 * Custom hook for managing Tiptap editor state and functionality
 */

import { useState, useCallback, useMemo } from 'react'
import { useEditor } from '@tiptap/react'
import { getEditorExtensions } from '@/lib/editor/extensions'
import { htmlToMarkdown, markdownToHtml, countWords, countCharacters } from '@/lib/editor/markdown-utils'
import type {
  EditorMode,
  EditorContent,
  UseRichTextEditorOptions,
  UseRichTextEditorReturn,
} from '@/types/editor.types'
import { DEFAULT_EDITOR_CONFIG } from '@/types/editor.types'

/**
 * Custom hook for Rich Text Editor
 *
 * @example
 * ```tsx
 * const { editor, mode, setMode, getContent } = useRichTextEditor({
 *   initialContent: '<p>Hello World</p>',
 *   config: { placeholder: 'Write here...' },
 * })
 * ```
 */
export function useRichTextEditor(
  options: UseRichTextEditorOptions = {}
): UseRichTextEditorReturn {
  const {
    initialContent = '',
    config = DEFAULT_EDITOR_CONFIG,
    onContentChange,
    outputFormat = 'html',
  } = options

  // Current editor mode (WYSIWYG or Markdown)
  const [mode, setModeState] = useState<EditorMode>('wysiwyg')

  // Markdown content (used when in markdown mode)
  const [markdownContent, setMarkdownContent] = useState<string>(() => {
    // If initial content looks like markdown (no HTML tags), use as is
    if (initialContent && !initialContent.includes('<')) {
      return initialContent
    }
    // Otherwise convert HTML to markdown
    return htmlToMarkdown(initialContent)
  })

  // Configure extensions based on config
  const extensions = useMemo(() => getEditorExtensions(config), [config])

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions,
    content: initialContent.includes('<') ? initialContent : markdownToHtml(initialContent),
    editable: config.editable !== false,
    autofocus: config.autofocus ?? false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const markdown = htmlToMarkdown(html)

      // Update markdown content state
      setMarkdownContent(markdown)

      // Call content change handler
      if (onContentChange) {
        onContentChange({ html, markdown })
      }
    },
  })

  /**
   * Switch between WYSIWYG and Markdown mode
   */
  const setMode = useCallback((newMode: EditorMode) => {
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

    setModeState(newMode)
  }, [editor, mode, markdownContent])

  /**
   * Get current content in both formats
   */
  const getContent = useCallback((): EditorContent => {
    if (!editor) {
      return { html: '', markdown: '' }
    }

    const html = editor.getHTML()
    const markdown = mode === 'markdown' ? markdownContent : htmlToMarkdown(html)

    return { html, markdown }
  }, [editor, mode, markdownContent])

  /**
   * Set content from external source
   */
  const setContent = useCallback((content: string, format: 'html' | 'markdown' = 'html') => {
    if (!editor) return

    if (format === 'markdown') {
      setMarkdownContent(content)
      const html = markdownToHtml(content)
      editor.commands.setContent(html)
    } else {
      editor.commands.setContent(content)
      setMarkdownContent(htmlToMarkdown(content))
    }
  }, [editor])

  /**
   * Clear editor content
   */
  const clearContent = useCallback(() => {
    if (!editor) return
    editor.commands.clearContent()
    setMarkdownContent('')
  }, [editor])

  /**
   * Check if editor is empty
   */
  const editorIsEmpty = editor?.isEmpty
  const isEmpty = useMemo(() => {
    if (!editor) return true
    return editorIsEmpty ?? true
  }, [editor, editorIsEmpty])

  /**
   * Get character count
   */
  const editorHtml = editor?.getHTML()
  const characterCount = useMemo(() => {
    if (!editor || !editorHtml) return 0
    return countCharacters(editorHtml)
  }, [editor, editorHtml])

  /**
   * Get word count
   */
  const wordCount = useMemo(() => {
    if (!editor || !editorHtml) return 0
    return countWords(editorHtml)
  }, [editor, editorHtml])

  /**
   * Check if editor is focused
   */
  const editorIsFocused = editor?.isFocused
  const isFocused = useMemo(() => {
    if (!editor) return false
    return editorIsFocused ?? false
  }, [editor, editorIsFocused])

  /**
   * Focus editor
   */
  const focus = useCallback(() => {
    if (editor) {
      editor.commands.focus()
    }
  }, [editor])

  /**
   * Blur editor
   */
  const blur = useCallback(() => {
    if (editor) {
      editor.commands.blur()
    }
  }, [editor])

  return {
    editor,
    mode,
    setMode,
    getContent,
    setContent,
    clearContent,
    isEmpty,
    characterCount,
    wordCount,
    isFocused,
    focus,
    blur,
  }
}
