# Settings Hub

**Status:** Done

## Overview

The `/settings` page is split into two labeled sections — **Account** and **Space** — so users can immediately tell which settings affect their whole account vs. the current space.

## Sections

### Account

Static heading. Contains:

- **Account** — profile, security, data export
- **Spaces** — create, rename, archive, delete spaces

### Space (dynamic heading)

Heading shows the current space's icon and name (falls back to "Space" while loading). Contains:

- **Appearance** — themes and color schemes
- **Templates** — manage entry templates
- **Types** — types and their properties
- **Sharing** — collaborator invites and permissions

## Implementation Details

- Page is a client component (`'use client'`) because it calls `useCurrentSpace()`
- Section headings are `<h2>` with `aria-labelledby`; card headings are `<h3>`
- A local `SettingsCard` component renders each card link to avoid duplication
- Settings items are split into `accountItems` and `spaceItems` arrays

## Key Files

- `apps/web/src/app/(main)/settings/page.tsx` — hub page
- `apps/docs/content/docs/settings.mdx` — user-facing documentation
