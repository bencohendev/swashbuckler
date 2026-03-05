# New User Onboarding & User Preferences

**Status:** Active

## Summary

Extend the example campaign option (currently guest-only) to authenticated new users. After first login, show a dialog offering a blank workspace or the example pirate campaign. Also introduce a `user_preferences` table to persist onboarding state and tour completion server-side, with localStorage as a cache layer.

## User Flow

1. New user signs up via email or OAuth
2. Supabase auth trigger creates default space ("My Space") + Page type + Getting Started page
3. User lands on `/dashboard`
4. App detects first-time user (no `onboarding_completed_at` in preferences)
5. **New User Dialog** appears with two choices:
   - **Start blank** — keeps current state (My Space + Getting Started page)
   - **Explore an example world** — seeds the pirate campaign into a new "The Crimson Tide" space, switches to it
6. Choice is recorded in `user_preferences`, dialog never shows again
7. If example chosen, user lands on the Campaign Overview entry

## Database

### New table: `user_preferences`

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed_at TIMESTAMPTZ,
  completed_tours TEXT[] DEFAULT '{}',
  tours_skipped_all BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

- RLS: users can only read/write their own row
- Row created lazily on first preference write (not on signup)
- `onboarding_completed_at` — null means new user dialog hasn't been shown
- `completed_tours` — array of `TourId` strings (e.g. `['intro', 'dashboard']`)
- `tours_skipped_all` — if true, all tours are considered completed

### Auth trigger unchanged

The existing `handle_new_user_space()` trigger is not modified. The new user dialog runs client-side after the trigger has already created the default space.

## Implementation

### New Files

- `apps/web/src/features/onboarding/components/NewUserDialog.tsx` — choice dialog for authenticated new users
- `apps/web/supabase/migrations/033_user_preferences.sql` — migration for `user_preferences` table
- `apps/web/src/shared/lib/data/preferences.ts` — Supabase client for reading/writing preferences

### Modified Files

- `apps/web/src/shared/lib/data/SpaceProvider.tsx` — detect new authenticated user, show dialog, seed example if chosen
- `apps/web/src/features/onboarding/hooks/useTutorial.ts` — read/write tour completion from DB (authenticated) or localStorage (guest)
- `apps/web/src/shared/lib/data/types.ts` — add `UserPreferences` type and `PreferencesClient` interface
- `apps/web/src/shared/lib/data/supabase.ts` — implement Supabase preferences client
- `apps/web/src/features/onboarding/index.ts` — export new dialog

### Seeding Flow (Authenticated + Example)

1. Create a new space named "The Crimson Tide" with pirate flag icon
2. Seed the full example campaign into that space (types, entries, mentions)
3. Switch to the new space
4. Navigate to the Campaign Overview entry
5. The user's original "My Space" remains untouched

### Hybrid Persistence (Tour Completion)

- **Authenticated users:** Read from DB on load, write to DB on changes. Zustand store is the runtime cache.
- **Guest users:** Continue using localStorage only (no DB access).
- No migration of existing localStorage data — existing users may re-see tours.

## Out of Scope

- Multiple campaign themes (pirate only for now)
- Ability to re-seed the example campaign
- Migrating existing localStorage tour data to DB
