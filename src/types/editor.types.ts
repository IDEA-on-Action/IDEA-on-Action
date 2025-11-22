/**
 * Editor Types
 * CMS Phase 5: Rich Text Editor
 *
 * TypeScript type definitions for Tiptap-based rich text editor
 */

import type { Editor } from '@tiptap/react'

/**
 * Editor mode - WYSIWYG or Markdown
 */
export type EditorMode = 'wysiwyg' | 'markdown'

/**
 * Editor content format
 */
export interface EditorContent {
  /** HTML content from WYSIWYG mode */
  html: string
  /** Markdown content */
  markdown: string
}

/**
 * Editor configuration options
 */
export interface EditorConfig {
  /** Placeholder text when editor is empty */
  placeholder?: string
  /** Enable auto-focus on mount */
  autofocus?: boolean
  /** Make editor read-only */
  editable?: boolean
  /** Minimum height in pixels */
  minHeight?: number
  /** Maximum height in pixels */
  maxHeight?: number
  /** Enable image uploads */
  enableImages?: boolean
  /** Enable code blocks with syntax highlighting */
  enableCodeBlocks?: boolean
  /** Enable link insertion */
  enableLinks?: boolean
  /** Custom class name for editor container */
  className?: string
}

/**
 * Toolbar button configuration
 */
export interface ToolbarButton {
  /** Unique identifier */
  id: string
  /** Display label */
  label: string
  /** Icon component or name */
  icon: React.ComponentType<{ className?: string }>
  /** Action to perform when clicked */
  action: (editor: Editor) => void
  /** Check if button should be active */
  isActive?: (editor: Editor) => boolean
  /** Check if button should be disabled */
  isDisabled?: (editor: Editor) => boolean
  /** Tooltip text */
  tooltip?: string
  /** Keyboard shortcut */
  shortcut?: string
}

/**
 * Toolbar group - groups related buttons
 */
export interface ToolbarGroup {
  /** Group identifier */
  id: string
  /** Buttons in this group */
  buttons: ToolbarButton[]
}

/**
 * Link insert dialog data
 */
export interface LinkData {
  /** URL */
  href: string
  /** Link text */
  text?: string
  /** Open in new tab */
  target?: '_blank' | '_self'
  /** Rel attribute */
  rel?: string
}

/**
 * Image insert dialog data
 */
export interface ImageData {
  /** Image URL */
  src: string
  /** Alt text */
  alt?: string
  /** Image title */
  title?: string
  /** Width */
  width?: number
  /** Height */
  height?: number
}

/**
 * Code block options
 */
export interface CodeBlockData {
  /** Programming language */
  language?: string
  /** Code content */
  content: string
}

/**
 * Rich text editor props
 */
export interface RichTextEditorProps {
  /** Initial content (HTML or Markdown) */
  value?: string
  /** Content change handler */
  onChange?: (content: string) => void
  /** HTML content change handler (separate from markdown) */
  onHtmlChange?: (html: string) => void
  /** Initial mode */
  defaultMode?: EditorMode
  /** Editor configuration */
  config?: EditorConfig
  /** Whether to output markdown or HTML */
  outputFormat?: 'html' | 'markdown'
  /** Disabled state */
  disabled?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
  /** Custom class name */
  className?: string
}

/**
 * Editor toolbar props
 */
export interface EditorToolbarProps {
  /** Tiptap editor instance */
  editor: Editor | null
  /** Current mode */
  mode: EditorMode
  /** Mode toggle handler */
  onModeChange?: (mode: EditorMode) => void
  /** Show mode toggle button */
  showModeToggle?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Markdown toggle props
 */
export interface MarkdownToggleProps {
  /** Current mode */
  mode: EditorMode
  /** Mode change handler */
  onModeChange: (mode: EditorMode) => void
  /** Disabled state */
  disabled?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Editor menu bar props
 */
export interface EditorMenuBarProps {
  /** Tiptap editor instance */
  editor: Editor | null
  /** Disabled state */
  disabled?: boolean
  /** Custom class name */
  className?: string
}

/**
 * useRichTextEditor hook options
 */
export interface UseRichTextEditorOptions {
  /** Initial content */
  initialContent?: string
  /** Editor configuration */
  config?: EditorConfig
  /** Content change handler */
  onContentChange?: (content: EditorContent) => void
  /** Output format preference */
  outputFormat?: 'html' | 'markdown'
}

/**
 * useRichTextEditor hook return type
 */
export interface UseRichTextEditorReturn {
  /** Tiptap editor instance */
  editor: Editor | null
  /** Current mode */
  mode: EditorMode
  /** Set mode */
  setMode: (mode: EditorMode) => void
  /** Get current content */
  getContent: () => EditorContent
  /** Set content */
  setContent: (content: string, format?: 'html' | 'markdown') => void
  /** Clear content */
  clearContent: () => void
  /** Check if editor is empty */
  isEmpty: boolean
  /** Character count */
  characterCount: number
  /** Word count */
  wordCount: number
  /** Is editor focused */
  isFocused: boolean
  /** Focus editor */
  focus: () => void
  /** Blur editor */
  blur: () => void
}

/**
 * Supported programming languages for code blocks
 */
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'sql',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'markdown',
  'bash',
  'shell',
  'dockerfile',
  'graphql',
] as const

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

/**
 * Default editor configuration
 */
export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  placeholder: 'Write something...',
  autofocus: false,
  editable: true,
  minHeight: 200,
  maxHeight: 600,
  enableImages: true,
  enableCodeBlocks: true,
  enableLinks: true,
}
