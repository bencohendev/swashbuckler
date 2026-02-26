# API Documentation — Overview

Internal developer documentation for the Swashbuckler data layer.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Block Editor | Slate.js + Plate |
| Database | Supabase (PostgreSQL) |
| Local Storage | Dexie (IndexedDB) |
| Auth | Supabase Auth (Email + OAuth) |
| Validation | Zod 4 |
| Caching | TanStack Query v5 |
| State | Zustand |
| Realtime | Supabase Realtime + BroadcastChannel |
| Collaboration | Yjs CRDT |

## Architecture

```mermaid
graph TB
    subgraph UI["UI Layer"]
        C[React Components]
    end

    subgraph Hooks["Feature Hooks"]
        UO[useObjects]
        UT[useObjectTypes]
        UTM[useTemplates]
        UR[useObjectRelations]
        UTG[useTags]
        UP[usePins]
        US[useSpaceShares]
        UGS[useGlobalSearch]
        UGD[useGraphData]
    end

    subgraph Cache["Cache Layer"]
        TQ[TanStack Query]
        QK[Query Keys]
    end

    subgraph Data["Data Client Interface"]
        DC[DataClient]
        OC[ObjectsClient]
        OTC[ObjectTypesClient]
        GOT[GlobalObjectTypesClient]
        TC[TemplatesClient]
        RC[RelationsClient]
        SC[SpacesClient]
        SHC[SharingClient]
        TGC[TagsClient]
        PC[PinsClient]
    end

    subgraph Storage["Storage Backends"]
        SB[(Supabase / PostgreSQL)]
        DX[(Dexie / IndexedDB)]
    end

    subgraph Sync["Sync Layer"]
        EV[Event System]
        BC[BroadcastChannel]
        RT[Supabase Realtime]
    end

    C --> Hooks
    Hooks --> TQ
    TQ --> QK
    TQ --> DC
    DC --> OC & OTC & GOT & TC & RC & SC & SHC & TGC & PC
    OC & OTC & GOT & TC & RC & SC & SHC & TGC & PC --> SB
    OC & OTC & GOT & TC & RC & SC & SHC & TGC & PC --> DX

    EV --> TQ
    BC --> EV
    RT --> EV
    Hooks -.->|emit after mutation| EV
    EV -.->|postMessage| BC
```

## Data Flow

### Read Path

```mermaid
sequenceDiagram
    participant C as Component
    participant H as Hook
    participant TQ as TanStack Query
    participant DC as DataClient
    participant DB as Storage

    C->>H: render / mount
    H->>TQ: useQuery(queryKey, queryFn)
    alt Cache hit (< 30s stale)
        TQ-->>H: cached data
    else Cache miss or stale
        TQ->>DC: client.subclient.method()
        DC->>DB: Supabase query / Dexie query
        DB-->>DC: rows
        DC-->>TQ: DataResult / DataListResult
        TQ-->>H: fresh data
    end
    H-->>C: { data, isLoading, error }
```

### Write Path

```mermaid
sequenceDiagram
    participant C as Component
    participant H as Hook
    participant DC as DataClient
    participant DB as Storage
    participant EV as Event System
    participant TQ as TanStack Query
    participant BC as BroadcastChannel
    participant OT as Other Tabs

    C->>H: mutation (create/update/delete)
    H->>DC: client.subclient.method()
    DC->>DB: INSERT / UPDATE / DELETE
    DB-->>DC: result
    DC-->>H: DataResult
    H->>EV: emit(channel)
    EV->>TQ: invalidateQueries(prefix)
    TQ->>TQ: refetch stale queries
    EV->>BC: postMessage(channel)
    BC->>OT: channel name
    OT->>TQ: invalidateQueries(prefix)
```

## Cache Configuration

| Setting | Value |
|---------|-------|
| Stale time | 30 seconds |
| GC time | 5 minutes |
| Refetch on focus | Disabled |
| Retry | 1 attempt |

## Key Files

| File | Purpose |
|------|---------|
| `src/shared/lib/data/types.ts` | DataClient interface, all schemas, all sub-client interfaces |
| `src/shared/lib/data/supabase.ts` | Supabase implementation of DataClient |
| `src/shared/lib/data/local.ts` | Dexie (local) implementation of DataClient |
| `src/shared/lib/data/DataProvider.tsx` | React context, storage mode selection, migration |
| `src/shared/lib/data/SpaceProvider.tsx` | Space management, permission tracking |
| `src/shared/lib/data/queryKeys.ts` | TanStack Query key factory |
| `src/shared/lib/data/events.ts` | Event system, cross-tab BroadcastChannel |
| `src/shared/lib/data/realtime.ts` | Supabase Realtime subscription |

## Documentation Index

| Document | Contents |
|----------|----------|
| [Data Client](data-client.md) | DataClient interface, all 9 sub-clients, method signatures |
| [Hooks](hooks.md) | Feature-level data hooks, signatures, patterns |
| [Query Keys](query-keys.md) | TanStack Query key factory, invalidation strategy |
| [Events](events.md) | Event system, cross-tab sync, Supabase Realtime |
| [RPC Functions](rpc-functions.md) | Supabase SQL functions, triggers, migration index |
| [Auth](auth.md) | Authentication flow, session management, migration |
| [Permissions](permissions.md) | Space sharing, permission model, exclusions |
| [Storage](storage.md) | Supabase vs Dexie implementation comparison |
| [Entity Diagram](entity-diagram.md) | Entity relationship diagram, table schemas |
