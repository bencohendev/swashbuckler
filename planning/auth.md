# Auth

**Status: Done**

## Overview

Email/password and OAuth authentication via Supabase Auth, with a guest mode fallback using local storage.

## Decisions

| Area | Decision |
|------|----------|
| Providers | Email/password + Google + GitHub OAuth |
| Guest mode | Unauthenticated users get local-only storage (Dexie) |
| Session | Supabase session with cookie-based persistence |
| Protected routes | Middleware redirects unauthenticated users for Supabase routes |

## Implementation

- `src/features/auth/components/` — LoginForm, SignupForm, OAuthButtons
- `src/app/(auth)/` — login and signup pages
- `src/app/auth/callback/route.ts` — OAuth callback handler
- Guest mode enabled by removing auth redirect; uses Dexie for storage

## Database

- `handle_new_user` trigger seeds default object types + default space on user creation
- SECURITY DEFINER functions use `SET search_path = public` and fully qualify table names

## Verification

- [x] Email signup creates user + default object types
- [x] Google OAuth login works
- [x] GitHub OAuth login works
- [x] Protected routes redirect to /login
- [x] Logout clears session
- [x] Guest mode works without authentication

## Known Issues

- On account creation, app may show as guest mode — likely requires email confirmation before Supabase auth session is established
