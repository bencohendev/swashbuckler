# Auth

**Status:** Done

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

- `src/features/auth/components/` — LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm, OAuthButtons
- `src/app/(auth)/` — login, signup, forgot-password, and reset-password pages
- `src/app/auth/callback/route.ts` — server-side Route Handler for GitHub OAuth, email confirmation, and password reset (PKCE code exchange)
- `src/app/auth/google/callback/route.ts` — server-side Route Handler for direct Google OAuth (code exchange with Google + `signInWithIdToken`)
- `src/shared/lib/supabase/middleware.ts` — session refresh, auth page redirects, protected route guard
- `src/shared/hooks/useSessionGuard.ts` — client-side session expiry detection (query + mutation cache)
- Guest mode enabled by guest cookie; uses Dexie for storage

## Password Reset Flow

1. User clicks "Forgot password?" link on the login form
2. `/forgot-password` page renders `ForgotPasswordForm` — email input that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/auth/callback?next=/reset-password' })`
3. Success state shows "Check your email for a reset link"
4. User clicks the email link → lands on `/auth/callback?code=...&next=/reset-password`
5. Server-side Route Handler exchanges PKCE code for session → redirects to `/reset-password`
6. `ResetPasswordForm` verifies session on mount via `supabase.auth.getUser()`:
   - **Loading** — shows "Verifying your reset link..." placeholder
   - **No session** — shows "Invalid or expired link" card with link to `/forgot-password`
   - **Valid session** — renders password form
7. Validates: min 8 chars, passwords match (same rules as SignupForm)
8. Calls `supabase.auth.updateUser({ password })` → redirects to `/dashboard`
9. If code exchange fails, callback redirects to `/forgot-password?error=link_expired`

## Middleware

`src/shared/lib/supabase/middleware.ts` handles three routing concerns:

1. **Root redirect** — `/` → `/dashboard` (authenticated or guest) or `/landing` (new visitor)
2. **Auth page redirect** — Authenticated users visiting `/login`, `/signup`, `/forgot-password`, or `/auth/*` (except `/auth/callback`) are redirected to `/dashboard`
3. **Protected route guard** — Unauthenticated users without a guest cookie visiting `/dashboard`, `/settings`, `/objects`, `/trash`, `/archive`, `/graph`, `/types`, `/tags`, or `/templates` are redirected to `/login`

Note: `/reset-password` is not in the auth page check — users arrive there with a recovery session established by the callback route.

## Database

- `handle_new_user` trigger seeds default object types + default space on user creation
- SECURITY DEFINER functions use `SET search_path = public` and fully qualify table names

## Error Handling

All auth forms wrap Supabase calls in try/catch and display network errors with `role="alert"` for screen readers.

### Callback route error handling

The general auth callback route (`src/app/auth/callback/route.ts`) handles GitHub OAuth, email confirmation, and password reset failures:

| Scenario | Redirect |
|----------|----------|
| OAuth error params (user denied consent) | `/login?error=oauth_denied` |
| OAuth error during account linking | `/settings/account?error=link_failed` |
| Missing Supabase env vars | `/login?error=oauth_error` (with console.error) |
| Code exchange failure (password reset) | `/forgot-password?error=link_expired` |
| Code exchange failure (account linking) | `/settings/account?error=link_failed` |
| Code exchange failure (general) | `/login?error=link_expired` |

The Google OAuth callback route (`src/app/auth/google/callback/route.ts`) handles direct Google OAuth failures:

| Scenario | Redirect |
|----------|----------|
| Google denied consent | `/login?error=oauth_denied` |
| CSRF state mismatch | `/login?error=oauth_error` |
| Missing env vars (Client ID, Secret, Supabase) | `/login?error=oauth_error` |
| Google token exchange failure | `/login?error=oauth_error` |
| `signInWithIdToken` failure | `/login?error=oauth_error` |

### Login page error display

`LoginForm` reads URL params on mount to display contextual messages:

| Param | Message |
|-------|---------|
| `expired=true` | "Your session has expired. Please sign in again." |
| `error=link_expired` | "That link has expired. Please try again." |
| `error=oauth_denied` | "Sign-in was cancelled. Please try again." |
| `error=oauth_error` | "Something went wrong during sign-in. Please try again." |

Also parses OAuth error fragments from `window.location.hash` (fallback for some OAuth error flows).

### Sign-out hardening

Sign-out (`Header.tsx`) wraps `signOut()` in try/catch and always:
1. Clears the guest cookie
2. Clears the TanStack Query cache (`queryClient.clear()`)
3. Redirects to `/login`

### Session expiry detection

