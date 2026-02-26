# Security Audit

**Status:** Not started

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

## Deliverables

- Findings table with severity (Critical / High / Medium / Low / Info)
- Fix PRs for any Critical or High issues
- Recommendations for Medium/Low issues
- Updated spec with final results
