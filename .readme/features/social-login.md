# Social Login (Google & GitHub OAuth)

**Status:** Done

## Overview

Add Google and GitHub as OAuth sign-in options alongside the existing email/password flow. Google uses a **direct OAuth flow** (app redirects to Google directly) so the consent screen shows the app name instead of the Supabase subdomain. GitHub uses Supabase's built-in OAuth proxy.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| OAuth providers | Google + GitHub | Covers most users; both free, both supported natively by Supabase |
| Google token handling | Direct flow with `signInWithIdToken` | App exchanges code with Google directly, passes `id_token` to Supabase — consent screen shows app name instead of Supabase subdomain |
| GitHub token handling | Supabase-managed | Supabase handles the full GitHub OAuth flow via `signInWithOAuth` |
| Data received | Email, name, avatar | Basic profile scopes only — no sensitive/restricted scopes needed |
| Google scope level | Non-sensitive (`openid`, `email`, `profile`) | Avoids security audit requirement and restrictive verification process |

## Pricing

All OAuth costs are effectively **$0** at current scale.

| Service | Cost | Notes |
|---------|------|-------|
| Google OAuth | Free | No per-auth charge from Google |
| GitHub OAuth | Free | No per-auth charge from GitHub |
| Supabase Auth | Included | OAuth users count toward MAU total (free tier: 50K MAUs; Pro: 100K included, then $0.00325/MAU) |

### Rate limits

- **Google**: 10,000 sign-ins/day for unverified apps (increases after verification)
- **GitHub**: 5,000 API requests/hour per authenticated user (not a concern for login-only)

## Compliance & Liability

### Required for both providers

- **Privacy policy page** — Must disclose what user data is collected (email, name, avatar), how it's stored, and how users can request deletion
- **Account deletion** — Users must be able to delete their account and data (likely needed regardless under GDPR/CCPA)

### Google-specific requirements

| Requirement | Details |
|-------------|---------|
| OAuth consent screen | Must configure in Google Cloud Console; brand verification takes 2-3 business days |
| Domain verification | Must prove ownership of the app's domain |
| Unverified app warning | Before verification, Google shows a "This app isn't verified" warning; limited to 100 test users |
| Limited Use Policy | Data from Google can only be used for user-facing features; cannot be sold, shared with advertisers, or used for surveillance |
| Security audit | **Not required** for basic sign-in scopes (`openid`, `email`, `profile`) — only applies to restricted scopes like Gmail/Drive |

### GitHub-specific requirements

| Requirement | Details |
|-------------|---------|
| Privacy policy | Recommended but not strictly enforced for basic auth |
| Verification | None — register an OAuth App and it works immediately |
| Terms compliance | Standard: don't abuse the API, don't harvest data |

### Liability exposure

Minimal. For Google, the app exchanges the authorization code server-side and only passes the `id_token` to Supabase via `signInWithIdToken` — access/refresh tokens from Google are not stored. For GitHub, Supabase handles the full flow. In both cases, the app only uses basic profile data (email, name, avatar URL).

## Implementation

### Setup

1. Create Google OAuth credentials in Google Cloud Console — add redirect URIs for `/auth/google/callback` (dev + prod)
2. Create GitHub OAuth App in GitHub developer settings
3. Add client IDs and secrets to Supabase Auth provider config (Google Client ID must match `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
4. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
5. Configure redirect URLs

### Key files

| File | Role |
|------|------|
| `src/features/auth/components/OAuthButtons.tsx` | Google (direct redirect) + GitHub (`signInWithOAuth`) buttons |
| `src/app/auth/google/callback/route.ts` | Server-side Google code exchange + `signInWithIdToken` |
| `src/app/auth/callback/route.ts` | GitHub OAuth + email confirmation + password reset callback |

### UI

- "Continue with Google" and "Continue with GitHub" buttons on login and signup pages
- Divider between OAuth buttons and email/password form
- Loading state while OAuth redirect is in progress

## Verification

- [ ] Google sign-in creates account and logs user in
- [ ] GitHub sign-in creates account and logs user in
- [ ] Existing email users can link Google/GitHub accounts
- [ ] OAuth callback redirects to the correct page after sign-in
- [ ] Unrecognized OAuth user is prompted to create an account (or auto-created)
- [ ] Privacy policy page is published and linked from Google consent screen
- [ ] Google consent screen passes brand verification
- [ ] Sign-in buttons are accessible (keyboard navigable, labeled, sufficient contrast)
