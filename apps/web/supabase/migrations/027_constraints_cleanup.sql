-- Database Audit: P2 fixes — CHECK constraints, case-insensitive tags,
-- realtime publication, dead column cleanup
-- Findings: S5, S7, S8, S9, S13, S15, RT1

-- ============================================================
-- S5: CHECK constraint on object_relations.relation_type
-- ============================================================

ALTER TABLE object_relations
  ADD CONSTRAINT object_relations_type_check
  CHECK (relation_type IN ('link', 'mention'));

-- ============================================================
-- S9: CHECK constraint on saved_views.view_mode
-- ============================================================

ALTER TABLE saved_views
  ADD CONSTRAINT saved_views_view_mode_check
  CHECK (view_mode IN ('table', 'list', 'card', 'board'));

-- ============================================================
-- S13: Case-insensitive tag uniqueness in Supabase
-- (Dexie already case-insensitive; Supabase was case-sensitive)
-- ============================================================

-- Deduplicate existing tags that differ only by case
DO $$
DECLARE
  dup RECORD;
  suffix INT;
  new_name TEXT;
BEGIN
  FOR dup IN
    SELECT t.id, t.name, t.space_id,
           ROW_NUMBER() OVER (PARTITION BY t.space_id, LOWER(t.name) ORDER BY t.created_at) AS rn
    FROM tags t
  LOOP
    IF dup.rn > 1 THEN
      suffix := dup.rn;
      new_name := dup.name || ' (' || suffix || ')';
      WHILE EXISTS (
        SELECT 1 FROM tags
        WHERE space_id = dup.space_id AND LOWER(name) = LOWER(new_name) AND id != dup.id
      ) LOOP
        suffix := suffix + 1;
        new_name := dup.name || ' (' || suffix || ')';
      END LOOP;
      UPDATE tags SET name = new_name WHERE id = dup.id;
    END IF;
  END LOOP;
END $$;

-- Drop old case-sensitive index and create case-insensitive one
DROP INDEX IF EXISTS tags_space_name_idx;
CREATE UNIQUE INDEX tags_space_name_lower_idx ON tags(space_id, LOWER(name));

-- ============================================================
-- S7: Make object_types.owner_id NOT NULL
-- (All types have owner_id since migration 012)
-- ============================================================

-- Safety backfill: set any NULL owner_id from space ownership
UPDATE object_types ot
SET owner_id = s.owner_id
FROM spaces s
WHERE ot.space_id = s.id AND ot.owner_id IS NULL;

-- Delete any orphaned types with no space and no owner
DELETE FROM object_types WHERE owner_id IS NULL AND space_id IS NULL;

ALTER TABLE object_types ALTER COLUMN owner_id SET NOT NULL;

-- ============================================================
-- S8: Drop dead is_built_in column from object_types
-- (Unused since migration 012)
-- ============================================================

-- Drop RLS policy that references is_built_in, then recreate without it
DROP POLICY IF EXISTS "Users can read accessible types" ON object_types;
CREATE POLICY "Users can read accessible types" ON object_types
  FOR SELECT USING (
    auth.uid() = owner_id
    OR (
      space_id IS NOT NULL AND user_has_space_access(auth.uid(), space_id)
    )
  );

ALTER TABLE object_types DROP COLUMN IF EXISTS is_built_in;

-- ============================================================
-- S15: Change saved_views default to gen_random_uuid()
-- (Consistency with all other tables)
-- ============================================================

ALTER TABLE saved_views ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ============================================================
-- RT1: Add saved_views to realtime publication
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE saved_views;
