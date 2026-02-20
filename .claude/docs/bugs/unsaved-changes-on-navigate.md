# Unsaved changes lost when navigating away quickly

**Status**: Open
**Feature**: Editor
**Severity**: High — user data loss

## Description

Creating or editing an entry and clicking away quickly (e.g., navigating to another entry or sidebar item) can result in changes not being persisted. When the entry is re-opened, some edits are missing.

## Suspected cause

The auto-save likely fires on a debounce timer and does not flush before navigation. If the user navigates away before the debounce fires, pending changes are dropped.

## Desired behavior

- Users should never lose edits due to navigation timing
- Save indicator should clearly communicate when changes are persisted vs. pending
- Either:
  - **Option A**: Block/delay navigation until pending saves flush, or
  - **Option B**: Ensure saves happen reliably in the background (e.g., flush on unmount or beforeunload)

## Investigation needed

- Confirm the save mechanism (debounce timer, onBlur, etc.) and identify where it drops changes
- Check whether the editor's unmount lifecycle flushes pending saves
- Determine if collaborative mode (Yjs leader-election save) and solo mode share the same issue
- Review the save indicator — does it accurately reflect pending vs. saved state?

## Key files

- `src/features/editor/components/Editor.tsx` — editor + auto-save logic
- `src/features/objects/components/ObjectEditor.tsx` — save indicator UI
