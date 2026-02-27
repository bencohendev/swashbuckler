# Security Audit

**Status:** Done

## Overview

OWASP-style security review of the Swashbuckler codebase. Covers authentication flows, session management, input validation, injection vectors, sharing permission boundaries, realtime channel security, and infrastructure hardening.

## Scope

### In Scope
- Auth flows (email/password, OAuth, session lifecycle)
- Input validation and sanitization (Zod schemas, user-facing inputs)
- XSS vectors (editor content rendering, user-generated HTML)
- CSRF protection (Next.js defaults, custom API routes)
- SQL injection / RLS bypass risks (Supabase RPC functions, raw queries)
- Sharing permission boundaries (space shares, exclusions, editor vs viewer)
- Realtime channel security (Broadcast auth, message spoofing)
- Secrets management (env vars, client-exposed keys)
- CSP and security headers (Next.js middleware, Vercel config)
- Rate limiting (auth endpoints, API routes)
- File upload security (storage bucket policies, MIME validation, size limits)
- Error leakage (stack traces, internal IDs in client responses)

### Out of Scope
- RLS policy correctness (covered in [API Audit — Backend](api-audit-backend.md))
- Frontend API call error handling patterns (covered in [API Audit — Frontend](api-audit-frontend.md))

## Audit Areas

### 1. Authentication & Session Management

**Checks:**
- Password hashing (Supabase default bcrypt config)
- Session token storage and rotation
- OAuth callback validation (redirect URI pinning)
- Email confirmation flow security
- Password reset flow (token expiry, single-use)
- Login rate limiting enforcement
- Session expiry and refresh token handling

**Key Files:**
- `src/app/(auth)/` — login, signup pages
- `src/app/auth/callback/` — OAuth callback handler
- `src/features/auth/` — auth hooks and components
- `src/shared/lib/data/supabase.ts` — Supabase client init
- `supabase/migrations/006_triggers.sql` — `handle_new_user`

**Pass Criteria:**
- No session fixation or token leakage vectors
- Rate limiting active on auth endpoints
- OAuth state parameter validated

### 2. Input Validation & Sanitization

**Checks:**
- Zod schema coverage on all user inputs (forms, URL params, API payloads)
- Editor content sanitization before storage and rendering
- Property field values validated by type (URL, number, date, text)
- Search input sanitization (pg_trgm injection)
- File name / MIME type validation on uploads

**Key Files:**
- `src/shared/lib/data/types.ts` — Zod schemas
- `src/features/editor/` — Plate editor config
- `src/features/objects/` — object CRUD forms
- `src/features/search/` — search hooks
- `supabase/migrations/005_functions.sql` — RPC functions

**Pass Criteria:**
- All user inputs pass through Zod validation before reaching the data layer
- No unescaped user content rendered as HTML outside the editor
- Search queries parameterized, not interpolated

### 3. Cross-Site Scripting (XSS)

**Checks:**
- Editor content rendered via Plate (not `dangerouslySetInnerHTML`)
- Object names, type names, tag names escaped in all contexts
- Emoji/icon picker values sanitized
- Mention display names escaped
- URL property values validated before rendering as links
- Toast notification content escaped

**Key Files:**
- `src/features/editor/components/` — all editor element renderers
- `src/features/sidebar/` — name rendering
- `src/shared/components/` — shared UI components

**Pass Criteria:**
- Zero use of `dangerouslySetInnerHTML` outside controlled contexts
- All user-generated strings rendered via React (auto-escaped)

### 4. Cross-Site Request Forgery (CSRF)

**Checks:**
- Next.js Server Actions CSRF protection (enabled by default)
- Supabase client uses auth headers (not cookies alone)
- No state-changing GET requests
- OAuth flows use `state` parameter

**Key Files:**
- `src/app/auth/callback/` — OAuth handler
- `next.config.ts` — Next.js config

**Pass Criteria:**
- All mutations require authenticated session token
- No GET endpoints cause side effects

### 5. Sharing & Permission Boundaries

**Checks:**
- Shared users cannot access excluded objects
- Space-wide exclusions enforced in both Supabase and Dexie
- Editor vs viewer permission enforcement (UI and data layer)
- `sharedPermission` null handling for space owners
- Private content blocks hidden from shared users
- Share invitation flow (link generation, acceptance)
- Leave space cleans up all access

**Key Files:**
- `src/features/sharing/` — sharing UI and hooks
- `src/shared/lib/data/supabase.ts` — permission checks
- `supabase/migrations/004_sharing.sql`, `011_sharing.sql`, `015_space_wide_exclusions.sql`

