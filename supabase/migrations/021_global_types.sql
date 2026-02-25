-- Fix the unique index on object_types so that global types (space_id IS NULL)
-- are scoped per-owner rather than sharing one slug namespace across all users.

DROP INDEX IF EXISTS object_types_space_slug_idx;

-- Space-scoped types: unique (space_id, slug) within each space
CREATE UNIQUE INDEX object_types_space_slug_idx
  ON object_types(space_id, slug)
  WHERE space_id IS NOT NULL;

-- Global types: unique (owner_id, slug) per user
CREATE UNIQUE INDEX object_types_owner_global_slug_idx
  ON object_types(owner_id, slug)
  WHERE space_id IS NULL;
