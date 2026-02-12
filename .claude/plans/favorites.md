# Pins (formerly Favorites)

**Status: Done**

## Overview

Pin individual objects for quick access. Pins are per-user (in shared spaces, each user has their own pins). Pinned objects appear in the dashboard and a dedicated sidebar section. Renamed from "Favorites" to "Pinned" throughout.

## Decisions

| Area | Decision |
|------|----------|
| Mechanism | Separate `pins` table (not a field on objects) |
| Scope | Per-user — each user has their own pins |
| Display | Pinned section on dashboard + sidebar |
| Naming | "Pinned" (not "Favorites") |
| Local mode | No `user_id` needed (single user) |

## Database

### Supabase — `supabase/migrations/014_pins.sql`
- `pins` table: id, user_id, object_id, created_at
- UNIQUE(user_id, object_id)
- RLS: users can only see/manage their own pins
- Indexes on user_id and object_id

### Dexie — Version 9
- `pins: 'id, object_id'` table
- Cascade delete pins when object is permanently deleted

## Data Layer

### Types — `src/shared/lib/data/types.ts`
- `pinSchema` (id, user_id, object_id, created_at)
- `Pin` type
- `PinsClient` interface: list, pin, unpin, isPinned

### Events — `src/shared/lib/data/events.ts`
- `'pins'` added to `EventChannel`

### Implementations
- `supabase.ts` — `createPinsClient` queries `pins` table filtered by current user
- `local.ts` — `createLocalPinsClient` queries local `pins` table (no user_id filter)

## UI Components

- `src/features/pins/hooks/usePins.ts` — hook returning pinnedIds Set, pin/unpin/toggle
- `src/features/pins/components/PinButton.tsx` — toggle button (filled/outline pin icon)
- `src/features/pins/components/PinnedObjects.tsx` — dashboard section
- `src/features/pins/components/PinnedSection.tsx` — sidebar collapsible section

## Integration Points

- ObjectEditor header — PinButton before trash button
- Sidebar ObjectItem — PinButton on hover
- Sidebar — PinnedSection above type sections
- Dashboard — replace "Favorites" placeholder with PinnedObjects

## What's Done

- [x] Supabase migration
- [x] Pin types and PinsClient interface
- [x] Supabase pins client
- [x] Local/Dexie pins client (v9)
- [x] usePins hook
- [x] PinButton component
- [x] PinnedObjects dashboard component
- [x] PinnedSection sidebar component
- [x] ObjectEditor integration
- [x] ObjectItem hover integration
- [x] Sidebar integration
- [x] Dashboard integration
