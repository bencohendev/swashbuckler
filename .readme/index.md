# Swashbuckler — Documentation Index

## Project Overview

A knowledge management app for TTRPG world-building and general note-taking, with block-based editing, custom types/relations, and a visual graph view. Being expanded with a real-time chat system and eventually a full tabletop simulator.

## Monorepo Structure

```
apps/
├── web/          # Next.js 16 — main notes app
├── chat/         # SvelteKit — real-time chat (in development)
├── docs/         # Next.js + Fumadocs — documentation site
└── table/        # SvelteKit — tabletop simulator (planned)

packages/
└── design-tokens/  # Shared CSS custom properties + Tailwind preset
```

## App Areas

| Area | Index | Status | Stack |
|------|-------|--------|-------|
| [Notes App](notes-app/index.md) | Feature specs, bugs, planned work | Active | Next.js 16, React |
| [Chat](chat/index.md) | Real-time chat tied to shared spaces | In development | SvelteKit |
| [Tabletop Simulator](tabletop-sim/index.md) | Shared maps, dice, cards, character sheets | Planned | SvelteKit |

## Per-App Documentation

Each app area contains its own `api/`, `onboarding/`, `features/`, and `bugs/` folders as it grows.

| App | API Docs | Onboarding |
|-----|----------|------------|
| [Notes App](notes-app/index.md) | [notes-app/api/](notes-app/api/index.md) | [notes-app/onboarding/](notes-app/onboarding/index.md) |
| [Chat](chat/index.md) | — | — |
| [Tabletop Simulator](tabletop-sim/index.md) | — | — |

## Shared

| Section | Description |
|---------|-------------|
| [Archive](archive/) | Exploratory analyses and historical plans (cross-cutting) |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework (web) | Next.js 16 (App Router) |
| Framework (chat/table) | SvelteKit |
| Block Editor | Slate.js + Plate |
| Database | Supabase (PostgreSQL) — shared across all apps |
| Local Storage | Dexie (IndexedDB) — notes app only |
| Auth | Supabase Auth (Email + OAuth) — shared via same-origin cookies |
| Validation | Zod 4 |
| Styling | Tailwind CSS + `packages/design-tokens` |
| Graph | D3.js |
| State (web) | Zustand |
| Hosting | Vercel |

## Microfrontend Architecture

Chat and tabletop simulator are standalone SvelteKit apps deployed as separate Vercel projects. Vercel rewrites route `/chat/**` (and eventually `/table/**`) to their respective deployments. Auth is shared via Supabase session cookies — same origin (`swashbuckler.quest`), no extra configuration needed.

The main app embeds chat as a same-origin iframe in a collapsible right sidebar. A pop-out button opens it as a standalone window (`window.open('/chat/space/{id}')`).

Shared theming: CSS custom properties defined in `packages/design-tokens` are imported by both the Next.js and SvelteKit apps. Since iframe and parent share the same origin, CSS vars on `:root` apply inside the iframe automatically — no postMessage theming required.

## Archive

| Document | Description |
|----------|-------------|
| [v1 Implementation Plan](archive/v1-archive.md) | Original v1 plan (SvelteKit → Next.js rewrite) |
| [SvelteKit Migration Analysis](archive/sveltekit-migration-analysis.md) | Full-app migration analysis — concluded too costly due to Plate.js; microfrontend approach chosen instead |
