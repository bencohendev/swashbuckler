# Tabletop Simulator — Documentation Index

**App:** `apps/table` (SvelteKit)
**Stack:** SvelteKit, Supabase Realtime, Canvas/WebGL, shared design tokens
**Status:** Planned — not started

## Overview

A browser-based tabletop RPG simulator integrated with Swashbuckler spaces. Think Roll20 or Foundry VTT: shared map canvas, dice, tokens, cards, character sheets with macros, and chat. Built on the same Supabase project as the notes app and chat, sharing auth and real-time infrastructure.

## Planned Feature Areas

| Area | Description |
|------|-------------|
| Shared Map Canvas | Collaborative drawing canvas with fog of war, grid, tokens |
| Dice Roller | Full TTRPG dice notation (extends chat dice roller) |
| Character Sheets | Structured sheets with property fields + macro support |
| Cards | Deck builder, hand management, draw/discard piles |
| Initiative Tracker | Turn order management synced to all players |
| Chat | Shares infrastructure with the chat app; in-table whisper rolls, GM commands |
| Asset Library | Token images, map tiles, card art — stored in Supabase storage |
| Scene Management | Multiple scenes per space, GM controls visibility |

## Architecture Notes

- Same SvelteKit + same-origin deployment pattern as `apps/chat`
- Canvas rendering: evaluate Pixi.js (WebGL) vs raw Canvas2D based on complexity needs
- Real-time sync: Supabase Realtime for token positions, initiative, dice results
- Character sheet data: stored as `objects` in the notes app data model (types + properties) — sheets are just a special view of existing entry data
- Shares `packages/design-tokens` for theming consistency

## Dependencies on Chat

The tabletop simulator will reuse or closely mirror the chat infrastructure — dice roller logic, message types, whisper system, and Supabase Realtime subscriptions should be designed in chat with this reuse in mind.
