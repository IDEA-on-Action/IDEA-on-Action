/**
 * EditorMenuBar Component
 * CMS Phase 5: Rich Text Editor
 *
 * Alternative menu bar style for the editor (dropdown menus)
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
  ChevronDown,
  Type,
  AlignLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { EditorMenuBarProps } from '@/types/cms/editor.types'
import { SUPPORTED_LANGUAGES } from '@/types/cms/editor.types'
import { cn } from '@/lib/utils'

/**
 * Menu bar with dropdown menus for editor actions
 * Alternative to the toolbar for a cleaner interface
 */
export function EditorMenuBar({
  editor,
  disabled = false,
  className,
}: EditorMenuBarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [codeBlockDialogOpen, setCodeBlockDialogOpen] = useState(false)
  const [codeLanguage, setCodeLanguage] = useState('javascript')

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
  const handleInsertImage = useCallback(() => {
    if (!editor || !imageUrl) return
    editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run()
    setImageDialogOpen(false)
    setImageUrl('')
    setImageAlt('')
  }, [editor, imageUrl, imageAlt])

  // Code block handlers
  const handleInsertCodeBlock = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleCodeBlock({ language: codeLanguage }).run()
    setCodeBlockDialogOpen(false)
  }, [editor, codeLanguage])

  if (!editor) return null

  const isDisabled = disabled || !editor

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 p-1 border-b bg-muted/50 rounded-t-lg',
          className
        )}
      >
        {/* Edit Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isDisabled} className="h-8">
              Edit
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="mr-2 h-4 w-4" />
              Undo
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+Z</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="mr-2 h-4 w-4" />
              Redo
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+Shift+Z</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Format Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isDisabled} className="h-8">
              <Type className="mr-1 h-4 w-4" />
              Format
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="mr-2 h-4 w-4" />
              Bold
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+B</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="mr-2 h-4 w-4" />
              Italic
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+I</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough className="mr-2 h-4 w-4" />
              Strikethrough
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleCode().run()}>
              <Code className="mr-2 h-4 w-4" />
              Inline Code
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+E</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="mr-2 h-4 w-4" />
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="mr-2 h-4 w-4" />
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="mr-2 h-4 w-4" />
              Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Insert Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isDisabled} className="h-8">
              <AlignLeft className="mr-1 h-4 w-4" />
              Insert
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="mr-2 h-4 w-4" />
              Bullet List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="mr-2 h-4 w-4" />
              Numbered List
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="mr-2 h-4 w-4" />
              Blockquote
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCodeBlockDialogOpen(true)}>
              <FileCode2 className="mr-2 h-4 w-4" />
              Code Block
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              <Minus className="mr-2 h-4 w-4" />
              Horizontal Rule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenLinkDialog}>
              <Link className="mr-2 h-4 w-4" />
              Link
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+K</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImageDialogOpen(true)}>
              <Image className="mr-2 h-4 w-4" />
              Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Enter the URL for the link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menu-link-url">URL</Label>
              <Input
                id="menu-link-url"
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
              Enter the URL of the image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menu-image-url">Image URL</Label>
              <Input
                id="menu-image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="menu-image-alt">Alt Text</Label>
              <Input
                id="menu-image-alt"
                placeholder="Image description"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
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
              Select the programming language.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menu-code-language">Language</Label>
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

export default EditorMenuBar
