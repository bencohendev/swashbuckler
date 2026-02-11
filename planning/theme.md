# Theme

**Status: Implemented**

## Overview

Light / Dark / System theme support.

## Decisions

| Area | Decision |
|------|----------|
| Modes | Light / Dark / System detect |
| Toggle | Cycle button in header (light → dark → system) |
| Library | `next-themes` |

## What's Done

- [x] Dark mode CSS variables defined in `globals.css` (`.dark` class)
- [x] Dark mode Tailwind classes used throughout components (`dark:bg-*`, `dark:text-*`)
- [x] `next-themes` installed and `ThemeProvider` wired in `providers.tsx`
- [x] Theme toggle button in header (Sun / Moon / Monitor icons)
- [x] System preference detection via `next-themes`
- [x] Theme persistence via localStorage (automatic)
