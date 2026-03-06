# HttpOnly OAuth State Cookies

**Status:** Not started

## Overview

Move OAuth CSRF state/PKCE cookie management from client-side JavaScript to server-side route handlers, making all OAuth state cookies `HttpOnly`. This eliminates XSS as an attack vector against the OAuth flow — even if an attacker achieves script execution, they cannot read or forge the state cookies.

## Problem

The Google OAuth flow in `OAuthButtons.tsx` generates a CSRF state token client-side and stores it in a JavaScript-accessible cookie (`document.cookie`). While the cookie provides CSRF protection under normal conditions (an attacker on a different origin can't read it), an XSS vulnerability in the app would allow an attacker to:

1. Read the `google_oauth_state` cookie
2. Initiate a crafted OAuth flow with a known state value
3. Complete a session fixation or account linking attack

The GitHub flow uses Supabase's `signInWithOAuth`, which manages its own PKCE `code_verifier` cookie from the browser — also not `HttpOnly`.

Account linking (`ConnectedAccountsSection.tsx`) uses Supabase's `linkIdentity`, which has the same client-side cookie limitation.

## Phased approach

This work is split into phases so that the highest-value hardening ships first without requiring changes to every auth flow at once.

### Phase 1 — Google login (standalone, can ship independently)

Move Google OAuth login to a server-side POST route with HttpOnly state cookie. No changes to GitHub or account linking flows.

### Phase 2 — GitHub login

Move GitHub OAuth login to a server-side POST route with HttpOnly PKCE cookie via `@supabase/ssr`.

### Phase 3 — Account linking

Move both Google and GitHub account linking to server-side POST routes. Google linking must go through Supabase's OAuth proxy (see design constraint below).

## Design constraints

### Google link flow must use Supabase's OAuth proxy

Supabase has no `linkWithIdToken` API. The direct Google flow (exchange code for `id_token`, call `signInWithIdToken`) only works for **login/signup** — it creates or authenticates a user, it does not link an identity to an existing account.

Account linking requires `supabase.auth.linkIdentity({ provider: 'google' })`, which routes through Supabase's OAuth proxy (`nnhhflrdvrtcutibchfv.supabase.co/auth/v1/callback`). This means:

- Google **login** uses the direct flow (consent screen shows app name)
- Google **link** uses Supabase's proxy (consent screen shows Supabase subdomain — acceptable since the user is already signed in and understands they're linking an account)

Both can still use server-side route handlers with HttpOnly cookies — the difference is which OAuth URL the handler redirects to and how the callback processes the result.

### Middleware must be updated

The current middleware (`middleware.ts:62-73`) redirects authenticated users away from all `/auth/*` paths except exactly `/auth/callback`. This causes three problems:

1. **`/auth/google/callback`** — already broken for any flow where the user is authenticated (not currently hit, but would break linking)
2. **`/auth/*/start` routes** — would redirect authenticated users to `/dashboard` instead of initiating OAuth (breaks "switch account" scenarios)
3. **`/auth/*/link` routes** — would redirect authenticated users to `/dashboard` (linking requires authentication)

**Fix:** Replace the single `/auth/callback` exception with a broader exclusion. All `/auth/*` route handlers should be excluded from the redirect — they handle their own auth requirements. Suggested approach:

```ts
// Replace: pathname !== "/auth/callback"
// With: exclude all /auth/ route handlers
const isAuthPage = (pathname.startsWith("/login") ||
  pathname.startsWith("/signup") ||
  pathname.startsWith("/forgot-password"))
```

This removes `/auth/*` from the auth page redirect entirely. The `/auth/*` routes are all server-side route handlers that manage their own redirects on error — they don't need middleware protection.

### Start/link routes must be POST, not GET

OAuth initiation routes set cookies and redirect — they are state-changing. Using GET would allow an attacker to trigger OAuth flows via `<img>`, `<a>`, or other navigation vectors (login CSRF). POST requires a form submission or fetch, blocking passive attacks.

Client components will use a hidden form submission:
```tsx
<form method="POST" action="/auth/google/start">
  <Button type="submit">Continue with Google</Button>
</form>
```

Or programmatic submission via `fetch` + redirect from the response. Form submission is simpler and works without JavaScript (progressive enhancement).

## Implementation

### Phase 1: Google login

#### New: `/auth/google/start/route.ts`

```
POST /auth/google/start
  1. Generate 32-byte random state via crypto.getRandomValues()
  2. Set cookie: google_oauth_state=<state>
     - HttpOnly; SameSite=Lax; Path=/; Max-Age=600
     - Secure only in production (omit for localhost)
  3. Build Google OAuth URL (same params as current client code)
  4. Return NextResponse.redirect(googleAuthUrl, 303)
```

303 (See Other) is the correct status for POST-to-GET redirect.

#### Update: `OAuthButtons.tsx`

- Remove `generateState()` function entirely
- Replace Google button with a `<form method="POST" action="/auth/google/start">`
- Remove `document.cookie` usage

#### Update: `/auth/google/callback/route.ts`

- Use `crypto.timingSafeEqual()` for state comparison instead of `!==`
- Set `httpOnly: true` explicitly when clearing the state cookie
- No other changes needed for Phase 1

#### Update: `middleware.ts`

- Remove `/auth/*` from the auth page redirect check (see middleware section above)
- This unblocks all phases and fixes a latent bug with `/auth/google/callback`

#### Cookie `Secure` flag

`Secure` prevents the cookie from being sent over HTTP. Since local development uses `http://localhost:3000`, the `Secure` flag must be conditional:

