# Quick Capture

**Status:** Done

## Overview

Floating button and keyboard shortcut for quickly creating a new entry without navigating away from the current view. User picks a type from a dialog, and the new entry opens in the editor modal.

## Decisions

| Area | Decision |
|------|----------|
| Trigger | Floating button + header button + hotkey (⌘E) |
| Flow | Pick type → create entry → open in modal |
| Dialog style | Modeled after GlobalSearchDialog with keyboard navigation |

## Implementation

- [x] `QuickCaptureDialog` — type-picker dialog with arrow key navigation and click support
- [x] `QuickCaptureButton` — floating action button (bottom-right corner)
- [x] Keyboard shortcut (⌘E) in Header
- [x] Header button with ⌘E hint
- [x] Barrel export in `src/features/quick-capture/index.ts`

## Files

| File | Role |
|------|------|
| `src/features/quick-capture/components/QuickCaptureDialog.tsx` | Type-picker dialog |
| `src/features/quick-capture/components/QuickCaptureButton.tsx` | Floating action button |
| `src/features/quick-capture/index.ts` | Barrel exports |
| `src/shared/components/layout/Header.tsx` | Integration point (shortcut + buttons) |
