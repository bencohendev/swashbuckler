import { createClient } from './client'

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

export const MAX_IMAGE_SIZE = 3 * 1024 * 1024 // 3 MB

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  return map[mimeType] ?? 'bin'
}

export async function uploadImage(
  file: File,
  folder: 'images' | 'covers' | 'avatars'
): Promise<{ url: string; path: string }> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('File type not supported. Use JPEG, PNG, GIF, WebP, or SVG.')
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('File is too large. Maximum size is 3 MB.')
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in to upload images.')
  }

  const ext = getExtension(file.type)
  const filename = `${crypto.randomUUID()}.${ext}`
  const path = `${user.id}/${folder}/${filename}`

  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, file, { contentType: file.type })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(path)

  return { url: urlData.publicUrl, path }
}

export async function uploadImageFromDataUrl(
  dataUrl: string | ArrayBuffer
): Promise<string> {
  // For unauthenticated users, return the data URL as-is (graceful fallback)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return typeof dataUrl === 'string' ? dataUrl : ''
  }

  // Convert data URL string to File
  let blob: Blob
  if (typeof dataUrl === 'string') {
    const response = await fetch(dataUrl)
    blob = await response.blob()
  } else {
    blob = new Blob([dataUrl])
  }

  const file = new File([blob], 'pasted-image', { type: blob.type || 'image/png' })
  const result = await uploadImage(file, 'images')
  return result.url
}

export async function deleteImage(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('uploads')
    .remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}