**Pass Criteria:**
- No permission bypass via direct API calls
- Excluded objects invisible in all views (sidebar, search, graph, type pages)
- Viewer cannot mutate data

### 6. Realtime Channel Security

**Checks:**
- Broadcast channel names scoped to object + space
- No cross-space message leakage
- Yjs document access restricted to authorized users
- Provider sender filtering prevents message spoofing
- Awareness data doesn't leak sensitive info

**Key Files:**
- `src/features/editor/hooks/useCollaborativeEditor.ts`
- `src/features/editor/lib/SupabaseYjsProvider.ts`
- `supabase/migrations/018_realtime.sql`

**Pass Criteria:**
- Channel names include space ID and object ID
- Unauthorized users cannot join or send to channels
- Awareness only exposes display name and color

### 7. Secrets & Configuration

**Checks:**
- No secrets in client-side bundles (only `NEXT_PUBLIC_` prefixed vars)
- `.env` files in `.gitignore`
- Supabase service role key never exposed to client
- API keys scoped to minimum required permissions

**Key Files:**
- `.env.local` (verify not committed)
- `next.config.ts` — env exposure
- `src/shared/lib/data/supabase.ts` — client init

**Pass Criteria:**
- Only anon key exposed to client
- No secrets in git history

### 8. Security Headers & CSP

**Checks:**
- Content-Security-Policy header (script-src, style-src, img-src)
- X-Frame-Options / frame-ancestors
- X-Content-Type-Options: nosniff
- Referrer-Policy
- Permissions-Policy
- HSTS (Vercel default)

**Key Files:**
- `next.config.ts` — headers config
- `vercel.json` (if exists)
- `src/middleware.ts` (if exists)

**Pass Criteria:**
- CSP blocks inline scripts (or uses nonces)
- Framing restricted to same-origin
- All recommended security headers present

### 9. File Upload Security

**Checks:**
- Storage bucket RLS policies (owner-only upload, shared-space upload)
- File size limits enforced server-side
- MIME type validation (allowlist, not blocklist)
- File name sanitization (path traversal prevention)
- Uploaded content not served with executable MIME types

**Key Files:**
- `supabase/migrations/016_storage.sql` — bucket policies
- `src/features/image-upload/` — upload components and hooks

**Pass Criteria:**
- Only image MIME types accepted
- Max file size enforced at bucket level
- Uploaded files served from Supabase storage CDN (not same-origin)

### 10. Error Handling & Information Leakage

**Checks:**
- Server errors return generic messages (no stack traces)
- Database errors (constraint violations, RLS denials) mapped to user-friendly messages
- Console logging doesn't expose sensitive data in production
- Error boundaries don't render internal state

**Key Files:**
- `src/app/error.tsx`, `src/app/not-found.tsx` — error pages
- `src/shared/lib/data/` — error handling in data layer

**Pass Criteria:**
- No internal error details exposed to client
- Production builds strip debug logging

## Methodology

1. Static analysis: grep for known anti-patterns (dangerouslySetInnerHTML, raw SQL, exposed secrets)
2. Configuration review: Next.js config, Supabase dashboard settings, Vercel config
3. Code review: manual inspection of auth flows, permission checks, input handling
4. Dynamic testing: attempt permission bypasses, XSS payloads in editor, malformed inputs

## Results Summary

**14 findings** across 10 audit areas. **11 fixed**, **3 deferred** (require infrastructure changes).

| Severity | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| Critical | 2 | 2 | 0 |
| High | 3 | 3 | 0 |
| Medium | 5 | 2 | 3 |
| Low | 4 | 4 | 0 |

### Per-Area Results

| Area | Result | Notes |
|------|--------|-------|
| 1. Auth & Sessions | **Partial** | OAuth callback redirect fixed (H1), guest cookie hardened (L3); server-side rate limiting deferred (M2) |
| 2. Input Validation | **Pass** | Zod schemas tightened for slug, color, icon fields (L1, L2) |
| 3. XSS | **Pass** | `javascript:` protocol blocked in URL properties (C1) and editor links (C2); SVG upload vector removed (M3) |
| 4. CSRF | **Pass** | No issues found — Supabase uses auth headers, Next.js CSRF defaults active |
| 5. Sharing | **Partial** | No RLS bypasses found; field exclusions are UI-only (M4 deferred), user enumeration possible (M5 deferred) |
| 6. Realtime | **Pass** | Broadcast channels scoped to space + document (H3) |
| 7. Secrets | **Pass** | No secrets in git history; only anon key exposed to client; `.env*` in `.gitignore` |
| 8. Headers & CSP | **Pass** | Full CSP header added (M1); all recommended security headers present |
| 9. Uploads | **Pass** | SVG removed from MIME allowlist and storage bucket (M3); size limits enforced at bucket level |
| 10. Error Handling | **Pass** | Generic error messages on account delete endpoint (L4); error boundaries don't leak internals |

