# Entity Relationship Diagram

All tables in the Swashbuckler database.

## ER Diagram

```mermaid
erDiagram
    spaces {
        uuid id PK
        text name
        text icon
        uuid owner_id FK
        boolean is_archived
        timestamptz archived_at
        timestamptz created_at
        timestamptz updated_at
    }

    object_types {
        uuid id PK
        text name
        text plural_name
        text slug
        text icon
        text color
        jsonb fields
        boolean is_built_in
        uuid owner_id FK
        uuid space_id FK
        int sort_order
        boolean is_archived
        timestamptz archived_at
        timestamptz created_at
        timestamptz updated_at
    }

    objects {
        uuid id PK
        text title
        uuid type_id FK
        uuid owner_id FK
        uuid space_id FK
        uuid parent_id FK
        text icon
        text cover_image
        jsonb properties
        jsonb content
        boolean is_deleted
        timestamptz deleted_at
        boolean is_archived
        timestamptz archived_at
        timestamptz created_at
        timestamptz updated_at
    }

    templates {
        uuid id PK
        text name
        uuid type_id FK
        uuid owner_id FK
        uuid space_id FK
        text icon
        text cover_image
        jsonb properties
        jsonb content
        timestamptz created_at
        timestamptz updated_at
    }

    object_relations {
        uuid id PK
        uuid source_id FK
        uuid target_id FK
        text relation_type
        text source_property
        jsonb context
        timestamptz created_at
    }

    tags {
        uuid id PK
        uuid space_id FK
        text name
        text color
        timestamptz created_at
        timestamptz updated_at
    }

    object_tags {
        uuid id PK
        uuid object_id FK
        uuid tag_id FK
        timestamptz created_at
    }

    pins {
        uuid id PK
        uuid user_id FK
        uuid object_id FK
        timestamptz created_at
    }

    space_shares {
        uuid id PK
        uuid space_id FK
        uuid owner_id FK
        uuid shared_with_id FK
        text shared_with_email
        text permission
        timestamptz created_at
        timestamptz updated_at
    }

    share_exclusions {
        uuid id PK
        uuid space_share_id FK
        uuid space_id FK
        uuid excluded_type_id FK
        uuid excluded_object_id FK
        text excluded_field
        timestamptz created_at
    }

    spaces ||--o{ objects : "contains"
    spaces ||--o{ object_types : "contains"
    spaces ||--o{ templates : "contains"
    spaces ||--o{ tags : "contains"
    spaces ||--o{ space_shares : "shared via"

    object_types ||--o{ objects : "categorizes"
    object_types ||--o{ templates : "categorizes"

    objects ||--o{ object_relations : "source"
    objects ||--o{ object_relations : "target"
    objects ||--o{ object_tags : "tagged"
    objects ||--o{ pins : "pinned"
    objects ||--o| objects : "parent"

    tags ||--o{ object_tags : "applied"

    space_shares ||--o{ share_exclusions : "per-share exclusion"
    spaces ||--o{ share_exclusions : "space-wide exclusion"
```

## Table Details

### Core Entities

| Table | Description | Space-Scoped |
|-------|-------------|:---:|
| spaces | Workspaces that contain all other data | — |
| objects | Entries (pages, notes, custom types) | Yes |
| object_types | Type definitions with custom fields | Yes (nullable for global) |
| templates | Reusable entry templates | Yes |

### Relationships

| Table | Description | Space-Scoped |
|-------|-------------|:---:|
| object_relations | Links between entries (mention, link) | Via objects |
| object_tags | Many-to-many join for tags on entries | Via objects |

### Metadata

| Table | Description | Space-Scoped |
|-------|-------------|:---:|
| tags | Labels for cross-type categorization | Yes |
| pins | Per-user pinned entries | Via objects |

### Sharing

| Table | Description | Space-Scoped |
|-------|-------------|:---:|
| space_shares | Permission grants (view/edit) | Yes |
| share_exclusions | Content hidden from shared users | Yes |

## Indexes

### objects
- `type_id` — filter by type
- `parent_id` — hierarchical queries
- `space_id` — space scoping
- `is_deleted` — trash queries
- `is_archived` — archive queries
- `updated_at` — sort by recency

### object_types
- `(space_id, slug)` — unique per-space slug (case-insensitive)
- `owner_id` — owner queries
- `sort_order` — display ordering

### object_relations
- `source_id` — outgoing relations
- `target_id` — incoming relations
- `(source_id, target_id, relation_type, source_property)` — upsert uniqueness

### tags
- `(space_id, name)` — unique per-space tag name (case-insensitive)

## Cascade Rules (PostgreSQL)

| Parent | Child | On Delete |
|--------|-------|-----------|
| object_types | objects | CASCADE |
| object_types | templates | CASCADE |
| objects | object_relations (source) | CASCADE |
| objects | object_relations (target) | CASCADE |
| objects | object_tags | CASCADE |
| objects | pins | CASCADE |
| tags | object_tags | CASCADE |
| spaces | objects | CASCADE |
| spaces | object_types | CASCADE |
| spaces | tags | CASCADE |
| space_shares | share_exclusions | CASCADE |
