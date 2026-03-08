# Account Settings

**Status:** Done

## Overview

Full account management page at `/settings/account` with sections for profile, password, connected OAuth accounts, preferences, data export, and account deletion.

## Location

- Route: `/settings/account` (under existing settings hub)
- Feature directory: `src/features/account/`
- API route: `src/app/api/account/delete/route.ts`

## Sections

### Profile
- Display name (editable, saved to `user_metadata` via `supabase.auth.updateUser`)
- Email (read-only)
- Avatar display from OAuth `avatar_url` with initials fallback

### Password
- Only shown for users with `email` identity provider
- Verifies current password via `signInWithPassword` before updating
- OAuth-only users see a message directing to password reset

### Connected Accounts
- Shows Google and GitHub with connection status from `user.identities`
- Connect via `supabase.auth.linkIdentity({ provider })`
- Disconnect via `supabase.auth.unlinkIdentity(identity)`
- Prevents unlinking last remaining identity

### Preferences
- Theme selector (Light/Dark/System) using `next-themes`
- Default space selector (saved to `user_metadata`)

### Data Export
- Downloads all user data as JSON via `useAccountExport` hook
- Fetches all spaces, then objects/types/templates/relations/tags per space
- Triggers browser download via `URL.createObjectURL`

### Account Deletion
- Danger zone with red border
- Confirmation dialog requiring email input
- `POST /api/account/delete` uses Supabase service role key for `auth.admin.deleteUser`
- Signs out and redirects to `/login` on success

## Guest Guard

Guest users see "not available in guest mode" message, same pattern as sharing page.

## Integration Points

- Settings hub (`/settings`): Account card added as first item
- Header dropdown: "Account settings" link added before "Sign out" for authenticated users
- OAuth icons: `GoogleIcon` and `GithubIcon` exported from `OAuthButtons.tsx`

## Environment

Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for account deletion API route.
