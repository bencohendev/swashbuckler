# Edit Template Content

**Status:** Not started

## Summary

Allow users to edit the full content of an existing template — not just its name. Currently templates can only be renamed or deleted from the type settings panel. This feature opens the template in the editor for content and variable changes.

## Motivation

Templates are created by saving an entry's content, but once saved there's no way to refine them without deleting and re-creating. Users need to iterate on templates as their workflows evolve.

## Scope

- Open a template in the block editor for editing (content, variables, structure)
- Accessible from the template section in type settings
- Save changes back to the existing template record
- Keep rename and delete as separate quick actions alongside the new "Edit" action
- Works in both Supabase and Dexie modes
