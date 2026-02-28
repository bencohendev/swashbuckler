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
- `src/app/auth/callback/page.tsx` — PKCE code exchange + auth event routing
- Guest mode enabled by removing auth redirect; uses Dexie for storage

## Password Reset Flow

1. User clicks "Forgot password?" link on the login form
2. `/forgot-password` page renders `ForgotPasswordForm` — email input that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/auth/callback' })`
3. Success state shows "Check your email for a reset link"
4. User clicks the email link → lands on `/auth/callback?code=...`
5. Callback's `onAuthStateChange` detects `PASSWORD_RECOVERY` event → redirects to `/reset-password`
6. `/reset-password` page renders `ResetPasswordForm` — new password + confirm password with `PasswordStrengthMeter`
7. Validates: min 8 chars, passwords match (same rules as SignupForm)
8. Calls `supabase.auth.updateUser({ password })` → redirects to `/dashboard`

### Middleware

No middleware changes needed. `/forgot-password` and `/reset-password` don't match the existing `isAuthPage` check, so unauthenticated users can access `/forgot-password` and users with recovery sessions can access `/reset-password`.

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
- [x] Forgot password link on login page
- [x] Password reset email sent successfully
- [x] Recovery callback redirects to reset page
- [x] New password set and redirected to dashboard

## OAuth Provider Configuration

OAuth requires credentials in three places: the provider console, Supabase, and Supabase URL config.

### Key URLs

| Setting | Value |
|---|---|
| Supabase project URL | `https://nnhhflrdvrtcutibchfv.supabase.co` |
| Provider callback URL | `https://nnhhflrdvrtcutibchfv.supabase.co/auth/v1/callback` |
| App redirect URL (dev) | `http://localhost:3000/auth/callback` |
| App redirect URL (prod) | `https://<production-domain>/auth/callback` |

### GitHub OAuth

1. **GitHub** → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: app URL
   - Authorization callback URL: `https://nnhhflrdvrtcutibchfv.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Providers → GitHub → Enable, paste Client ID + Secret

### Google OAuth

1. **Google Cloud Console** → APIs & Services → Credentials
   - Configure OAuth consent screen (External, default email/profile scopes)
   - Create OAuth client ID (Web application)
   - Authorized JS origins: `http://localhost:3000` + production domain
   - Authorized redirect URI: `https://nnhhflrdvrtcutibchfv.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Providers → Google → Enable, paste Client ID + Secret

### Supabase URL Configuration

In **Supabase → Authentication → URL Configuration**:
- **Site URL:** production URL
- **Redirect URLs:** `http://localhost:3000/auth/callback` + production equivalent

### How the flow works

1. Client calls `supabase.auth.signInWithOAuth()` with `redirectTo: ${window.location.origin}/auth/callback`
2. Supabase redirects to the provider (GitHub/Google) for authorization
3. Provider redirects back to `https://nnhhflrdvrtcutibchfv.supabase.co/auth/v1/callback`
4. Supabase exchanges the code and redirects to the app's `/auth/callback` route with a `code` param
5. The app's route handler (`src/app/auth/callback/route.ts`) calls `exchangeCodeForSession(code)` and redirects to `/`

## Known Issues

- On account creation, app may show as guest mode — likely requires email confirmation before Supabase auth session is established
