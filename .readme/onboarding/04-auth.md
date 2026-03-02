# Authentication and Session Management

This document covers how authentication works in Swashbuckler end to end: the Supabase Auth integration, the two operating modes (authenticated vs. guest), session lifecycle, middleware routing, error handling, and the local-to-Supabase data migration path.

---

## Auth Overview

Swashbuckler uses **Supabase Auth** for identity management. Three sign-in methods are supported:

- **Email/password** -- traditional credentials with email confirmation
- **Google OAuth** -- federated login via Google
- **GitHub OAuth** -- federated login via GitHub

The app also supports a **guest mode** that requires no authentication at all. Guest users get full app functionality backed by Dexie (IndexedDB) instead of Supabase. This means every visitor can use the app immediately, and authentication is only required for cloud storage and collaboration features.

Session tokens are managed via cookies using `@supabase/ssr`, which handles cookie-based session management in the Next.js server/client boundary.

---

## Supabase Client Setup

There are two Supabase client factories, one for browser contexts and one for server contexts. Both use `@supabase/ssr` under the hood and both read/write session cookies.

### Browser client

**File:** `apps/web/src/shared/lib/supabase/client.ts`

```ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

This is a synchronous function. It reads environment variables and returns a Supabase client configured for the browser. In `providers.tsx`, the client is created once per component tree via `useMemo`:

```ts
const supabase = useMemo(() => createClient(), [])
```

### Server client

**File:** `apps/web/src/shared/lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Silently ignored when called from a Server Component (read-only context).
          // Middleware handles session refresh, so this is safe.
        }
      },
    },
  })
}
```

This is an **async** function because it awaits `cookies()` from `next/headers`. The `setAll` catch block handles the case where the function is called from a Server Component, where cookies are read-only. The middleware layer handles the actual cookie writes for session refresh.

---

## The Auth Flow -- Step by Step

### Email/Password Signup

**File:** `apps/web/src/features/auth/components/SignupForm.tsx`

1. User fills in email, password, and password confirmation.
2. Client-side validation runs: passwords must match, minimum 8 characters.
3. `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })` is called.
4. Supabase creates the user record and sends a confirmation email.
5. On the Supabase side, the `handle_new_user_space()` trigger fires (defined in migration `030_fix_new_user_trigger.sql`). This trigger:
   - Creates a default space named "My Space" owned by the new user
   - Seeds a "Page" object type in that space
6. The signup form shows a "Check your email" confirmation screen.
7. The user must click the confirmation link before a session is established.

**Known issue:** The app may show guest mode until the user confirms their email and signs in, because `signUp` does not return a session when email confirmation is required.

### Email/Password Login

**File:** `apps/web/src/features/auth/components/LoginForm.tsx`

1. User fills in email and password.
2. `supabase.auth.signInWithPassword({ email, password })` is called.
3. On success, Supabase returns a session containing access and refresh tokens.
4. `@supabase/ssr` stores the tokens in cookies automatically.
5. The `onAuthStateChange` listener in `providers.tsx` fires and updates the `user` state:

```ts
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null)
})
```

6. When `user` transitions from `null` to a `User` object, `DataProvider` switches from `'local'` to `'supabase'` storage mode:

```ts
const storageMode: StorageMode = user ? 'supabase' : 'local'
```

7. The login form calls `router.push("/dashboard")` and `router.refresh()` to navigate.

### OAuth Login (Google/GitHub)

**File:** `apps/web/src/features/auth/components/OAuthButtons.tsx`

1. User clicks "Continue with Google" or "Continue with GitHub".
2. `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` is called, with `redirectTo` set to `${window.location.origin}/auth/callback`.
3. The browser is redirected to the OAuth provider's consent screen.
4. After the user authenticates, the provider redirects back to `/auth/callback?code=...`.

**File:** `apps/web/src/app/auth/callback/route.ts`

5. The callback route handler runs server-side:

```ts
export async function GET(request: NextRequest) {
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/dashboard"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard"

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response  // redirect to `next` (default: /dashboard)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
```

6. `exchangeCodeForSession(code)` exchanges the PKCE authorization code for access/refresh tokens and writes them to cookies on the response.
7. The `next` parameter supports the password reset flow: `ForgotPasswordForm` sets `redirectTo` to `/auth/callback?next=/reset-password`, so after clicking the email link the user lands on the password reset page.
8. If the code exchange fails or no code is present, the user is redirected to `/login`.

### Guest Mode

**File:** `apps/web/src/app/(public)/landing/GuestButton.tsx`

1. User clicks "Try as Guest" on the landing page.
2. A cookie is set directly via `document.cookie`:

```ts
document.cookie = "swashbuckler-guest=1; path=/; max-age=31536000; SameSite=Lax; Secure"
```

The cookie lasts one year (`max-age=31536000`).

3. The user is routed to `/dashboard`.
4. Since there is no Supabase user, `DataProvider` stays in `'local'` mode and uses the Dexie (IndexedDB) data client.
5. All data lives entirely in the browser. There is no server-side persistence.

---

## Session Management

### How sessions persist

Access and refresh tokens are stored in cookies by `@supabase/ssr`. The middleware layer refreshes expired access tokens on every request.

**File:** `apps/web/src/proxy.ts`

```ts
import { updateSession } from "@/shared/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

The `proxy` function delegates entirely to `updateSession`, which is the real middleware logic.

**File:** `apps/web/src/shared/lib/supabase/middleware.ts`

The `updateSession` function:

1. Creates a Supabase server client with cookie read/write handlers wired to the request and response.
2. Calls `supabase.auth.getUser()`, which implicitly refreshes the access token if expired (using the refresh token from the cookie).
3. Writes any updated cookies back to the response via `setAll`.
4. Performs route-level redirects based on auth state (see Route Protection below).

The cookie handler in middleware is notable because it must sync cookies in two places -- the request (so downstream code sees updated cookies) and the response (so the browser receives them):

```ts
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
  supabaseResponse = NextResponse.next({ request })
  cookiesToSet.forEach(({ name, value, options }) =>
    supabaseResponse.cookies.set(name, value, options)
  )
}
```

### Session expiry detection

**File:** `apps/web/src/shared/hooks/useSessionGuard.ts`

The `useSessionGuard()` hook runs inside `DataProviderWithSpace` in `providers.tsx`. It subscribes to the TanStack Query cache and watches for auth-related errors across all queries:

```ts
export function useSessionGuard() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    const cache = queryClient.getQueryCache()

    const unsubscribe = cache.subscribe((event) => {
      if (hasRedirected.current) return
      if (event.type !== 'updated' || event.action.type !== 'error') return

      const error = event.action.error
      if (error instanceof Error && isAuthError(error)) {
        hasRedirected.current = true
        router.push('/login?expired=true')
      }
    })

    return unsubscribe
  }, [queryClient, router])
}
```

The `hasRedirected` ref prevents multiple redirects when several queries fail simultaneously.

**File:** `apps/web/src/shared/lib/data/errors.ts`

Auth errors are identified by matching error messages against known patterns:

```ts
const AUTH_PATTERNS = [
  'JWT expired',
  'invalid claim',
  'not authenticated',
  'Invalid Refresh Token',
  'Auth session missing',
]

export function isAuthError(error: DataError | Error): boolean {
  const message = error.message ?? ''
  return AUTH_PATTERNS.some((pattern) => message.includes(pattern))
}
```

When a `DataLayerError` is constructed, it checks these patterns to set its `isAuth` flag. Auth errors are never retryable:

```ts
this.isAuth = isAuthError(dataError)
this.retryable = !this.isAuth && !PERMANENT_CODES.has(dataError.code ?? '')
```

The TanStack Query client in `providers.tsx` uses this `retryable` flag:

```ts
retry: (failureCount, error) => {
  if (error instanceof DataLayerError && !error.retryable) return false
  return failureCount < 1
},
```

### Auth state flow in providers

The full provider tree and how auth state flows through it:

```
Providers (providers.tsx)
  |
  |-- supabase.auth.getUser() on mount --> sets `user` state
  |-- supabase.auth.onAuthStateChange() --> updates `user` on session changes
  |
  +-- ThemeProvider
      +-- QueryClientProvider
          +-- SpaceProvider (receives user, isAuthLoading)
              +-- DataProviderWithSpace
                  |-- useSessionGuard()     <-- watches for auth errors
                  |-- useCurrentSpace()     <-- reads current space from context
                  +-- DataProvider (receives user, isAuthLoading, spaceId)
                      |-- user ? createSupabaseDataClient() : createLocalDataClient()
                      +-- children
```

---

## Password Security

### Strength meter

**File:** `apps/web/src/features/auth/lib/passwordStrength.ts`

The password strength meter uses a point-based scoring system (not zxcvbn):

| Criterion | Points |
|---|---|
| Length >= 8 characters | +1 |
| Length >= 12 characters | +1 |
| Contains both uppercase and lowercase | +1 |
| Contains a digit | +1 |
| Contains a special character | +1 |

Points are clamped to a 1-4 scale and mapped to labels: Weak, Fair, Strong, Very strong.

**File:** `apps/web/src/features/auth/components/PasswordStrengthMeter.tsx`

The meter renders as four colored bars with an accessible `role="meter"` attribute and `aria-label`.

### Validation rules

- **Minimum length:** 8 characters (enforced client-side in both `SignupForm` and `ResetPasswordForm`)
- **Passwords must match:** confirmation field checked before submission

### Login rate limiting

**File:** `apps/web/src/features/auth/components/LoginForm.tsx`

Rate limiting is implemented client-side with escalating cooldowns:

```ts
function getCooldownSeconds(attempts: number): number {
  if (attempts >= 10) return 60
  if (attempts >= 5) return 30
  return 0
}
```

- **5 failed attempts:** 30-second cooldown
- **10+ failed attempts:** 60-second cooldown
- A countdown timer is shown to the user, and the submit button is disabled during lockout

This is a client-side UX protection only. Server-side rate limiting is handled by Supabase's built-in auth rate limits.

---

## Route Protection

**File:** `apps/web/src/shared/lib/supabase/middleware.ts`

The middleware handles routing decisions based on the combination of auth session and guest cookie:

| Route | Has session | Has guest cookie | No auth | Result |
|---|---|---|---|---|
| `/` | Redirect to `/dashboard` | Redirect to `/dashboard` | Redirect to `/landing` |
| `/landing` | Redirect to `/dashboard` | Pass through | Pass through |
| `/login`, `/signup`, `/auth/*` | Redirect to `/dashboard` | Pass through | Pass through |
| `/auth/callback` | Always passes through (excluded from auth page redirects) | -- | -- |
| `/dashboard`, other app routes | Pass through | Pass through (uses Dexie) | Pass through (no guard in middleware) |

Key details:

- The root `/` redirect uses `user || hasGuestCookie` to decide between `/dashboard` and `/landing`.
- Auth pages (`/login`, `/signup`, `/auth/*`) redirect to `/dashboard` if the user is already authenticated. The `/auth/callback` route is explicitly excluded from this check so it can always exchange PKCE codes.
- Authenticated users are redirected away from the landing page.
- Guest users with the `swashbuckler-guest` cookie can access all app routes without authentication.

---

## Password Reset Flow

The password reset flow spans three components and the callback route:

1. **ForgotPasswordForm** (`apps/web/src/features/auth/components/ForgotPasswordForm.tsx`): User enters their email. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/callback?next=/reset-password' })`.

2. **Email link**: Supabase sends a password reset email. The link includes a code that redirects through `/auth/callback?code=...&next=/reset-password`.

3. **Callback route** (`apps/web/src/app/auth/callback/route.ts`): Exchanges the code for a session and redirects to `/reset-password` (read from the `next` query parameter).

4. **ResetPasswordForm** (`apps/web/src/features/auth/components/ResetPasswordForm.tsx`): User enters a new password with confirmation. Calls `supabase.auth.updateUser({ password })`, then redirects to `/dashboard`.

---

## The Local-to-Supabase Migration

**File:** `apps/web/src/shared/lib/data/DataProvider.tsx`

When a guest user creates an account, the `migrateToSupabase()` function (exposed via the `useMigrateData()` hook) transfers all local Dexie data to Supabase. The migration process:

1. **Export local data:** `exportLocalData()` returns all objects, object types, templates, and object relations from IndexedDB.

2. **Skip if empty:** If there are no objects and no types, migration is skipped entirely.

3. **Migrate object types with slug matching:**
   - Fetch existing Supabase types and index them by slug.
   - For each local type, check if a type with the same slug already exists in Supabase. If so, map the local type ID to the existing Supabase type ID. If not, create the type in Supabase and record the mapping.
   - This slug-matching is critical because the `handle_new_user_space()` trigger already seeds a "Page" type, so the migration avoids duplicating it.

4. **Migrate objects:** Create each local object in Supabase, remapping `type_id` using the type ID map. Track old-to-new object ID mappings for the relation step.

5. **Migrate templates:** Create each template, remapping `type_id`.

6. **Migrate relations:** Create each relation, remapping both `source_id` and `target_id` using the object ID map. Relations where either source or target was not successfully migrated are silently dropped.

7. **Clear local data:** `clearLocalData()` wipes the Dexie database after a successful migration.

---

## Error Handling

**File:** `apps/web/src/shared/lib/data/errors.ts`

The `DataLayerError` class wraps all data layer errors with structured properties:

```ts
export class DataLayerError extends Error {
  readonly code: string | undefined
  readonly retryable: boolean
  readonly isAuth: boolean
}
```

Error classification:

| Category | Codes / Patterns | Retryable | Behavior |
|---|---|---|---|
| Auth errors | `JWT expired`, `invalid claim`, `not authenticated`, `Invalid Refresh Token`, `Auth session missing` | No | Immediate redirect to `/login?expired=true` |
| Permanent DB errors | `23505` (unique violation), `23503` (FK violation), `42501` (permission denied), `42P01` (undefined table), `PGRST116` (row not found), `PGRST204` (column not found), `23514` (check violation) | No | Error surfaced to user, no retry |
| Transient errors | Everything else | Yes | TanStack Query retries once (`failureCount < 1`) |

---

## Key Files Reference

| File | Purpose |
|---|---|
| `apps/web/src/shared/lib/supabase/client.ts` | Browser Supabase client factory |
| `apps/web/src/shared/lib/supabase/server.ts` | Server Supabase client factory (async) |
| `apps/web/src/shared/lib/supabase/middleware.ts` | Session refresh and route protection logic |
| `apps/web/src/proxy.ts` | Next.js middleware entry point, delegates to `updateSession` |
| `apps/web/src/app/auth/callback/route.ts` | OAuth/PKCE code exchange and redirect handling |
| `apps/web/src/app/providers.tsx` | Root provider tree, auth state initialization, `onAuthStateChange` listener |
| `apps/web/src/shared/lib/data/DataProvider.tsx` | Storage mode switching (`user ? supabase : local`), migration logic |
| `apps/web/src/shared/lib/data/errors.ts` | `DataLayerError` class, auth error detection, retry classification |
| `apps/web/src/shared/hooks/useSessionGuard.ts` | Global TanStack Query error listener for session expiry |
| `apps/web/src/features/auth/components/LoginForm.tsx` | Email/password login with rate limiting |
| `apps/web/src/features/auth/components/SignupForm.tsx` | Email/password signup with email confirmation flow |
| `apps/web/src/features/auth/components/OAuthButtons.tsx` | Google and GitHub OAuth buttons |
| `apps/web/src/features/auth/components/ForgotPasswordForm.tsx` | Password reset request form |
| `apps/web/src/features/auth/components/ResetPasswordForm.tsx` | New password entry after reset link |
| `apps/web/src/features/auth/components/PasswordStrengthMeter.tsx` | Visual password strength indicator |
| `apps/web/src/features/auth/lib/passwordStrength.ts` | Password scoring logic |
| `apps/web/src/app/(public)/landing/GuestButton.tsx` | Sets the `swashbuckler-guest` cookie |
| `apps/web/supabase/migrations/030_fix_new_user_trigger.sql` | `handle_new_user_space()` trigger that seeds default space and Page type |

---

## Gotchas

1. **Guest cookie must be checked alongside auth session.** The middleware checks `request.cookies.has("swashbuckler-guest")` to allow unauthenticated access to app routes. If you add new protected routes, make sure this check is included.

2. **Email confirmation is required.** Calling `signUp` does not return a session when Supabase has email confirmation enabled. New users must click the confirmation email link before they can sign in. The `SignupForm` handles this by showing a "Check your email" screen instead of attempting to navigate.

3. **`onAuthStateChange` fires for all auth events.** This includes token refreshes, not just sign-in/sign-out. The listener in `providers.tsx` handles all events uniformly by extracting `session?.user`, but if you add event-specific logic, filter by the `_event` parameter (e.g., `'SIGNED_IN'`, `'SIGNED_OUT'`, `'TOKEN_REFRESHED'`).

4. **Server vs. browser client naming.** Both files export a function named `createClient()`, but the server version is **async** (because it awaits `cookies()`) and the browser version is **sync**. Make sure you import from the correct path:
   - Server Components / Route Handlers: `import { createClient } from '@/shared/lib/supabase/server'`
   - Client Components: `import { createClient } from '@/shared/lib/supabase/client'`

5. **OAuth callback handles multiple flows.** The `/auth/callback` route is used for both OAuth login and password reset. The `next` query parameter controls where the user lands after code exchange. The route sanitizes `next` to prevent open redirect attacks (`rawNext.startsWith("/") && !rawNext.startsWith("//")`).

6. **SECURITY DEFINER functions need fully qualified table names.** The `handle_new_user_space()` trigger runs as `SECURITY DEFINER` with `SET search_path = public`. It must reference tables as `public.spaces`, `public.object_types`, etc., because auth triggers run in a context where `public` may not be in `search_path`.

7. **Middleware cookie sync is two-phase.** The middleware `setAll` callback writes cookies to both the request object (so downstream server code sees the refreshed session) and the response object (so the browser receives the updated cookies). Missing either phase causes session persistence bugs.

8. **Client-side rate limiting is UX only.** The `LoginForm` cooldown state resets on page reload. It is not a security mechanism. Actual brute-force protection comes from Supabase's server-side rate limits.

---

## Exercises

1. **Trace the full OAuth login flow.** Starting from `OAuthButtons.tsx`, follow the redirect chain through the OAuth provider, back to `/auth/callback`, through `exchangeCodeForSession`, and into the `onAuthStateChange` listener in `providers.tsx`. Identify where cookies are written at each step.

2. **Find where the guest cookie is set and checked.** Read `GuestButton.tsx` to see how the cookie is created. Then read `middleware.ts` to see how the cookie is checked. What happens if the cookie expires?

3. **Understand session expiry detection.** Read `useSessionGuard.ts` and `errors.ts`. What TanStack Query cache event triggers the redirect? Why does the hook use a `hasRedirected` ref? What would happen without it?

4. **Follow the migration path.** Read the `migrateToSupabase` function in `DataProvider.tsx`. Why does it match types by slug instead of by ID? What happens to relations where one side of the relation was not successfully migrated? What happens if the user already has a "Page" type in Supabase from the `handle_new_user_space()` trigger?