```ts
const isProduction = process.env.NODE_ENV === 'production'
response.cookies.set('google_oauth_state', state, {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 600,
})
```

### Phase 2: GitHub login

#### New: `/auth/github/start/route.ts`

```
POST /auth/github/start
  1. Create server-side Supabase client (createServerClient from @supabase/ssr)
  2. Call supabase.auth.signInWithOAuth({
       provider: 'github',
       options: { redirectTo: origin + '/auth/callback', skipBrowserRedirect: true }
     })
  3. The SSR cookie adapter sets PKCE cookies as HttpOnly via the response
  4. Return NextResponse.redirect(data.url, 303)
```

`skipBrowserRedirect: true` makes `signInWithOAuth` return the URL instead of triggering a browser redirect, allowing the server route to set HttpOnly cookies.

#### Update: `OAuthButtons.tsx`

- Replace GitHub button with a `<form method="POST" action="/auth/github/start">`
- Remove Supabase client import (no longer needed in this component)

### Phase 3: Account linking

#### New: `/auth/github/link/route.ts`

```
POST /auth/github/link
  1. Create server-side Supabase client (reads auth cookies from request)
  2. Verify user is authenticated (getUser check)
  3. Call supabase.auth.linkIdentity({
       provider: 'github',
       options: { redirectTo: origin + '/auth/callback?next=/settings/account', skipBrowserRedirect: true }
     })
  4. SSR cookie adapter sets HttpOnly PKCE cookies
  5. Return NextResponse.redirect(data.url, 303)
```

#### New: `/auth/google/link/route.ts`

```
POST /auth/google/link
  1. Create server-side Supabase client (reads auth cookies from request)
  2. Verify user is authenticated (getUser check)
  3. Call supabase.auth.linkIdentity({
       provider: 'google',
       options: { redirectTo: origin + '/auth/callback?next=/settings/account', skipBrowserRedirect: true }
     })
  4. SSR cookie adapter sets HttpOnly PKCE cookies
  5. Return NextResponse.redirect(data.url, 303)
```

Note: Google linking goes through Supabase's proxy (not the direct flow) because there is no `linkWithIdToken` API. The callback for Google linking is `/auth/callback` (Supabase's standard PKCE flow), not `/auth/google/callback`.

#### Update: `ConnectedAccountsSection.tsx`

- Replace `handleLink` with form submissions to `/auth/google/link` and `/auth/github/link`
- Remove Supabase `linkIdentity` call
- Keep Supabase client import (still needed for `unlinkIdentity`)

### Files changed (all phases)

| File | Phase | Change |
|------|-------|--------|
| `src/app/auth/google/start/route.ts` | 1 | **New** — server-side Google OAuth initiation (POST) |
| `src/features/auth/components/OAuthButtons.tsx` | 1 | Google button becomes form submission; remove `generateState()` |
| `src/app/auth/google/callback/route.ts` | 1 | Constant-time state comparison; HttpOnly on cookie clear |
| `src/shared/lib/supabase/middleware.ts` | 1 | Remove `/auth/*` from auth page redirect |
| `src/app/auth/github/start/route.ts` | 2 | **New** — server-side GitHub OAuth initiation (POST) |
| `src/features/auth/components/OAuthButtons.tsx` | 2 | GitHub button becomes form submission; remove Supabase client |
| `src/app/auth/github/link/route.ts` | 3 | **New** — server-side GitHub account linking (POST) |
| `src/app/auth/google/link/route.ts` | 3 | **New** — server-side Google account linking via Supabase proxy (POST) |
| `src/features/account/components/ConnectedAccountsSection.tsx` | 3 | Replace `linkIdentity` with form submissions |

## Edge cases

- **Concurrent flows:** If a user opens two tabs and initiates Google OAuth in both, the second tab's state cookie overwrites the first. The first tab's callback will fail with a state mismatch. This is existing behavior and acceptable — the user can retry.
- **Back button after POST:** Browsers show a "resubmit form" confirmation on back, which is correct behavior for a POST route. The user can click through to re-initiate.
- **Loading states:** Form submission navigates the page, so the button shows its default loading state (if the form uses a submit button with loading via JS). For simple form submission without JS, the browser's native loading indicator suffices.
- **Error handling in start routes:** If env vars are missing, redirect to `/login?error=oauth_error`. If the Supabase client fails, same redirect. Never throw — always redirect with an error code.
- **Link routes without auth:** If an unauthenticated user hits `/auth/*/link`, the server route's `getUser()` check fails. Redirect to `/login`.

## Verification

### Phase 1
- [ ] Google login sets HttpOnly state cookie and completes sign-in
- [ ] State cookie is cleared after successful callback (with HttpOnly flag)
- [ ] State mismatch still rejects forged callbacks
- [ ] `document.cookie` does not contain `google_oauth_state`
- [ ] State comparison uses `timingSafeEqual`
- [ ] Missing env vars redirect to `/login?error=oauth_error`
- [ ] Middleware no longer redirects authenticated users away from `/auth/*` routes
- [ ] Local development works without `Secure` flag (`http://localhost`)
- [ ] POST route returns 303 redirect
- [ ] Form submission works without JavaScript enabled

### Phase 2
- [ ] GitHub login sets HttpOnly PKCE cookie and completes sign-in
- [ ] `document.cookie` does not contain Supabase PKCE verifier
- [ ] GitHub callback (`/auth/callback`) still exchanges code correctly

### Phase 3
- [ ] Google account linking works from settings page (goes through Supabase proxy)
- [ ] GitHub account linking works from settings page
- [ ] Unauthenticated requests to `/auth/*/link` redirect to `/login`
- [ ] Loading states display correctly on link buttons
