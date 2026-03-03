# Analytics Consent & GDPR Compliance

**Status:** Active

## Overview

Vercel Analytics (`@vercel/analytics`) and Speed Insights (`@vercel/speed-insights`) are integrated for anonymous usage data. This feature adds a proper consent mechanism that lets users opt out, and brings the privacy policy in line with GDPR requirements.

## Analytics Consent Banner

### Behavior

- A lightweight banner fixed to the bottom of the viewport appears on all pages (public and authenticated)
- Displays on first visit and persists until the user makes a choice
- Two actions: **Accept** and **Decline**
- Choice is stored in `localStorage` key `swashbuckler:analyticsConsent` with three effective states:
  - Not set → banner visible, analytics **enabled** (legitimate interest baseline)
  - `accepted` → banner hidden, analytics enabled
  - `declined` → banner hidden, analytics **disabled**
- The banner also conditionally renders `<Analytics />` and `<SpeedInsights />` — these components are only mounted when consent is not `declined`

### UI

- Follows the `GuestBanner` pattern: `max-h` collapse animation, muted background, accessible markup
- Text: brief note about anonymous analytics + link to privacy policy
- Two buttons: "OK" (accept) and "Decline" (opt out)
- Accessible: `role="status"`, `aria-label`, labeled buttons

### Implementation

- **`AnalyticsBanner.tsx`** — client component that owns both the consent UI and the conditional rendering of `<Analytics />` / `<SpeedInsights />`
- **`layout.tsx`** — `Analytics` and `SpeedInsights` imports removed; rendering delegated entirely to `AnalyticsBanner`
- **`providers.tsx`** — renders `<AnalyticsBanner />` alongside `<Toaster />`

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

The privacy policy previously stated "No data is sent to our servers in guest mode." This was misleading because Vercel Analytics runs for all visitors. Updated to clarify that no **content** data is sent — anonymous analytics may still apply unless declined via the consent banner.

## Files

| File | Change |
|------|--------|
| `apps/web/src/shared/components/AnalyticsBanner.tsx` | Consent banner + conditional analytics rendering |
| `apps/web/src/app/layout.tsx` | Remove `Analytics` / `SpeedInsights` imports and rendering |
| `apps/web/src/app/providers.tsx` | Render `<AnalyticsBanner />` |
| `apps/web/src/app/(public)/privacy/page.tsx` | Legal basis, user rights sections; guest mode clarification; updated date |
| `apps/web/src/app/(public)/terms/page.tsx` | Terms of Service page (added in prior commit) |
