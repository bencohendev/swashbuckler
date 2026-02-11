# Sharing

**Status: Done**

## Overview

Per-space sharing with view/edit permissions and granular exclusions at three levels: object types, specific objects, and fields per type.

## Decisions

| Area | Decision |
|------|----------|
| Scope | Per-space (not per-workspace) |
| Permissions | View / Edit |
| Exclusion levels | Object types, object instances, and fields (per type) |
| Hidden content | Excluded content completely invisible to viewers |
| Mention visibility | Mentions of excluded objects hidden |

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
  space_share_id UUID NOT NULL REFERENCES space_shares(id) ON DELETE CASCADE,
  excluded_type_id UUID REFERENCES object_types(id),
  excluded_object_id UUID REFERENCES objects(id),
  excluded_field_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Implementation

- `src/features/sharing/components/ShareSpaceDialog.tsx` — share UI
- `src/features/sharing/components/ExclusionManager.tsx` — expandable type sections with nested checkboxes
- `src/features/sharing/hooks/useSpaceShares.ts` — share management
- `src/features/sharing/hooks/useSpacePermission.ts` — permission checking
- `src/features/sharing/hooks/useExclusionFilter.ts` — exclusion filtering for sidebar/editor
- Exclusions enforced in sidebar and editor for shared users

## Verification

- [x] Share space with email
- [x] Recipient sees shared space
- [x] View permission: can read, cannot edit
- [x] Edit permission: can edit
- [x] Exclude type: all objects of type hidden
- [x] Exclude object: specific object hidden
- [x] Exclude field: field doesn't appear on shared objects
- [ ] Mentions to excluded objects are invisible
