-- Add space-wide exclusions: allow exclusions scoped to an entire space
-- (apply to all shared users) in addition to per-user exclusions.

-- 1. Add space_id column and make space_share_id nullable
ALTER TABLE share_exclusions
  ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE CASCADE;

ALTER TABLE share_exclusions
  ALTER COLUMN space_share_id DROP NOT NULL;

-- 2. Drop old check constraint and add two named constraints
ALTER TABLE share_exclusions
  DROP CONSTRAINT IF EXISTS share_exclusions_check;

-- Scope check: exactly one of space_share_id or space_id must be set
ALTER TABLE share_exclusions
  ADD CONSTRAINT share_exclusions_scope_check
  CHECK (
    (space_share_id IS NOT NULL AND space_id IS NULL)
    OR (space_share_id IS NULL AND space_id IS NOT NULL)
  );

-- Kind check: type-only, object-only, or type+field
ALTER TABLE share_exclusions
  ADD CONSTRAINT share_exclusions_kind_check
  CHECK (
    (excluded_type_id IS NOT NULL AND excluded_object_id IS NULL AND excluded_field IS NULL) OR
    (excluded_type_id IS NULL AND excluded_object_id IS NOT NULL AND excluded_field IS NULL) OR
    (excluded_type_id IS NOT NULL AND excluded_object_id IS NULL AND excluded_field IS NOT NULL)
  );

-- 3. Partial index for space-wide exclusions
CREATE INDEX share_exclusions_space_id_idx
  ON share_exclusions(space_id)
  WHERE space_id IS NOT NULL;

-- 4. Update is_object_excluded to also match space-wide exclusions
CREATE OR REPLACE FUNCTION is_object_excluded(p_user_id UUID, p_object_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.share_exclusions se
    JOIN public.objects o ON o.id = p_object_id
    WHERE (
      -- Per-user exclusion (via space_share_id)
      (
        se.space_share_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.space_shares ss
          WHERE ss.id = se.space_share_id
            AND ss.shared_with_id = p_user_id
            AND ss.space_id = o.space_id
        )
      )
      OR
      -- Space-wide exclusion (via space_id) — applies to non-owners
      (
        se.space_id IS NOT NULL
        AND se.space_id = o.space_id
        AND NOT EXISTS (
          SELECT 1 FROM public.spaces s
          WHERE s.id = o.space_id AND s.owner_id = p_user_id
        )
        AND EXISTS (
          SELECT 1 FROM public.space_shares ss2
          WHERE ss2.space_id = o.space_id AND ss2.shared_with_id = p_user_id
        )
      )
    )
    AND (
      -- Type exclusion
      (se.excluded_type_id = o.type_id AND se.excluded_object_id IS NULL AND se.excluded_field IS NULL)
      OR
      -- Object exclusion
      (se.excluded_object_id = p_object_id)
    )
  );
$$;

-- 5. Drop and recreate RLS policies on share_exclusions to cover space_id-scoped rows

DROP POLICY IF EXISTS "Users can read exclusions for shares they own or received" ON share_exclusions;
DROP POLICY IF EXISTS "Owners can manage exclusions" ON share_exclusions;
DROP POLICY IF EXISTS "Owners can delete exclusions" ON share_exclusions;

-- SELECT: space owner can read all exclusions; shared users can read exclusions that affect them
CREATE POLICY "Users can read exclusions" ON share_exclusions
  FOR SELECT USING (
    -- Per-user exclusion: owner or recipient of the share
    (
      space_share_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_shares
        WHERE id = space_share_id AND (owner_id = auth.uid() OR shared_with_id = auth.uid())
      )
    )
    OR
    -- Space-wide exclusion: space owner or any shared user
    (
      space_id IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM space_shares WHERE space_id = share_exclusions.space_id AND shared_with_id = auth.uid())
      )
    )
  );

-- INSERT: only space owner can create exclusions
CREATE POLICY "Owners can create exclusions" ON share_exclusions
  FOR INSERT WITH CHECK (
    (
      space_share_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM space_shares WHERE id = space_share_id AND owner_id = auth.uid())
    )
    OR
    (
      space_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND owner_id = auth.uid())
    )
  );

-- DELETE: only space owner can remove exclusions
CREATE POLICY "Owners can remove exclusions" ON share_exclusions
  FOR DELETE USING (
    (
      space_share_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM space_shares WHERE id = space_share_id AND owner_id = auth.uid())
    )
    OR
    (
      space_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND owner_id = auth.uid())
    )
  );