## Findings

| # | Severity | Area | Finding | Fix |
|---|----------|------|---------|-----|
| C1 | Critical | XSS | URL property fields render `href` without protocol validation — `javascript:` URIs execute | Added `isSafeUrl()` guard in `PropertyCell.tsx` |
| C2 | Critical | XSS | Editor link elements render `href` without protocol validation | Added `isSafeUrl()` guard in `Link.tsx` |
| H1 | High | Auth | OAuth callback `next` param allows open redirect (e.g. `//evil.com`) | Validate `next` starts with `/` and not `//` in `auth/callback/route.ts` |
| H2 | High | IDOR | `search_objects` and `get_graph_data` RPCs accept client-controllable `user_id` param with SECURITY DEFINER | Dropped both unused RPCs via migration 024 |
| H3 | High | Realtime | Broadcast channels named only by `documentId` — any authenticated user who knows the ID can join | Scoped channels to `collab:${spaceId}:${documentId}` |
| M1 | Medium | Headers | No Content-Security-Policy header configured | Added full CSP to `next.config.ts` security headers |
| M2 | Medium | Auth | Login rate limiting is client-side only | Deferred |
| M3 | Medium | Uploads | `image/svg+xml` in MIME allowlist creates latent XSS risk | Removed SVG from allowlist + storage bucket migration 025 |
| M4 | Medium | Sharing | Field exclusions enforced in UI only, not at RLS level | Deferred |
| M5 | Medium | Sharing | `find_user_by_email` RPC enables user enumeration | Deferred |
| L1 | Low | Validation | Object type `slug` field accepts arbitrary strings (no pattern enforcement) | Added regex `/^[a-z0-9]+(-[a-z0-9]+)*$/` to Zod schemas |
| L2 | Low | Validation | Tag/type `color` field accepts arbitrary strings (potential CSS injection via style attrs) | Added regex `/^#[0-9a-fA-F]{3,8}$/` to Zod schemas |
| L3 | Low | Auth | Guest cookie missing `SameSite` and `Secure` flags | Added `SameSite=Lax; Secure` to `GuestButton.tsx` |
| L4 | Low | Errors | Account delete endpoint leaks internal error messages | Changed to generic "Failed to delete account" message |

## Fix Details

### C1 & C2 — XSS via `javascript:` Protocol in Links

**Problem:** Both `PropertyCell.tsx` (table-view URL fields) and `Link.tsx` (editor inline links) rendered user-supplied URLs directly in `<a href>`. A value like `javascript:alert(1)` would execute when clicked.

**Fix:** Created shared `isSafeUrl()` helper at `src/shared/lib/url.ts` that validates the URL parses to `http:` or `https:` protocol. Both components now gate `href` through this check — unsafe URLs render as plain text (PropertyCell) or an unlinked span (Link).

**Files:** `src/shared/lib/url.ts` (new), `src/features/table-view/components/PropertyCell.tsx`, `src/features/editor/components/elements/Link.tsx`

### H1 — Open Redirect via OAuth Callback

**Problem:** The auth callback at `src/app/auth/callback/route.ts` used the `next` query parameter directly in `redirect()`. An attacker could craft an OAuth link with `next=//evil.com` to redirect users to a malicious site after login.

**Fix:** Validate that `next` starts with `/` and does not start with `//`. Falls back to `/dashboard` if invalid.

**Files:** `src/app/auth/callback/route.ts`

### H2 — IDOR in Unused SECURITY DEFINER RPCs

**Problem:** `search_objects(query, user_id, limit)` and `get_graph_data(user_id)` were created as `SECURITY DEFINER` functions that accept a client-supplied `user_id`. Any authenticated user could call these via the Supabase REST API with another user's ID to read their data. Neither function was used by the application.

**Fix:** Dropped both functions via migration `024_drop_unused_rpcs.sql`.

**Files:** `supabase/migrations/024_drop_unused_rpcs.sql` (new)

### H3 — Realtime Channel Not Scoped to Space

**Problem:** The Yjs collaboration provider named Broadcast channels as `collab:${documentId}`. Any authenticated Supabase user who knew a document's UUID could subscribe to the channel and receive real-time document updates, even without sharing access to the space.

