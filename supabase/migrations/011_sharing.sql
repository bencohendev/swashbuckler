-- Per-space sharing: replace old unused workspace_shares with space-scoped sharing
-- Drop old unused tables from migration 004
DROP TABLE IF EXISTS share_exclusions CASCADE;
DROP TABLE IF EXISTS workspace_shares CASCADE;

-- ============================================================
-- New tables
-- ============================================================

CREATE TABLE space_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(space_id, shared_with_id),
  CHECK (owner_id != shared_with_id)
);

CREATE TABLE share_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_share_id UUID NOT NULL REFERENCES space_shares(id) ON DELETE CASCADE,
  excluded_type_id UUID REFERENCES object_types(id) ON DELETE CASCADE,
  excluded_object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
  excluded_field TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactly one exclusion kind: type-only, object-only, or type+field
  CHECK (
    (excluded_type_id IS NOT NULL AND excluded_object_id IS NULL AND excluded_field IS NULL) OR
    (excluded_type_id IS NULL AND excluded_object_id IS NOT NULL AND excluded_field IS NULL) OR
    (excluded_type_id IS NOT NULL AND excluded_object_id IS NULL AND excluded_field IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX space_shares_space_id_idx ON space_shares(space_id);
CREATE INDEX space_shares_owner_id_idx ON space_shares(owner_id);
CREATE INDEX space_shares_shared_with_id_idx ON space_shares(shared_with_id);
CREATE INDEX share_exclusions_space_share_id_idx ON share_exclusions(space_share_id);

-- Enable RLS
ALTER TABLE space_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_exclusions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions (SECURITY DEFINER, STABLE)
-- ============================================================

CREATE OR REPLACE FUNCTION user_has_space_access(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces WHERE id = p_space_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.space_shares WHERE space_id = p_space_id AND shared_with_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION user_can_edit_space(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces WHERE id = p_space_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.space_shares
    WHERE space_id = p_space_id AND shared_with_id = p_user_id AND permission = 'edit'
  );
$$;

CREATE OR REPLACE FUNCTION is_object_excluded(p_user_id UUID, p_object_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.share_exclusions se
    JOIN public.space_shares ss ON ss.id = se.space_share_id
    JOIN public.objects o ON o.id = p_object_id
    WHERE ss.shared_with_id = p_user_id
      AND ss.space_id = o.space_id
      AND (
        -- Type exclusion: exclude all objects of this type
        (se.excluded_type_id = o.type_id AND se.excluded_object_id IS NULL AND se.excluded_field IS NULL)
        OR
        -- Object exclusion: exclude this specific object
        (se.excluded_object_id = p_object_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT au.id, au.email::TEXT
  FROM auth.users au
  WHERE au.email = p_email
  LIMIT 1;
$$;

-- ============================================================
-- RLS policies for space_shares
-- ============================================================

CREATE POLICY "Users can read shares they own or received" ON space_shares
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Owners can create shares" ON space_shares
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update shares" ON space_shares
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete shares" ON space_shares
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================
-- RLS policies for share_exclusions
-- ============================================================

CREATE POLICY "Users can read exclusions for shares they own or received" ON share_exclusions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM space_shares
      WHERE id = space_share_id AND (owner_id = auth.uid() OR shared_with_id = auth.uid())
    )
  );

CREATE POLICY "Owners can manage exclusions" ON share_exclusions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM space_shares WHERE id = space_share_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete exclusions" ON share_exclusions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM space_shares WHERE id = space_share_id AND owner_id = auth.uid())
  );

-- ============================================================
-- Update RLS policies on existing tables to allow shared access
-- ============================================================

-- SPACES: drop old SELECT policy, add new one that includes shared spaces
DROP POLICY IF EXISTS "Users can read own spaces" ON spaces;
CREATE POLICY "Users can read accessible spaces" ON spaces
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM space_shares
      WHERE space_shares.space_id = spaces.id
        AND space_shares.shared_with_id = auth.uid()
    )
  );

-- OBJECTS: drop and recreate policies
DROP POLICY IF EXISTS "Users can read own objects" ON objects;
DROP POLICY IF EXISTS "Users can insert own objects" ON objects;
DROP POLICY IF EXISTS "Users can update own objects" ON objects;
DROP POLICY IF EXISTS "Users can delete own objects" ON objects;

CREATE POLICY "Users can read accessible objects" ON objects
  FOR SELECT USING (
    auth.uid() = owner_id
    OR (
      user_has_space_access(auth.uid(), space_id)
      AND NOT is_object_excluded(auth.uid(), id)
    )
  );

CREATE POLICY "Users can insert objects in editable spaces" ON objects
  FOR INSERT WITH CHECK (
    user_can_edit_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can update objects in editable spaces" ON objects
  FOR UPDATE USING (
    user_can_edit_space(auth.uid(), space_id)
  );

CREATE POLICY "Owners can delete objects" ON objects
  FOR DELETE USING (auth.uid() = owner_id);

-- OBJECT_TYPES: drop and recreate SELECT policy (keep "Anyone can read built-in types")
DROP POLICY IF EXISTS "Users can read own types" ON object_types;

CREATE POLICY "Users can read accessible types" ON object_types
  FOR SELECT USING (
    is_built_in
    OR auth.uid() = owner_id
    OR (
      space_id IS NOT NULL AND user_has_space_access(auth.uid(), space_id)
    )
  );

-- TEMPLATES: drop and recreate SELECT policy
DROP POLICY IF EXISTS "Users can read own templates" ON templates;

CREATE POLICY "Users can read accessible templates" ON templates
  FOR SELECT USING (
    auth.uid() = owner_id
    OR user_has_space_access(auth.uid(), space_id)
  );

-- OBJECT_RELATIONS: drop and recreate policies
DROP POLICY IF EXISTS "Users can read relations for own objects" ON object_relations;
DROP POLICY IF EXISTS "Users can insert relations for own objects" ON object_relations;
DROP POLICY IF EXISTS "Users can delete relations for own objects" ON object_relations;

CREATE POLICY "Users can read accessible relations" ON object_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE (o.id = source_id OR o.id = target_id)
        AND (
          o.owner_id = auth.uid()
          OR (user_has_space_access(auth.uid(), o.space_id) AND NOT is_object_excluded(auth.uid(), o.id))
        )
    )
  );

CREATE POLICY "Users can insert relations in editable spaces" ON object_relations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = source_id AND user_can_edit_space(auth.uid(), o.space_id)
    )
  );

CREATE POLICY "Owners can delete relations" ON object_relations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = source_id AND o.owner_id = auth.uid()
    )
  );
