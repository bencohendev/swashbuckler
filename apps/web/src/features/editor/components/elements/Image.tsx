'use client';

import { useRef, useState, useCallback } from 'react';
import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement, useEditorRef, useReadOnly } from '@udecode/plate/react';
import { ImageIcon, LinkIcon, RefreshCwIcon, Trash2Icon, LoaderIcon } from 'lucide-react';
import { useAuth } from '@/shared/lib/data';
import { uploadImage, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/shared/lib/supabase/upload';
import { useImageResize } from '../../hooks/useImageResize';

function getImageProps(element: Record<string, unknown>) {
  return {
    url: typeof element.url === 'string' ? element.url : undefined,
    alt: typeof element.alt === 'string' ? element.alt : undefined,
    width: typeof element.width === 'number' ? element.width : undefined,
  };
}

function ResizeHandle({
  side,
  onPointerDown,
}: {
  side: 'left' | 'right';
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize image from ${side}`}
      tabIndex={-1}
      onPointerDown={onPointerDown}
      className={`absolute top-0 ${side === 'left' ? 'left-0' : 'right-0'} z-10 flex h-full w-4 cursor-col-resize items-center ${side === 'left' ? 'justify-start pl-1' : 'justify-end pr-1'}`}
    >
      <div className="h-12 max-h-[50%] w-1.5 rounded-full bg-primary/80 opacity-0 shadow-sm transition-opacity group-hover:opacity-100" />
    </div>
  );
}

export function ImageElement({ element, children, ...props }: PlateElementProps) {
  const { url, alt, width } = getImageProps(element);
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const { isGuest } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [showHover, setShowHover] = useState(false);

  const handleResize = useCallback(
    (newWidth: number) => {
      const path = editor.api.findPath(element);
      if (path) {
        editor.tf.setNodes({ width: newWidth }, { at: path });
      }
    },
    [editor, element],
  );

  const { imgRef, isResizing, displayWidth, handlePointerDown, handlePointerMove, handlePointerUp } =
    useImageResize({
      width,
      onResize: handleResize,
      disabled: readOnly,
    });

  const setNodeUrl = useCallback((newUrl: string) => {
    const path = editor.api.findPath(element);
    if (path) {
      editor.tf.setNodes({ url: newUrl }, { at: path });
    }
  }, [editor, element]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('File type not supported. Use JPEG, PNG, GIF, or WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('File is too large. Maximum size is 3 MB.');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImage(file, 'images');
      setNodeUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [setNodeUrl]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleEmbed = useCallback(() => {
    const trimmed = embedUrl.trim();
    if (trimmed) {
      setNodeUrl(trimmed);
      setEmbedUrl('');
    }
  }, [embedUrl, setNodeUrl]);

  const handleEmbedKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEmbed();
    }
  }, [handleEmbed]);

  const handleDelete = useCallback(() => {
    const path = editor.api.findPath(element);
    if (path) {
      editor.tf.removeNodes({ at: path });
    }
  }, [editor, element]);

  const handleReplace = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <PlateElement {...props} element={element} className="my-4">
      <div contentEditable={false}>
        {url ? (
          <div
            className="group relative inline-block"
            data-image-container=""
            onMouseEnter={() => setShowHover(true)}
            onMouseLeave={() => {
              if (!isResizing) setShowHover(false);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={url}
              alt={alt || ''}
              style={{
                width: displayWidth ? `${displayWidth}px` : 'auto',
                maxWidth: '100%',
              }}
              className={`rounded-lg ${isResizing ? 'select-none' : ''}`}
              draggable={false}
            />
            {!readOnly && (showHover || isResizing) && (
              <>
                <ResizeHandle
                  side="left"
                  onPointerDown={(e) => handlePointerDown(e, 'left')}
                />
                <ResizeHandle
                  side="right"
                  onPointerDown={(e) => handlePointerDown(e, 'right')}
                />
              </>
            )}
            {isResizing && displayWidth != null && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-foreground/80 px-2 py-0.5 text-xs font-medium text-background tabular-nums">
                {displayWidth}px
              </div>
            )}
            {!readOnly && showHover && !isResizing && (
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  onClick={handleReplace}
                  className="rounded-md bg-background/80 p-1.5 text-sm text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
                  title="Replace image"
                >
                  <RefreshCwIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md bg-background/80 p-1.5 text-sm text-destructive shadow-sm backdrop-blur-sm hover:bg-background"
                  title="Delete image"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : isUploading ? (
          <div className="flex h-32 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
            <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </div>
        ) : readOnly ? (
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
            <span className="text-sm text-muted-foreground">Image placeholder</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6">
            {!isGuest && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <ImageIcon className="size-4" />
                  Upload image
                </button>
                <span className="text-xs text-muted-foreground">or</span>
              </>
            )}
            <div className="flex w-full max-w-sm gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  onKeyDown={handleEmbedKeyDown}
                  placeholder="Paste image URL..."
                  className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                type="button"
                onClick={handleEmbed}
                disabled={!embedUrl.trim()}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Embed
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>
      {children}
    </PlateElement>
  );
}
