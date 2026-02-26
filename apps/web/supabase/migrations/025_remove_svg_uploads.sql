-- Security audit: remove SVG from allowed MIME types.
-- SVG files can contain embedded scripts and event handlers.
-- While currently served safely via <img> from CDN, this eliminates
-- a latent XSS surface if rendering or hosting changes.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'uploads';
