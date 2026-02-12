# Sharing

**Status: Done**

## Overview

Per-space sharing with view/edit permissions and granular exclusions at three levels: types, specific entries, and fields per type. Exclusions can be set per-user or space-wide (applying to all shared users at once).

## Decisions

| Area | Decision |
|------|----------|
| Scope | Per-space (not per-workspace) |
| Permissions | View / Edit |
| Exclusion levels | Types, specific entries, and fields (per type) |
| Exclusion scopes | Per-user (via `space_share_id`) or space-wide (via `space_id`) |
| Hidden content | Excluded content completely invisible to viewers |
| Mention visibility | Mentions of excluded entries hidden |
| Owner immunity | Owner is never affected by any exclusions |

## Database Schema

```sql
CREATE TABLE space_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  shared_with_id UUID NOT NULL REFERENCES auth.users(id),
  permission TEXT NOT NULL DEFAULT 'view', -- 'view' or 'edit'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, shared_with_id)
);

CREATE TABLE share_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_share_id UUID REFERENCES space_shares(id) ON DELETE CASCADE,  -- per-user scope
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,              -- space-wide scope
  excluded_type_id UUID REFERENCES object_types(id),
  excluded_object_id UUID REFERENCES objects(id),
  excluded_field TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Exactly one scope must be set
  CONSTRAINT share_exclusions_scope_check CHECK (
    (space_share_id IS NOT NULL AND space_id IS NULL) OR
    (space_share_id IS NULL AND space_id IS NOT NULL)
  ),
  -- Exactly one exclusion kind
  CONSTRAINT share_exclusions_kind_check CHECK (
    (excluded_type_id IS NOT NULL AND excluded_object_id IS NULL AND excluded_field IS NULL) OR
    (excluded_type_id IS NULL AND excluded_object_id IS NOT NULL AND excluded_field IS NULL) OR
    (excluded_type_id IS NOT NULL AND excluded_object_id IS NULL AND excluded_field IS NOT NULL)
  )
);
```

## Implementation

- `src/app/(main)/settings/sharing/page.tsx` — sharing settings page with space-wide exclusions section above per-user shares list
- `src/features/sharing/components/ShareSpaceDialog.tsx` — share dialog with invite form, per-user exclusions, and footer link to `/settings/sharing`
- `src/features/sharing/components/ExclusionManager.tsx` — expandable type sections with nested checkboxes (reused for both per-user and space-wide exclusions)
- `src/features/sharing/hooks/useSpaceShares.ts` — share management, including `loadSpaceExclusions` and `addSpaceExclusion`
- `src/features/sharing/hooks/useSpacePermission.ts` — permission checking
- `src/features/sharing/hooks/useExclusionFilter.ts` — exclusion filtering for sidebar/editor; merges both per-user and space-wide exclusions
- `supabase/migrations/015_space_wide_exclusions.sql` — adds `space_id` column, updates `is_object_excluded()` and RLS policies
- Exclusions enforced in sidebar and editor for shared users

## Verification

- [x] Share space with email
- [x] Recipient sees shared space
- [x] View permission: can read, cannot edit
- [x] Edit permission: can edit
- [x] Exclude type: all entries of type hidden
- [x] Exclude entry: specific entry hidden
- [x] Exclude field: field doesn't appear on shared entries
- [ ] Mentions to excluded entries are invisible
- [ ] Space-wide exclusions section visible on settings page when shares exist
- [ ] Space-wide type exclusion hides entries from all shared users
- [ ] Per-user exclusions still work independently alongside space-wide ones
- [ ] Owner is never affected by exclusions
