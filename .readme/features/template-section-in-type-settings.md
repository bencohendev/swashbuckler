# Template Section in Type Settings

**Status:** Not started

## Summary

Add an inline template management section to the type edit form in Settings > Types. Users can rename and delete templates for a type directly while editing it, without navigating to the separate Templates settings page.

## Scope

- Template list appears in the edit form only (not the create form)
- Each template shows its name with inline rename (click to edit) and a delete button
- Inline rename: input field on click, save on Enter/blur, cancel on Escape
- Delete uses `ConfirmDialog` before deleting
- Toast feedback on rename and delete
- Empty state: "No templates" message
- Loading skeleton while fetching

## Key Files

| File | Role |
|------|------|
| `src/features/object-types/components/TemplateSection.tsx` | Inline template list component (new) |
| `src/features/object-types/components/ObjectTypeForm.tsx` | Render `TemplateSection` when editing |
| `src/features/templates/hooks/useTemplates.ts` | Add `renameTemplate` method |
| `src/features/object-types/index.ts` | Export new component |
