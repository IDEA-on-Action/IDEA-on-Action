/**
 * MarkdownToggle Component
 * CMS Phase 5: Rich Text Editor
 *
 * Toggle button for switching between WYSIWYG and Markdown modes
 */

import { Code, FileEdit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { MarkdownToggleProps } from '@/types/cms/editor.types'
import { cn } from '@/lib/utils'

/**
 * Toggle component for switching between Visual and Markdown editing modes
 *
 * @example
 * ```tsx
 * <MarkdownToggle
 *   mode={mode}
 *   onModeChange={setMode}
 * />
 * ```
 */
export function MarkdownToggle({
  mode,
  onModeChange,
  disabled = false,
  className,
}: MarkdownToggleProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-1', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={mode === 'wysiwyg' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('wysiwyg')}
              disabled={disabled}
              aria-label="Visual editor mode"
              className="h-8 px-3"
            >
              <FileEdit className="h-4 w-4 mr-1.5" />
              Visual
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Rich text editor with formatting toolbar</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={mode === 'markdown' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('markdown')}
              disabled={disabled}
              aria-label="Markdown editor mode"
              className="h-8 px-3"
            >
              <Code className="h-4 w-4 mr-1.5" />
              Markdown
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Raw markdown text editor</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export default MarkdownToggle
