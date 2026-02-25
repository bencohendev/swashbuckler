# Create from Template (Quick Capture)

**Status:** Done

## Overview

Adds template selection to the quick capture dialog (Cmd+E / FAB). Types with templates show a chevron indicator; selecting them drills into a sub-view listing "Blank" + available templates. Types without templates behave as before (instant blank creation).

## Design

Two-level drill-down navigation inside `QuickCaptureDialog`:

**Level 1 (default):** Flat list of types + "New Type". Types with templates show a `ChevronRightIcon`.

**Level 2 (after selecting a type with templates):** Back button + type name header, "Blank {TypeName}" option, then each template by name. Escape/Backspace returns to level 1.

Variable templates close the dialog and open `VariablePromptDialog` (same sequential pattern as Sidebar).

## Keyboard Navigation

| Key | Level 1 | Level 2 |
|-----|---------|---------|
| Arrow Up/Down | Cycle types | Cycle blank + templates |
| Enter | Select type (drill if has templates) | Create blank or from template |
| Escape | Close dialog | Return to level 1 |
| Backspace | — | Return to level 1 |

## Files

| File | Role |
|------|------|
| `src/features/quick-capture/components/QuickCaptureDialog.tsx` | All changes — template hooks, two-level UI, variable dialog |
