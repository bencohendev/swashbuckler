# Edit Template Content

**Status:** Done

## Summary

Allow users to edit the full content of an existing template — not just its name. Opens the template in the block editor for content, variable, property, icon, and cover image changes.

## Motivation

Templates are created by saving an entry's content, but once saved there's no way to refine them without deleting and re-creating. Users need to iterate on templates as their workflows evolve.

## Scope

- Open a template in the block editor for editing (content, variables, structure)
- Accessible from both the template section in type settings and the Settings > Templates page
- Save changes back to the existing template record
- Keep rename and delete as separate quick actions alongside the new "Edit" action
- Works in both Supabase and Dexie modes

## Key Files

| File | Role |
|------|------|
| `src/features/templates/components/TemplateEditor.tsx` | Full editor component (title, content, properties, icon, cover) |
| `src/app/(main)/templates/[id]/page.tsx` | Dynamic route for editing a template |
| `src/features/templates/hooks/useTemplate.ts` | Single template fetch + `update()` function |
| `src/features/templates/components/TemplateList.tsx` | Settings page list with edit dropdown |
| `src/features/object-types/components/TemplateSection.tsx` | Inline edit button in type settings |

## Implementation Details

- **Route**: `/templates/[id]` opens the `TemplateEditor` component
- **Two entry points**: Edit button in Settings > Templates dropdown and Edit button in type settings template section
- **Template mode**: Automatically enabled in the editor, allowing variable insertion via slash commands
- **Dirty tracking**: Monitors changes to title, properties, and editor content with status indicator
- **Unsaved changes warning**: Prevents tab close with `beforeunload` when dirty
- **Update payload**: Supports `name`, `content`, `properties`, `icon`, and `cover_image`
