# Landing Page

**Status:** Done

## Overview

Marketing landing page shown to unauthenticated first-time visitors. Authenticated users and returning guests bypass it and go straight to the dashboard.

## Route

`/landing` inside the `(public)` route group. The middleware redirects unauthenticated users from `/` to `/landing`; authenticated users or those with a guest cookie go to `/dashboard`.

## Sections

### Header

- "Swashbuckler" text logo (left) and "Sign In" link (right)

### Hero

- Heading: "Your personal knowledge base"
- Subheading: "Organize ideas with a block editor, custom types, and a visual graph."
- Two CTAs:
  - **Get Started** (primary) — links to `/signup`
  - **Try as Guest** (secondary) — sets `swashbuckler-guest=1` cookie (1-year expiry) and redirects to `/dashboard`

### Feature Highlights

4-column responsive grid (1 col mobile, 2 tablet, 4 desktop):

1. **Block Editor** — Rich text with slash commands, mentions, tables, code blocks
2. **Custom Types** — Define entry types with custom fields and templates
3. **Knowledge Graph** — Visualize connections between entries
4. **Real-time Collaboration** — Share spaces and edit together in real time

Each card has a Lucide icon, title, and description.

### Footer

- "© Swashbuckler" copyright
- Link to docs site

## Middleware Routing

| User state | Visiting `/` | Visiting `/landing` |
|---|---|---|
| Unauthenticated, no guest cookie | → `/landing` | Allowed |
| Authenticated or guest cookie | → `/dashboard` | → `/dashboard` |

## Key Files

- `apps/web/src/app/(public)/landing/page.tsx` — page component
- `apps/web/src/app/(public)/landing/GuestButton.tsx` — guest cookie + redirect
- `apps/web/src/app/(public)/layout.tsx` — public layout wrapper
- `apps/web/src/shared/lib/supabase/middleware.ts` — redirect logic
