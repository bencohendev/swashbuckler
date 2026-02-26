# Image Resize

**Status:** Active

## Summary

Allow users to resize images inline in the block editor. Currently images are inserted at their natural size with no way to adjust dimensions.

## Motivation

Images often need to be smaller or larger than their natural size to fit the context of the content. Without resize controls, users have no way to control layout.

## Scope

- Drag handles on selected images (corners and/or edges) for freeform resize
- Maintain aspect ratio by default (shift to unlock)
- Persist width in the image node's element data
- Min/max size constraints to prevent broken layouts
- Works for inline editor images (not cover images or avatars)
