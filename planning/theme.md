# Theme

**Status: Partial**

## Overview

Light / Dark / System theme support.

## Decisions

| Area | Decision |
|------|----------|
| Modes | Light / Dark / System detect |
| Toggle | UI toggle in settings or header |

## What's Done

- [x] Dark mode CSS variables defined in `globals.css` (`.dark` class)
- [x] Dark mode Tailwind classes used throughout components (`dark:bg-*`, `dark:text-*`)

## What's Left

- [ ] Theme toggle UI (button/dropdown)
- [ ] ThemeProvider integration (e.g., `next-themes`)
- [ ] System preference detection
- [ ] Theme persistence (localStorage)
