/**
 * ImageUpload Component
 * Drag & drop image upload with preview, validation, Supabase integration
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { formatFileSize, validateFileType } from '@/lib/cms-utils';

export interface ImageUploadProps {
  value: string | string[];
  onChange: (urls: string | string[]) => void;
  multiple?: boolean;
  maxSize?: number; // MB
  accept?: string;
  onUpload: (file: File) => Promise<string>; // Returns URL
  disabled?: boolean;
  showAltText?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  preview: string;
  progress: number;
  error?: string;
  altText?: string;
}

export function ImageUpload({
  value,
  onChange,
  multiple = false,
  maxSize = 5, // 5MB default
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  onUpload,
  disabled = false,
  showAltText = false,
  className,
}: ImageUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Convert value to array
  const urls = Array.isArray(value) ? value : value ? [value] : [];

  // Handle file drop
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);

      // Validate files
      const maxBytes = maxSize * 1024 * 1024;
      const invalidFiles = acceptedFiles.filter(
        (file) => file.size > maxBytes || !validateFileType(file, accept)
      );

      if (invalidFiles.length > 0) {
        setError(
          `Some files are invalid. Max size: ${maxSize}MB. Accepted: ${accept}`
        );
        return;
      }

      // Limit files for non-multiple mode
      const filesToUpload = multiple ? acceptedFiles : acceptedFiles.slice(0, 1);

      // Initialize uploading state
      const newUploadingFiles: UploadingFile[] = filesToUpload.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Upload files
      for (const uploadingFile of newUploadingFiles) {
        try {
          // Simulate progress (real progress tracking requires custom upload implementation)
          const progressInterval = setInterval(() => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === uploadingFile.file && f.progress < 90
                  ? { ...f, progress: f.progress + 10 }
                  : f
              )
            );
          }, 100);

          // Upload file
          const url = await onUpload(uploadingFile.file);

          clearInterval(progressInterval);

          // Update state
          setUploadingFiles((prev) => prev.filter((f) => f.file !== uploadingFile.file));

          // Add URL to value
          const newUrls = multiple ? [...urls, url] : [url];
          onChange(multiple ? newUrls : newUrls[0]);
        } catch (err) {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === uploadingFile.file
                ? { ...f, progress: 0, error: (err as Error).message }
                : f
            )
          );
        }
      }
    },
    [multiple, maxSize, accept, onUpload, urls, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, type) => ({ ...acc, [type.trim()]: [] }), {}),
    multiple,
    disabled,
    maxSize: maxSize * 1024 * 1024,
  });

  // Handle delete uploaded image
  const handleDelete = (url: string) => {
    const newUrls = urls.filter((u) => u !== url);
    onChange(multiple ? newUrls : '');
  };

  // Handle retry failed upload
  const handleRetry = (uploadingFile: UploadingFile) => {
    onDrop([uploadingFile.file]);
    setUploadingFiles((prev) => prev.filter((f) => f !== uploadingFile));
  };

  // Handle cancel uploading
  const handleCancel = (uploadingFile: UploadingFile) => {
    URL.revokeObjectURL(uploadingFile.preview);
    setUploadingFiles((prev) => prev.filter((f) => f !== uploadingFile));
  };

  // Handle alt text change
  const handleAltTextChange = (url: string, altText: string) => {
    // This is a placeholder. In real implementation, you'd store alt text separately
    // or append it to the URL object
    console.log('Alt text update:', url, altText);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragActive && 'border-border hover:border-primary'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm">
            {isDragActive ? (
              <p className="text-primary">Drop files here...</p>
            ) : (
              <>
                <p>
                  <span className="font-medium text-primary">Click to upload</span> or
                  drag and drop
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {accept.replace(/,/g, ', ')} up to {maxSize}MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={`${uploadingFile.file.name}-${index}`}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <img
                src={uploadingFile.preview}
                alt={uploadingFile.file.name}
                className="h-12 w-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {uploadingFile.file.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(uploadingFile.file.size)}
                </div>
                {uploadingFile.error ? (
                  <div className="text-xs text-red-600 mt-1">{uploadingFile.error}</div>
                ) : (
                  <Progress value={uploadingFile.progress} className="mt-1" />
                )}
              </div>
              <div className="flex gap-1">
                {uploadingFile.error ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetry(uploadingFile)}
                  >
                    Retry
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCancel(uploadingFile)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded images */}
      {urls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative group">
              <div className="aspect-video relative rounded-lg overflow-hidden border">
                <img
                  src={url}
                  alt={`Uploaded ${index + 1}`}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(url)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>

              {/* Alt text input */}
              {showAltText && (
                <div className="mt-2">
                  <Label htmlFor={`alt-${index}`} className="text-xs">
                    Alt text
                  </Label>
                  <Input
                    id={`alt-${index}`}
                    placeholder="Describe the image"
                    onChange={(e) => handleAltTextChange(url, e.target.value)}
                    disabled={disabled}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {urls.length === 0 && uploadingFiles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}