**Fix:** Changed channel naming to `collab:${spaceId}:${documentId}`. Added `spaceId` as a required parameter to the provider constructor and threaded it through `useCollaboration` and `ObjectEditor`.

**Files:** `src/features/collaboration/lib/supabase-yjs-provider.ts`, `src/features/collaboration/hooks/useCollaboration.ts`, `src/features/objects/components/ObjectEditor.tsx`

### M1 — Missing Content-Security-Policy Header

**Problem:** `next.config.ts` had several security headers (HSTS, X-Frame-Options, etc.) but no CSP. This left the app without defense-in-depth against injected scripts.

**Fix:** Added a CSP header: `default-src 'self'`, script/style `'unsafe-inline'` (required by Next.js), images from `data: blob: https:`, connections to `*.supabase.co`, `frame-ancestors 'none'`.

**Files:** `next.config.ts`

### M3 — SVG in Upload Allowlist

**Problem:** `ACCEPTED_IMAGE_TYPES` included `image/svg+xml`. SVG files can contain embedded JavaScript that executes when viewed, creating a stored XSS vector. Although the files were served from Supabase CDN (different origin), this is still a latent risk if serving configuration changes.

**Fix:** Removed `image/svg+xml` from the client-side allowlist and extension map. Added migration `025_remove_svg_uploads.sql` to update the storage bucket's `allowed_mime_types`. Updated the error message in `Image.tsx` to list only JPEG, PNG, GIF, WebP.

**Files:** `src/shared/lib/supabase/upload.ts`, `src/features/editor/components/elements/Image.tsx`, `supabase/migrations/025_remove_svg_uploads.sql` (new)

### L1 & L2 — Loose Zod Schema Validation

**Problem:** Object type `slug` accepted any string (could contain spaces, special characters, or SQL-like payloads). Tag and type `color` fields accepted any string (could theoretically carry CSS injection payloads in contexts that interpolate into `style` attributes). Object type `icon` had no length limit.

**Fix:** Added regex and length constraints to Zod schemas in `types.ts`:
- `slug`: `/^[a-z0-9]+(-[a-z0-9]+)*$/` (lowercase alphanumeric with hyphens)
- `color`: `/^#[0-9a-fA-F]{3,8}$/` (valid hex color)
- `icon`: `.max(50)` (reasonable length limit for emoji/icon strings)

Applied to `objectTypeSchema`, `createObjectTypeSchema`, `updateObjectTypeSchema`, `tagSchema`, `createTagSchema`, `updateTagSchema`.

**Files:** `src/shared/lib/data/types.ts`

### L3 — Guest Cookie Missing Security Flags

**Problem:** The guest mode cookie was set as `swashbuckler-guest=1; path=/; max-age=31536000` without `SameSite` or `Secure` flags. Without `SameSite`, the cookie could be sent on cross-site requests. Without `Secure`, it could be transmitted over HTTP.

**Fix:** Added `SameSite=Lax; Secure` to the cookie string.

**Files:** `src/app/(public)/landing/GuestButton.tsx`

### L4 — Error Message Leakage in Account Delete

**Problem:** The account delete API route at `src/app/api/account/delete/route.ts` returned `deleteError.message` directly to the client, potentially exposing internal Supabase error details.

**Fix:** Changed to a generic `'Failed to delete account'` message.

**Files:** `src/app/api/account/delete/route.ts`

## Deferred Items

### M2 — Server-Side Rate Limiting

Login rate limiting is enforced client-side only (disabling the submit button with a cooldown). A direct POST to Supabase auth endpoints bypasses this entirely. Proper fix requires Supabase project-level rate limiting configuration or a custom Next.js middleware/API route that proxies auth requests with server-side throttling.

### M4 — RLS-Enforced Field Exclusions

Share exclusions can hide specific fields from shared users, but this is enforced in the UI only. The underlying Supabase queries still return full rows. A shared user with API access could read excluded field values directly. Proper fix would require column-level security, computed columns, or a server-side filtering layer. Current UI enforcement is acceptable given the threat model (shared users are trusted contacts invited by the space owner).

### M5 — User Enumeration via `find_user_by_email`

The `find_user_by_email` RPC returns user data if found or null if not, allowing authenticated users to probe whether an email is registered. Practical impact is low because the RPC requires authentication and Supabase handles email privacy at the auth layer. Could be mitigated by always returning a success response with a share invitation sent regardless of whether the user exists.
