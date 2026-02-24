# Template Section in Type Settings

**Status:** Done

## Summary

Inline template management section in the type edit form (Settings > Types). Users can rename and delete templates for a type directly while editing it, without navigating to the separate Templates settings page.

## Scope

- Template list appears in the edit form only (not the create form)
- Each template shows its name with inline rename (click to edit, Enter/blur to save, Escape to cancel)
- Delete button per row with confirmation dialog
- Toast feedback on rename and delete
- Empty state: "No templates for this type."
- Loading skeleton while fetching

## Key Files

| File | Role |
|------|------|
| `src/features/object-types/components/TemplateSection.tsx` | Inline template list component |
| `src/features/object-types/components/ObjectTypeForm.tsx` | Renders `TemplateSection` when editing |
| `src/features/templates/hooks/useTemplates.ts` | Added `renameTemplate` method |
| `src/features/object-types/components/index.ts` | Barrel export |
| `src/features/object-types/index.ts` | Feature barrel export |
