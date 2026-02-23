# Fix Delete Types Not Working

## Context
Deleting a type from the settings page silently fails. The FK constraints on `objects.type_id` and `templates.type_id` default to RESTRICT, so Supabase blocks the delete. The hook swallows the error and the UI shows no feedback. User wants cascade delete behavior — deleting a type also deletes all its objects and templates.

## Changes

### 1. Migration `supabase/migrations/020_cascade_delete_types.sql`
Drop and re-add FK constraints with `ON DELETE CASCADE` for:
- `objects.type_id` → `object_types(id)`
- `templates.type_id` → `object_types(id)`

(`share_exclusions.excluded_type_id` already has CASCADE.)

### 2. `src/features/object-types/hooks/useObjectTypes.ts`
Change `remove()` to return error string or null so callers can react:
- Return type: `Promise<string | null>` (error message or null on success)
- On error, return `result.error.message`
- Update `UseObjectTypesReturn` interface

### 3. `src/features/object-types/components/ObjectTypeManager.tsx`
- Import `toast` from `@/shared/hooks/useToast`
- Update confirm dialog text: warn that all entries will be deleted
- Check `remove()` return — show destructive toast on error, no action on success (list auto-refreshes via query invalidation)

### 4. `src/features/sidebar/components/TypeSection.tsx`
- Update confirm dialog text to match (warns about deleting entries)
- The `onDelete` prop comes from Sidebar which calls `removeType` — Sidebar doesn't show toasts for this, keep it simple

### 5. `src/shared/lib/data/local.ts`
- In `objectTypes.delete()`: also delete associated objects and templates for Dexie parity with cascade behavior

### 6. Bug log
- Move "Delete types not working" to closed in `.claude/docs/bugs/log.md`

## Verification
- `npx tsc --noEmit`
- `npx vitest run`
- `npm run lint`
