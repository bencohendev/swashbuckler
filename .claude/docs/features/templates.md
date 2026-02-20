# Templates

**Status: Done**

## Overview

Template system with variable support. Templates are stored in a dedicated `templates` table (separated from objects). Template variables allow dynamic placeholders that resolve at creation time.

## Decisions

| Area | Decision |
|------|----------|
| Storage | Dedicated `templates` table (not `is_template` flag on objects) |
| Scope | Per-space (space_id NOT NULL) |
| Variables | Built-in (`{{date}}`, `{{time}}`, `{{datetime}}`, `{{user}}`, `{{space}}`) + custom |
| Variable node type | Inline void element (`template_variable`) in editor content |
| Property variables | `{{name}}` sentinel strings in property field values |
| Insertion UX | Slash command `/` in template mode |
| Template mode | Toggle button in ObjectEditor header |
| Custom variable naming | `window.prompt()` for v1 |
| Variable prompt | Dialog with text inputs for each custom variable |

## Implementation

### Core
- `src/features/templates/components/TemplateList.tsx` — template management UI
- `src/features/templates/components/TemplateSelector.tsx` — template selection when creating entries
- `src/features/templates/hooks/useTemplates.ts` — template CRUD + variable-aware creation
- `src/app/(main)/settings/templates/page.tsx` — templates settings page
- "Save as Template" action in ObjectEditor opens `SaveAsTemplateDialog` for naming
- `src/features/templates/components/SaveAsTemplateDialog.tsx` — modal with name input, duplicate validation, save/cancel

### Template Variables
- `src/features/templates/lib/variables.ts` — variable types, extraction, and resolution logic
- `src/features/templates/components/VariablePromptDialog.tsx` — dialog for custom variable input
- `src/features/editor/plugins/template-variable-plugin.ts` — Plate plugin (inline void element)
- `src/features/editor/components/elements/TemplateVariable.tsx` — amber chip rendering
- Template mode toggle in `ObjectEditor.tsx` (BracesIcon button in header)
- Variable items in slash menu when template mode is active (`SlashInput.tsx`)
- Variable-aware template creation flow in `Sidebar.tsx`

### Variable Types
- **Built-in**: `date`, `time`, `datetime`, `user`, `space` — auto-resolve at creation time
- **Custom**: user-defined names — prompt dialog appears when creating from template

### Resolution Flow
1. User selects template in sidebar
2. `getTemplateVariables()` extracts all variables from content + properties
3. If custom variables exist → `VariablePromptDialog` opens
4. `createFromTemplateWithVariables()` resolves all variables and creates object
5. Built-in variables resolve to current date/time/user/space
6. Custom variables resolve to user-provided values

## Verification

- [x] Save entry as template
- [x] Template appears in selector
- [x] Create from template copies content + properties
- [x] Delete template works
- [x] Template management in settings
- [x] Toggle template mode in ObjectEditor
- [x] Slash menu shows Variables category in template mode
- [x] Insert built-in variable as amber chip
- [x] Insert custom variable via prompt
- [x] Built-in variables resolve on template creation
- [x] Custom variables prompt dialog appears
- [x] Templates without variables work as before
- [x] Save as Template opens naming dialog
- [x] Duplicate name validation (case-insensitive)
- [x] Build passes
