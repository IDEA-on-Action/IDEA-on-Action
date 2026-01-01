/**
 * MediaModal Component
 *
 * Modal for previewing and editing media item details.
 * Shows full-size image preview and editable metadata.
 * R2 스토리지 마이그레이션 지원
 */

import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, ExternalLink, Edit2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatFileSize, formatDate } from '@/lib/cms-utils';
import type { MediaItem } from '@/types/cms/cms.types';
import { toast } from 'sonner';
import { getMediaPublicUrl } from '@/lib/media-utils';

// =====================================================
// Types
// =====================================================

export interface MediaModalProps {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (id: string, values: { alt_text?: string; filename?: string }) => void;
  isUpdating?: boolean;
}

// =====================================================
// Helper Functions
// =====================================================

function getPublicUrl(storagePath: string): string {
  // R2 URL 직접 생성 (Supabase 제거)
  return getMediaPublicUrl(storagePath, true);
}

// =====================================================
// Component
// =====================================================

export function MediaModal({
  item,
  open,
  onOpenChange,
  onUpdate,
  isUpdating = false,
}: MediaModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [altText, setAltText] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setAltText(item.alt_text || '');
      setIsEditing(false);
    }
  }, [item]);

  if (!item) return null;

  const imageUrl = getPublicUrl(item.storage_path);
  const isImage = item.mime_type.startsWith('image/');

  // Handle copy URL
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = item.original_filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle save
  const handleSave = () => {
    if (onUpdate) {
      onUpdate(item.id, { alt_text: altText });
    }
    setIsEditing(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setAltText(item.alt_text || '');
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8" title={item.original_filename}>
            {item.original_filename}
          </DialogTitle>
          <DialogDescription>
            Uploaded on {formatDate(item.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                {isImage ? (
                  <img
                    src={imageUrl}
                    alt={item.alt_text || item.original_filename}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    File preview not available
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Copy URL'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(imageUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Open in new tab</span>
                </Button>
              </div>
            </div>

            {/* File Details */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">File Information</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">File Name</dt>
                    <dd className="font-mono text-right truncate max-w-[200px]" title={item.filename}>
                      {item.filename}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Size</dt>
                    <dd>{formatFileSize(item.file_size)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Type</dt>
                    <dd>
                      <Badge variant="secondary">{item.mime_type}</Badge>
                    </dd>
                  </div>
                  {item.width && item.height && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Dimensions</dt>
                      <dd>{item.width} x {item.height} px</dd>
                    </div>
                  )}
                </dl>
              </div>

              <Separator />

              {/* URL */}
              <div>
                <Label className="text-sm font-semibold">Public URL</Label>
                <div className="mt-2">
                  <Input
                    value={imageUrl}
                    readOnly
                    className="font-mono text-xs"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>

              <Separator />

              {/* Alt Text */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Alt Text</Label>
                  {!isEditing && onUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe this image for accessibility..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {item.alt_text || 'No alt text provided'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MediaModal;
