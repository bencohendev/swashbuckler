# Image Upload

**Status: Done**

## Overview

Image upload support across three surfaces: editor inline images, object cover images, and account avatars. All uploads go to a single Supabase Storage `uploads` bucket with per-user folder RLS.

## Architecture

- **Storage**: Single public `uploads` bucket, 3 MB limit, JPEG/PNG/GIF/WebP/SVG
- **Path convention**: `{user_id}/{folder}/{uuid}.{ext}` where folder is `images`, `covers`, or `avatars`
- **RLS**: INSERT/UPDATE/DELETE scoped to `foldername[1] = auth.uid()`, SELECT is public
- **Guest handling**: Uploads disabled, URL embed only (editor), no upload UI (covers/avatar)

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/016_storage.sql` | Storage bucket + RLS policies |
| `src/shared/lib/supabase/upload.ts` | `uploadImage()`, `uploadImageFromDataUrl()`, `deleteImage()` |
| `src/features/editor/lib/plate-config.ts` | `ImagePlugin.configure({ uploadImage })` for paste/drop |
| `src/features/editor/components/elements/Image.tsx` | Inline image element with upload UI |
| `src/features/objects/components/CoverImage.tsx` | Cover image banner with upload/change/remove |
| `src/features/objects/components/ObjectEditor.tsx` | CoverImage integration + "Add cover" menu item |
| `src/features/account/components/ProfileSection.tsx` | Avatar upload overlay |

## Surfaces

### Editor Inline Images
- Slash command `/image` inserts an empty image node → shows upload button + URL embed input
- Paste/drag-drop handled automatically by Plate's `ImagePlugin.uploadImage` callback
- Existing images show hover toolbar with Replace and Delete buttons
- Guest users see URL embed input only (no upload button)

### Object Cover Images
- `CoverImage` component renders above the title in `ObjectEditor`
- No cover + editable: "Add cover" button (also available in More dropdown)
- Has cover: full-width banner with hover overlay (Change cover / Remove)
- Uses `object.cover_image` field (already in schema)

### Account Avatar
- Avatar area in ProfileSection is clickable with camera icon overlay on hover
- Uploads to `avatars` folder, updates `auth.user.user_metadata.avatar_url`
- Loading spinner shown during upload

## Validation

- Client-side type and size validation before upload
- Bucket-level enforcement via `file_size_limit` and `allowed_mime_types`
- Error messages displayed inline (`text-sm text-destructive`)
