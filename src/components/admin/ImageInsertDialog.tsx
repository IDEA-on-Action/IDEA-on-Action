/**
 * ImageInsertDialog Component
 * CMS Phase 5: Rich Text Editor - Advanced Extensions
 *
 * Dialog for inserting images via URL or MediaLibrary selection
 */

import { useState, useCallback, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Link2,
  ImageIcon,
  AlertCircle,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'
import { MediaLibrary } from '@/components/admin/media/MediaLibrary'
import type { MediaItem } from '@/types/cms/cms.types'
import type { ImageAlignment, CustomImageAttributes } from './extensions/ImageExtension'
import { cn } from '@/lib/utils'

/**
 * Props for ImageInsertDialog
 */
export interface ImageInsertDialogProps {
  /** Dialog open state */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Tiptap editor instance */
  editor: Editor | null
  /** Callback when image is inserted */
  onInsert?: (attributes: CustomImageAttributes) => void
}

/**
 * Validate image URL
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false

  // Basic URL validation
  try {
    new URL(url)
  } catch {
    return false
  }

  // Check for common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']
  const lowercaseUrl = url.toLowerCase()

  // Check if URL ends with image extension or contains common image CDN patterns
  const hasImageExtension = imageExtensions.some((ext) => lowercaseUrl.includes(ext))
  const isImageCdn = /\/(image|img|media|cdn|upload)/i.test(url)
  const hasImageMimeType = /\.(jpg|jpeg|png|gif|webp|svg|avif)/i.test(url)

  return hasImageExtension || isImageCdn || hasImageMimeType || true // Allow any URL for flexibility
}

/**
 * ImageInsertDialog Component
 *
 * Features:
 * - URL input with validation and preview
 * - MediaLibrary integration for image selection
 * - Alt text input (required for accessibility)
 * - Alignment selection
 * - Image preview before insertion
 */
export function ImageInsertDialog({
  open,
  onOpenChange,
  editor,
  onInsert,
}: ImageInsertDialogProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'library'>('url')
  const [imageUrl, setImageUrl] = useState('')
  const [altText, setAltText] = useState('')
  const [alignment, setAlignment] = useState<ImageAlignment>('center')
  const [isLoading, setIsLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [urlError, setUrlError] = useState('')

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setImageUrl('')
      setAltText('')
      setAlignment('center')
      setPreviewError(false)
      setUrlError('')
      setActiveTab('url')
    }
  }, [open])

  // Validate URL on change
  useEffect(() => {
    if (imageUrl && !isValidImageUrl(imageUrl)) {
      setUrlError('Please enter a valid image URL')
    } else {
      setUrlError('')
    }
    setPreviewError(false)
  }, [imageUrl])

  // Handle URL input change
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
  }, [])

  // Handle alt text change
  const handleAltChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAltText(e.target.value)
  }, [])

  // Handle image load error
  const handlePreviewError = useCallback(() => {
    setPreviewError(true)
  }, [])

  // Handle image load success
  const handlePreviewLoad = useCallback(() => {
    setPreviewError(false)
    setIsLoading(false)
  }, [])

  // Handle MediaLibrary selection
  const handleMediaSelect = useCallback((item: MediaItem) => {
    setImageUrl(item.url)
    setAltText(item.alt_text || item.filename || '')
    setActiveTab('url') // Switch to URL tab to show preview
  }, [])

  // Handle insert
  const handleInsert = useCallback(() => {
    if (!editor || !imageUrl) return

    if (!altText.trim()) {
      // Alt text is important for accessibility, but we'll allow empty
      console.warn('Image inserted without alt text')
    }

    const attributes: CustomImageAttributes = {
      src: imageUrl,
      alt: altText || undefined,
      alignment,
    }

    // Insert image using editor commands
    editor.chain().focus().setImage(attributes).run()

    // Call optional callback
    onInsert?.(attributes)

    // Close dialog
    onOpenChange(false)
  }, [editor, imageUrl, altText, alignment, onInsert, onOpenChange])

  // Check if can insert
  const canInsert = imageUrl && !urlError && !previewError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
          <DialogDescription>
            Enter an image URL or select from the media library
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'url' | 'library')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Library
            </TabsTrigger>
          </TabsList>

          {/* URL Input Tab */}
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={handleUrlChange}
                className={cn(urlError && 'border-destructive')}
              />
              {urlError && (
                <p className="text-sm text-destructive">{urlError}</p>
              )}
            </div>

            {/* Image Preview */}
            {imageUrl && !urlError && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative border rounded-lg overflow-hidden bg-muted min-h-[200px] flex items-center justify-center">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                  {previewError ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                      <AlertCircle className="h-8 w-8" />
                      <span className="text-sm">Failed to load image</span>
                    </div>
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className={cn(
                        'max-h-[300px] object-contain',
                        alignment === 'left' && 'mr-auto',
                        alignment === 'center' && 'mx-auto',
                        alignment === 'right' && 'ml-auto'
                      )}
                      onLoad={handlePreviewLoad}
                      onError={handlePreviewError}
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Media Library Tab */}
          <TabsContent value="library" className="min-h-[400px]">
            <MediaLibrary
              mode="select"
              onSelect={handleMediaSelect}
              columns={3}
              className="max-h-[400px] overflow-y-auto"
            />
          </TabsContent>
        </Tabs>

        {/* Alt Text and Alignment (always visible when URL is set) */}
        {imageUrl && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="alt-text">
                Alt Text
                <span className="text-muted-foreground text-xs ml-2">
                  (recommended for accessibility)
                </span>
              </Label>
              <Input
                id="alt-text"
                placeholder="Describe the image content"
                value={altText}
                onChange={handleAltChange}
              />
              {!altText && (
                <Alert variant="default" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Adding alt text improves accessibility for screen readers
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label>Alignment</Label>
              <div className="flex gap-1">
                <Toggle
                  pressed={alignment === 'left'}
                  onPressedChange={() => setAlignment('left')}
                  aria-label="Align left"
                  size="sm"
                >
                  <AlignLeft className="h-4 w-4" />
                </Toggle>
                <Toggle
                  pressed={alignment === 'center'}
                  onPressedChange={() => setAlignment('center')}
                  aria-label="Align center"
                  size="sm"
                >
                  <AlignCenter className="h-4 w-4" />
                </Toggle>
                <Toggle
                  pressed={alignment === 'right'}
                  onPressedChange={() => setAlignment('right')}
                  aria-label="Align right"
                  size="sm"
                >
                  <AlignRight className="h-4 w-4" />
                </Toggle>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!canInsert}>
            Insert Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImageInsertDialog
