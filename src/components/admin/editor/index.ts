/**
 * Rich Text Editor Components
 * CMS Phase 5: Rich Text Editor
 *
 * Export all editor components for easy imports
 */

export { RichTextEditor } from './RichTextEditor'
export { EditorToolbar } from './EditorToolbar'
export { EditorMenuBar } from './EditorMenuBar'
export { MarkdownToggle } from './MarkdownToggle'

// Re-export types
export type {
  EditorMode,
  EditorContent,
  EditorConfig,
  RichTextEditorProps,
  EditorToolbarProps,
  EditorMenuBarProps,
  MarkdownToggleProps,
} from '@/types/cms/editor.types'

// Re-export hook
export { useRichTextEditor } from '@/hooks/useRichTextEditor'

// Re-export utilities
export {
  htmlToMarkdown,
  markdownToHtml,
  stripHtml,
  getPlainText,
  countWords,
  countCharacters,
} from '@/lib/editor/markdown-utils'
