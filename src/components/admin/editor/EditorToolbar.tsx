/**
 * EditorToolbar Component
 * CMS Phase 5: Rich Text Editor
 *
 * Toolbar with formatting buttons for the rich text editor
 */

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link,
  Image,
  Undo,
  Redo,
  FileCode2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EditorToolbarProps } from '@/types/cms/editor.types'
import { SUPPORTED_LANGUAGES } from '@/types/cms/editor.types'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
}

function ToolbarButton({
  icon: Icon,
  label,
  shortcut,
  isActive = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isActive}
            onPressedChange={onClick}
            disabled={disabled}
            aria-label={label}
            className="h-8 w-8 p-0"
          >
            <Icon className="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{label}</p>
          {shortcut && <p className="text-muted-foreground">{shortcut}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function EditorToolbar({
  editor,
  mode,
  onModeChange,
  showModeToggle = true,
  disabled = false,
  className,
}: EditorToolbarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [codeBlockDialogOpen, setCodeBlockDialogOpen] = useState(false)
  const [codeLanguage, setCodeLanguage] = useState('javascript')

  const isWysiwyg = mode === 'wysiwyg'
  const isDisabled = disabled || !editor || !isWysiwyg

  // Link handlers
  const handleOpenLinkDialog = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    setLinkUrl(previousUrl || '')
    setLinkDialogOpen(true)
  }, [editor])

  const handleSetLink = useCallback(() => {
    if (!editor) return
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl })
        .run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setLinkDialogOpen(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  // Image handlers
  const handleOpenImageDialog = useCallback(() => {
    setImageUrl('')
    setImageAlt('')
    setImageDialogOpen(true)
  }, [])

  const handleInsertImage = useCallback(() => {
    if (!editor || !imageUrl) return
    editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run()
    setImageDialogOpen(false)
    setImageUrl('')
    setImageAlt('')
  }, [editor, imageUrl, imageAlt])

  // Code block handlers
  const handleOpenCodeBlockDialog = useCallback(() => {
    setCodeLanguage('javascript')
    setCodeBlockDialogOpen(true)
  }, [])

  const handleInsertCodeBlock = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleCodeBlock({ language: codeLanguage }).run()
    setCodeBlockDialogOpen(false)
  }, [editor, codeLanguage])

  if (!editor) return null

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-0.5 p-1 border-b bg-muted/50 rounded-t-lg',
          className
        )}
      >
        {/* Text Formatting */}
        <ToolbarButton
          icon={Bold}
          label="Bold"
          shortcut="Ctrl+B"
          isActive={editor.isActive('bold')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={Italic}
          label="Italic"
          shortcut="Ctrl+I"
          isActive={editor.isActive('italic')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={Strikethrough}
          label="Strikethrough"
          shortcut="Ctrl+Shift+S"
          isActive={editor.isActive('strike')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          icon={Code}
          label="Inline Code"
          shortcut="Ctrl+E"
          isActive={editor.isActive('code')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Headings */}
        <ToolbarButton
          icon={Heading1}
          label="Heading 1"
          shortcut="Ctrl+Alt+1"
          isActive={editor.isActive('heading', { level: 1 })}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          icon={Heading2}
          label="Heading 2"
          shortcut="Ctrl+Alt+2"
          isActive={editor.isActive('heading', { level: 2 })}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon={Heading3}
          label="Heading 3"
          shortcut="Ctrl+Alt+3"
          isActive={editor.isActive('heading', { level: 3 })}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Lists */}
        <ToolbarButton
          icon={List}
          label="Bullet List"
          shortcut="Ctrl+Shift+8"
          isActive={editor.isActive('bulletList')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Numbered List"
          shortcut="Ctrl+Shift+7"
          isActive={editor.isActive('orderedList')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Block Elements */}
        <ToolbarButton
          icon={Quote}
          label="Blockquote"
          shortcut="Ctrl+Shift+B"
          isActive={editor.isActive('blockquote')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={FileCode2}
          label="Code Block"
          isActive={editor.isActive('codeBlock')}
          disabled={isDisabled}
          onClick={handleOpenCodeBlockDialog}
        />
        <ToolbarButton
          icon={Minus}
          label="Horizontal Rule"
          disabled={isDisabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Media */}
        <ToolbarButton
          icon={Link}
          label="Insert Link"
          shortcut="Ctrl+K"
          isActive={editor.isActive('link')}
          disabled={isDisabled}
          onClick={handleOpenLinkDialog}
        />
        <ToolbarButton
          icon={Image}
          label="Insert Image"
          disabled={isDisabled}
          onClick={handleOpenImageDialog}
        />

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* History */}
        <ToolbarButton
          icon={Undo}
          label="Undo"
          shortcut="Ctrl+Z"
          disabled={isDisabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          icon={Redo}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          disabled={isDisabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />

        {/* Mode Toggle */}
        {showModeToggle && onModeChange && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <div className="flex items-center gap-1 ml-auto">
              <Button
                type="button"
                variant={mode === 'wysiwyg' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onModeChange('wysiwyg')}
                disabled={disabled}
                className="h-7 text-xs"
              >
                Visual
              </Button>
              <Button
                type="button"
                variant={mode === 'markdown' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onModeChange('markdown')}
                disabled={disabled}
                className="h-7 text-xs"
              >
                Markdown
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Enter the URL for the link. Leave empty to remove the link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSetLink()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetLink}>
              {linkUrl ? 'Apply' : 'Remove Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Enter the URL of the image you want to insert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-alt">Alt Text (optional)</Label>
              <Input
                id="image-alt"
                placeholder="Image description"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleInsertImage()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertImage} disabled={!imageUrl}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Code Block Dialog */}
      <Dialog open={codeBlockDialogOpen} onOpenChange={setCodeBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Code Block</DialogTitle>
            <DialogDescription>
              Select the programming language for syntax highlighting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code-language">Language</Label>
              <Select value={codeLanguage} onValueChange={setCodeLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertCodeBlock}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
