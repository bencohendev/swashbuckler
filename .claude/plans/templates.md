# Templates

**Status: Done**

## Overview

Simple template system — no variables, no bundles. Templates are stored in a dedicated `templates` table (separated from objects).

## Decisions

| Area | Decision |
|------|----------|
| Storage | Dedicated `templates` table (not `is_template` flag on objects) |
| Scope | Per-space (space_id NOT NULL) |
| Complexity | Simple — no variables, no bundles |
| Variables | Deferred to post-MVP |
| Bundles | Deferred to post-MVP |

## Implementation

- `src/features/templates/components/TemplateList.tsx` — template management UI
- `src/features/templates/components/TemplateSelector.tsx` — template selection when creating entries
- `src/features/templates/hooks/useTemplates.ts` — template CRUD
- `src/app/(main)/settings/templates/page.tsx` — templates settings page
- "Save as Template" action in ObjectEditor

## Verification

- [x] Save entry as template
- [x] Template appears in selector
- [x] Create from template copies content + properties
- [x] Delete template works
- [x] Template management in settings
