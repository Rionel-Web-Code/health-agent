'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export type FileType = 'csv' | 'json';
export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'validating' | 'complete' | 'error';

interface UploadedFileInfo {
  file: File;
  type: FileType;
  status: UploadStatus;
  progress: number;
  error?: string;
}

interface FileUploaderProps {
  accept?: string;
  maxSize?: number; // in bytes
  onFileSelect: (file: File, type: FileType) => void;
  onFileRemove?: () => void;
  isProcessing?: boolean;
  uploadStatus?: UploadStatus;
  className?: string;
}

export function FileUploader({
  accept = '.csv,.json',
  maxSize = 50 * 1024 * 1024, // 50MB default
  onFileSelect,
  onFileRemove,
  isProcessing = false,
  uploadStatus = 'idle',
  className,
}: FileUploaderProps) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): { valid: boolean; type?: FileType; error?: string } => {
    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: t('errors.fileSize') };
    }

    // Determine file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv') {
      return { valid: true, type: 'csv' };
    } else if (extension === 'json') {
      return { valid: true, type: 'json' };
    } else {
      return { valid: false, error: t('errors.fileType') };
    }
  };

  const handleFile = useCallback((file: File) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      setError(validation.error || t('errors.generic'));
      return;
    }

    setError(null);
    setSelectedFile({
      file,
      type: validation.type!,
      status: 'idle',
      progress: 0,
    });
    onFileSelect(file, validation.type!);
  }, [onFileSelect, maxSize, t]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    onFileRemove?.();
  }, [onFileRemove]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusMessage = (): string => {
    switch (uploadStatus) {
      case 'uploading':
        return t('data.upload.uploading');
      case 'processing':
        return t('data.upload.processing');
      case 'validating':
        return t('data.upload.validating');
      case 'complete':
        return t('data.upload.complete');
      case 'error':
        return t('data.upload.error');
      default:
        return '';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      {!selectedFile && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            error && 'border-destructive'
          )}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Upload className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{t('data.upload.dragDrop')}</p>
              <p className="text-sm text-muted-foreground">{t('data.upload.orClick')}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>{t('data.upload.supportedFormats')}</p>
              <p>{t('data.upload.maxSize')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected File */}
      {selectedFile && (
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">{selectedFile.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.file.size)} • {selectedFile.type.toUpperCase()}
                </p>
              </div>
            </div>
            {!isProcessing && uploadStatus === 'idle' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                className="shrink-0"
              >
                <X className="size-4" />
                <span className="sr-only">{t('common.delete')}</span>
              </Button>
            )}
            {uploadStatus === 'complete' && (
              <CheckCircle2 className="size-5 text-green-600 shrink-0" />
            )}
          </div>

          {/* Progress */}
          {isProcessing && uploadStatus !== 'complete' && uploadStatus !== 'error' && (
            <div className="mt-4 space-y-2">
              <Progress value={uploadStatus === 'validating' ? 75 : uploadStatus === 'processing' ? 50 : 25} />
              <p className="text-xs text-muted-foreground">{getStatusMessage()}</p>
            </div>
          )}

          {/* Status Message */}
          {uploadStatus === 'complete' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="size-4" />
              {t('data.upload.complete')}
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {t('data.upload.error')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
