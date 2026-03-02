-- Database Audit: P1 fixes — indexes, triggers, and RLS hardening
-- Findings: S2, S3, S4, I1/I2/I3, I4, I5, I6, I7, I8, R4

-- ============================================================
-- S2: Harden objects INSERT policy — require owner_id = auth.uid()
-- ============================================================

-- Backfill any NULL owner_ids from space ownership before adding NOT NULL
UPDATE objects o
SET owner_id = s.owner_id
FROM spaces s
WHERE o.space_id = s.id AND o.owner_id IS NULL;

-- Safety net: delete any remaining orphaned objects with NULL owner_id
-- (e.g., if their space was deleted but cascade didn't clean up)
DELETE FROM objects WHERE owner_id IS NULL;

ALTER TABLE objects ALTER COLUMN owner_id SET NOT NULL;

-- Replace INSERT policy to enforce owner_id
DROP POLICY IF EXISTS "Users can insert objects in editable spaces" ON objects;
CREATE POLICY "Users can insert objects in editable spaces" ON objects
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND user_can_edit_space(auth.uid(), space_id)
  );

-- ============================================================
-- S3: Add updated_at trigger on spaces
-- ============================================================

CREATE TRIGGER spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- S4: Add updated_at trigger on space_shares
-- ============================================================

CREATE TRIGGER space_shares_updated_at
  BEFORE UPDATE ON space_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- I1/I2/I3: Composite index for space-scoped queries with type
-- filter and recency sort (covers the hot path)
-- ============================================================

CREATE INDEX objects_space_active_idx
  ON objects(space_id, type_id, updated_at DESC)
  WHERE is_deleted = false AND is_archived = false;

-- ============================================================
-- I4: Composite index for syncMentions() on every save
-- ============================================================

CREATE INDEX object_relations_source_type_idx
  ON object_relations(source_id, relation_type);

-- ============================================================
-- I5: Partial indexes on share_exclusions for is_object_excluded()
-- ============================================================

CREATE INDEX share_exclusions_type_id_idx
  ON share_exclusions(excluded_type_id) WHERE excluded_type_id IS NOT NULL;
CREATE INDEX share_exclusions_object_id_idx
  ON share_exclusions(excluded_object_id) WHERE excluded_object_id IS NOT NULL;

-- ============================================================
-- R4: Composite index on space_shares for user_has_space_access()
-- and user_can_edit_space()
-- ============================================================

CREATE INDEX space_shares_space_shared_idx
  ON space_shares(space_id, shared_with_id);

-- ============================================================
-- I6: Drop stale partial index from 021_global_types.sql
-- (superseded by COALESCE-based index in 021_unique_name_constraints)
-- ============================================================

DROP INDEX IF EXISTS object_types_owner_global_slug_idx;

-- ============================================================
-- I7: Drop redundant low-selectivity index on relation_type
-- (only 2 distinct values; source_type composite covers queries)
-- ============================================================

DROP INDEX IF EXISTS object_relations_type_idx;

-- ============================================================
-- I8: Replace full boolean index with partial for better efficiency
-- ============================================================

DROP INDEX IF EXISTS objects_is_deleted_idx;
CREATE INDEX objects_is_deleted_idx ON objects(id) WHERE is_deleted = true;