`useSessionGuard` subscribes to both TanStack Query cache and mutation cache for auth errors, redirecting to `/login?expired=true` on detection.

### Signup resend

`SignupForm` provides a "Resend confirmation email" button in the confirmation-sent state, calling `supabase.auth.resend({ type: 'signup', email })`.

### Connected accounts

`ConnectedAccountsSection` reads `?error=link_failed` from URL params, wraps link/unlink in try/catch, and calls `router.refresh()` after successful unlink to update displayed identities.

## Guest Banner

Guest mode banner text: "Your data is stored only on this device and is not backed up."

## Verification

- [x] Email signup creates user + default object types
- [x] Google OAuth login works
- [x] GitHub OAuth login works
- [x] Protected routes redirect to /login (unauthenticated, no guest cookie)
- [x] Logout clears session, guest cookie, and query cache
- [x] Guest mode works without authentication
- [x] Forgot password link on login page
- [x] Password reset email sent successfully
- [x] Recovery callback redirects to reset page
- [x] New password set and redirected to dashboard
- [x] Visiting /reset-password without session shows "invalid or expired link"
- [x] Expired reset link redirects to /forgot-password with error message
- [x] Denied OAuth consent shows message on /login
- [x] Network failures show "unable to connect" on all auth forms
- [x] Session expiry redirects to /login with expired message
- [x] Authenticated users redirected away from /forgot-password

## OAuth Provider Configuration

OAuth requires credentials in three places: the provider console, Supabase, and Supabase URL config.

### Key URLs

| Setting | Value |
|---|---|
| Supabase project URL | `https://nnhhflrdvrtcutibchfv.supabase.co` |
| GitHub provider callback URL | `https://nnhhflrdvrtcutibchfv.supabase.co/auth/v1/callback` |
| GitHub app redirect URL (dev) | `http://localhost:3000/auth/callback` |
| GitHub app redirect URL (prod) | `https://<production-domain>/auth/callback` |
| Google redirect URI (dev) | `http://localhost:3000/auth/google/callback` |
| Google redirect URI (prod) | `https://<production-domain>/auth/google/callback` |

### GitHub OAuth

1. **GitHub** → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: app URL
   - Authorization callback URL: `https://nnhhflrdvrtcutibchfv.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Providers → GitHub → Enable, paste Client ID + Secret

### Google OAuth (Direct Flow)

Google OAuth uses a **direct flow** — the app redirects to Google directly instead of going through Supabase's OAuth proxy. This makes the Google consent screen show the app name instead of the Supabase subdomain.

1. **Google Cloud Console** → APIs & Services → Credentials
   - Configure OAuth consent screen (External, default email/profile scopes)
   - Create OAuth client ID (Web application)
   - Authorized JS origins: `http://localhost:3000` + production domain
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback` + `https://<production-domain>/auth/google/callback`
2. **Supabase** → Authentication → Providers → Google → Enable, paste the **same** Client ID + Secret (must match so `signInWithIdToken` accepts the token audience)
3. **Environment variables** — `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`

### Supabase URL Configuration

In **Supabase → Authentication → URL Configuration**:
- **Site URL:** production URL
- **Redirect URLs:** `http://localhost:3000/auth/callback` + production equivalent

### How the flows work

#### Google (direct flow)

1. Client builds Google OAuth URL with `client_id`, `redirect_uri`, `state` (CSRF token stored in cookie), and `scope=openid email profile`
2. Browser redirects to `accounts.google.com` — consent screen shows the app name
3. Google redirects back to `/auth/google/callback?code=...&state=...`
4. Server-side Route Handler verifies CSRF state, exchanges code with Google's token endpoint for an `id_token`
5. Calls `supabase.auth.signInWithIdToken({ provider: 'google', token: id_token })` to create the Supabase session
6. Redirects to `/dashboard` on success, `/login?error=...` on failure

#### GitHub (Supabase-proxied flow)

1. Client calls `supabase.auth.signInWithOAuth({ provider: 'github' })` with `redirectTo: ${window.location.origin}/auth/callback`
2. Supabase redirects to GitHub for authorization
3. GitHub redirects back to `https://nnhhflrdvrtcutibchfv.supabase.co/auth/v1/callback`
4. Supabase exchanges the code and redirects to the app's `/auth/callback` route with a `code` param
5. The app's server-side Route Handler calls `exchangeCodeForSession(code)` and redirects to `/dashboard`
6. On failure (denied consent, expired code, missing env vars), redirects to `/login` with an error code — see Error Handling section

## Known Issues

- On account creation, app may show as guest mode — likely requires email confirmation before Supabase auth session is established
