/**
 * Tiptap Editor Extensions
 * CMS Phase 5: Rich Text Editor
 *
 * Custom extensions configuration for Tiptap editor
 */

import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import type { EditorConfig } from '@/types/editor.types'

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

/**
 * Configure StarterKit extension
 */
export function configureStarterKit() {
  return StarterKit.configure({
    // Disable default code block in favor of CodeBlockLowlight
    codeBlock: false,
    // Heading levels
    heading: {
      levels: [1, 2, 3],
    },
    // Enable history (undo/redo)
    history: {
      depth: 100,
    },
  })
}

/**
 * Configure Link extension
 */
export function configureLink() {
  return Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: 'https',
    HTMLAttributes: {
      class: 'text-primary underline cursor-pointer hover:text-primary/80',
      rel: 'noopener noreferrer',
    },
  })
}

/**
 * Configure Image extension
 */
export function configureImage() {
  return Image.configure({
    inline: false,
    allowBase64: false,
    HTMLAttributes: {
      class: 'rounded-lg max-w-full h-auto',
    },
  })
}

/**
 * Configure Placeholder extension
 */
export function configurePlaceholder(placeholder: string = 'Write something...') {
  return Placeholder.configure({
    placeholder,
    emptyNodeClass: 'before:text-muted-foreground before:content-[attr(data-placeholder)] before:float-left before:h-0 before:pointer-events-none',
  })
}

/**
 * Configure CodeBlockLowlight extension
 */
export function configureCodeBlock() {
  return CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
    HTMLAttributes: {
      class: 'rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto',
    },
  })
}

/**
 * Get all configured extensions based on config
 */
export function getEditorExtensions(config?: EditorConfig) {
  const extensions = [
    configureStarterKit(),
    configurePlaceholder(config?.placeholder),
  ]

  if (config?.enableLinks !== false) {
    extensions.push(configureLink())
  }

  if (config?.enableImages !== false) {
    extensions.push(configureImage())
  }

  if (config?.enableCodeBlocks !== false) {
    extensions.push(configureCodeBlock())
  }

  return extensions
}

/**
 * Export lowlight for external use
 */
export { lowlight }
