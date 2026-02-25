# Social Login (Google & GitHub OAuth)

**Status: Not started**

## Overview

Add Google and GitHub as OAuth sign-in options alongside the existing email/password flow. Supabase Auth has built-in support for both providers — implementation is configuration + UI.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| OAuth providers | Google + GitHub | Covers most users; both free, both supported natively by Supabase |
| Token handling | Supabase-managed | We never see or store OAuth tokens — Supabase handles the full flow |
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

Minimal, because Supabase handles the OAuth token exchange and session management. The app only receives basic profile data (email, name, avatar URL) and never touches raw OAuth tokens.

## Implementation

### Setup (Supabase dashboard)

1. Create Google OAuth credentials in Google Cloud Console
2. Create GitHub OAuth App in GitHub developer settings
3. Add client IDs and secrets to Supabase Auth provider config
4. Configure redirect URLs

### Key files (estimated)

| File | Role |
|------|------|
| `src/features/auth/components/LoginForm.tsx` | Add Google/GitHub sign-in buttons |
| `src/features/auth/components/SignupForm.tsx` | Add Google/GitHub sign-up buttons |
| `src/app/auth/callback/route.ts` | Already exists — handles OAuth redirect |
| `src/shared/lib/data/supabase.ts` | `signInWithOAuth()` calls |

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
