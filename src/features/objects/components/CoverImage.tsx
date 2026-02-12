'use client'

import { useRef, useState, useCallback } from 'react'
import { ImageIcon, RefreshCwIcon, XIcon, LoaderIcon } from 'lucide-react'
import { useAuth } from '@/shared/lib/data'
import { uploadImage, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/shared/lib/supabase/upload'

interface CoverImageProps {
  coverImage: string | null
  onChange: (url: string | null) => Promise<void>
  readOnly?: boolean
}

export function CoverImage({ coverImage, onChange, readOnly = false }: CoverImageProps) {
  const { isGuest } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHover, setShowHover] = useState(false)

  const canUpload = !readOnly && !isGuest

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null)
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('File type not supported. Use JPEG, PNG, GIF, WebP, or SVG.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('File is too large. Maximum size is 3 MB.')
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadImage(file, 'covers')
      await onChange(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [onChange])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleRemove = useCallback(async () => {
    await onChange(null)
  }, [onChange])

  // No cover + not editable = render nothing
  if (!coverImage && !canUpload) return null

  // No cover + editable = show "Add cover" button
  if (!coverImage) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
        >
          {isUploading ? (
            <>
              <LoaderIcon className="size-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImageIcon className="size-3.5" />
              Add cover
            </>
          )}
        </button>
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    )
  }

  // Has cover image
  return (
    <div className="mb-4">
      <div
        className="group relative"
        onMouseEnter={() => setShowHover(true)}
        onMouseLeave={() => setShowHover(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt="Cover"
          className="h-48 w-full rounded-t-lg object-cover"
        />
        {canUpload && showHover && (
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
            >
              {isUploading ? (
                <LoaderIcon className="size-3 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-3" />
              )}
              Change cover
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
            >
              <XIcon className="size-3" />
              Remove
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
