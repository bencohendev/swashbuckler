# Analytics Consent & GDPR Compliance

**Status:** Done

## Overview

Vercel Analytics (`@vercel/analytics`) and Speed Insights (`@vercel/speed-insights`) are integrated for anonymous usage data. This feature adds a proper consent mechanism that lets users opt in or out, and brings the privacy policy in line with GDPR requirements.

## Analytics Consent

### Behavior

- Consent is collected during onboarding via a checkbox in `NewUserDialog` (authenticated) and `GuestModeDialog` (guest)
- Choice is stored in `localStorage` key `swashbuckler:analyticsConsent`:
  - Not set (`pending`) → analytics **disabled** (opt-in model)
  - `accepted` → analytics enabled
  - `declined` → analytics disabled
- `AnalyticsProvider` conditionally renders `<Analytics />` and `<SpeedInsights />` only when consent is `accepted`

### Implementation

- **`AnalyticsConsent.tsx`** — exports `AnalyticsProvider` (conditional rendering), `ANALYTICS_CONSENT_KEY`, and `writeAnalyticsConsent`
- **`AnalyticsConsentToggle.tsx`** — checkbox component used in onboarding dialogs
- **`providers.tsx`** — renders `<AnalyticsProvider />` at the root

## GDPR Privacy Policy Updates

### Legal Basis for Processing (new section)

Added after "How We Use Your Data" in the privacy policy:

- **Contractual necessity** — account data and content storage required to provide the service
- **Legitimate interest** — anonymous analytics to improve the service
- **Consent** — future optional cookies/features will require explicit consent

### Your Rights (new section)

Added after "Data Retention & Deletion", covering GDPR Articles 15–22:

- Right of access
- Right to rectification
- Right to erasure
- Right to restrict processing
- Right to data portability
- Right to object

Users exercise rights via GitHub issue.

### Guest Mode Language Fix

The privacy policy previously stated "No data is sent to our servers in guest mode." Updated to clarify that no **content** data is sent — anonymous analytics may still apply unless declined during setup.

## Files

| File | Change |
|------|--------|
| `apps/web/src/shared/components/AnalyticsConsent.tsx` | Consent state management + conditional analytics rendering |
| `apps/web/src/features/onboarding/components/AnalyticsConsentToggle.tsx` | Checkbox toggle for onboarding dialogs |
| `apps/web/src/app/providers.tsx` | Render `<AnalyticsProvider />` |
| `apps/web/src/app/(public)/privacy/page.tsx` | Legal basis, user rights sections; guest mode clarification; updated date |
| `apps/web/src/app/(public)/terms/page.tsx` | Terms of Service page (added in prior commit) |
