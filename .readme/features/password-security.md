# Password Security

**Status:** Done

## Overview

Strengthens password handling across the app: a visual strength meter on signup and change-password forms, an 8-character minimum (up from 6), and client-side rate limiting on the login form after repeated failures.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Strength algorithm | Custom heuristic (length tiers + character diversity) | Lightweight, no library needed. zxcvbn adds ~400KB for a personal app |
| Composition rules | None enforced | NIST SP 800-63B recommends against composition rules — length matters more |
| Minimum length | 8 characters | Reasonable minimum per NIST guidelines |
| Rate limiting | Client-side cooldown (5 failures → 30s, 10+ → 60s) | UX protection; Supabase has server-side rate limiting built in |
| Strength meter scope | Signup + change password | Both password-entry surfaces get the same feedback |

## Strength Scoring

Five possible points, clamped to 1–4 for any non-empty password:

| Criterion | Points |
|-----------|--------|
| Length ≥ 8 | +1 |
| Length ≥ 12 | +1 |
| Mixed case (upper + lower) | +1 |
| Contains digit | +1 |
| Contains special character | +1 |

| Score | Label | Color |
|-------|-------|-------|
| 1 | Weak | Red |
| 2 | Fair | Amber |
| 3 | Strong | Green |
| 4 | Very strong | Green |

## Rate Limiting

- Tracks failed login attempts in component state (resets on page refresh)
- After 5 failures: 30-second cooldown with countdown
- After 10+ failures: 60-second cooldown
- Submit button disabled during cooldown, shows "Try again in Ns"
- Amber warning message with `role="status"` for screen reader announcements

## Files

| File | Role |
|------|------|
| `src/features/auth/lib/passwordStrength.ts` | Pure scoring function + types |
| `src/features/auth/components/PasswordStrengthMeter.tsx` | Visual 4-bar meter component |
| `src/features/auth/components/SignupForm.tsx` | Meter integration, 8-char min |
| `src/features/auth/components/LoginForm.tsx` | Rate limiting with countdown |
| `src/features/account/components/PasswordSection.tsx` | Meter integration, 8-char min |
| `tests/unit/auth/passwordStrength.test.ts` | 12 unit tests for scoring |
