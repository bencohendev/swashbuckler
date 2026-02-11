-- Convert built-in types (Page, Note) from global shared records to per-space, user-owned records.

-- First, update the unique index to be scoped per-space (instead of per-owner).
-- This allows the same slug (e.g. "page") to exist in multiple spaces for the same owner.
DROP INDEX IF EXISTS object_types_owner_slug_idx;
CREATE UNIQUE INDEX object_types_space_slug_idx
  ON object_types(COALESCE(space_id, '00000000-0000-0000-0000-000000000000'), slug);

-- For each existing space, create user-owned copies of Page and Note, remap references.
DO $$
DECLARE
  s RECORD;
  new_page_id UUID;
  new_note_id UUID;
BEGIN
  FOR s IN SELECT id, owner_id FROM spaces
  LOOP
    -- Create per-space Page type
    new_page_id := gen_random_uuid();
    INSERT INTO object_types (id, name, plural_name, slug, icon, fields, is_built_in, owner_id, space_id, sort_order)
    VALUES (new_page_id, 'Page', 'Pages', 'page', 'file-text', '[]', false, s.owner_id, s.id, 0);

    -- Create per-space Note type
    new_note_id := gen_random_uuid();
    INSERT INTO object_types (id, name, plural_name, slug, icon, fields, is_built_in, owner_id, space_id, sort_order)
    VALUES (new_note_id, 'Note', 'Notes', 'note', 'sticky-note', '[]', false, s.owner_id, s.id, 1);

    -- Remap objects
    UPDATE objects SET type_id = new_page_id WHERE space_id = s.id AND type_id = '00000000-0000-0000-0000-000000000001';
    UPDATE objects SET type_id = new_note_id WHERE space_id = s.id AND type_id = '00000000-0000-0000-0000-000000000002';

    -- Remap templates
    UPDATE templates SET type_id = new_page_id WHERE space_id = s.id AND type_id = '00000000-0000-0000-0000-000000000001';
    UPDATE templates SET type_id = new_note_id WHERE space_id = s.id AND type_id = '00000000-0000-0000-0000-000000000002';
  END LOOP;

  -- Remove global built-in types
  DELETE FROM object_types WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  );
END $$;

-- Update RLS policies: remove is_built_in conditions

DROP POLICY IF EXISTS "Anyone can read built-in types" ON object_types;
DROP POLICY IF EXISTS "Users can read accessible types" ON object_types;
CREATE POLICY "Users can read accessible types" ON object_types
  FOR SELECT USING (
    auth.uid() = owner_id
    OR (space_id IS NOT NULL AND user_has_space_access(auth.uid(), space_id))
  );

DROP POLICY IF EXISTS "Users can insert own types" ON object_types;
CREATE POLICY "Users can insert own types" ON object_types
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own types" ON object_types;
CREATE POLICY "Users can update own types" ON object_types
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own types" ON object_types;
CREATE POLICY "Users can delete own types" ON object_types
  FOR DELETE USING (auth.uid() = owner_id);

-- Update new-user trigger: create a Page type in the new space
CREATE OR REPLACE FUNCTION handle_new_user_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_space_id UUID;
BEGIN
  INSERT INTO public.spaces (name, owner_id) VALUES ('My Space', NEW.id) RETURNING id INTO new_space_id;
  INSERT INTO public.object_types (name, plural_name, slug, icon, fields, is_built_in, owner_id, space_id, sort_order)
  VALUES ('Page', 'Pages', 'page', 'file-text', '[]', false, NEW.id, new_space_id, 0);
  RETURN NEW;
END;
$$;
