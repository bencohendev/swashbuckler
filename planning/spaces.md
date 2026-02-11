# Spaces

**Status: Done**

## Overview

Multi-workspace support allowing users to organize content into separate spaces, each with its own objects, types, and templates.

## Decisions

| Area | Decision |
|------|----------|
| Scope | Objects (NOT NULL), object_types (nullable for built-ins), templates (NOT NULL) |
| Default space | Local: `00000000-0000-0000-0000-000000000099`; Supabase: created on user signup |
| Persistence | Current space stored in localStorage (`swashbuckler:currentSpaceId`) |
| UI | SpaceSwitcher dropdown in sidebar header |
| Sharing | Per-space sharing model |

## Database Schema

```sql
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- space_id FK added to:
-- objects (NOT NULL)
-- object_types (nullable for built-ins)
-- templates (NOT NULL)
```

## Implementation

- `src/features/sidebar/components/SpaceSwitcher.tsx` — space switching
- `src/features/sidebar/components/CreateSpaceDialog.tsx` — space creation
- `src/app/providers.tsx` — SpaceProvider wraps DataProvider, passes spaceId
- `useCurrentSpace()` / `useSpaces()` hooks
- Data clients accept optional `spaceId` to scope queries
- "Shared with you" section in sidebar for spaces shared by others

## Verification

- [x] Create new space
- [x] Switch between spaces
- [x] Objects scoped to current space
- [x] Types scoped to current space (built-ins shared)
- [x] Templates scoped to current space
- [x] Current space persisted across sessions
- [x] Shared spaces appear in sidebar
