# Image Resize

**Status:** Done

## Summary

Allow users to resize images inline in the block editor by dragging edge handles.

## Motivation

Images often need to be smaller or larger than their natural size to fit the context of the content. Without resize controls, users have no way to control layout.

## Scope

- Drag handles on left and right edges of images for horizontal resize
- Aspect ratio maintained automatically (images scale proportionally)
- Persist width in the image node's element data (`width` property)
- Min width: 50px, max width: container width
- Works for inline editor images (not cover images or avatars)
- Width indicator badge shown during drag
- Escape key cancels in-progress resize
- Handles hidden in read-only mode

## Implementation

- `useImageResize` hook (`src/features/editor/hooks/useImageResize.ts`) — pointer-based drag logic with preview width state
- `ResizeHandle` component — vertical pill handles on left/right edges, visible on hover
- Pointer capture used for reliable drag tracking (no window-level event listeners needed)
- Width committed to Slate node via `editor.tf.setNodes()` on pointer up, which triggers auto-save
