-- Object types table
CREATE TABLE object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'file',
  color TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique slug per owner (NULL owner coalesced for built-in types)
CREATE UNIQUE INDEX object_types_owner_slug_idx
  ON object_types(COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'), slug);

CREATE INDEX object_types_owner_id_idx ON object_types(owner_id);

-- Insert built-in types with well-known UUIDs
INSERT INTO object_types (id, name, slug, icon, fields, is_built_in, owner_id, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Page', 'page', 'file-text', '[]', true, NULL, 0),
  ('00000000-0000-0000-0000-000000000002', 'Note', 'note', 'sticky-note', '[]', true, NULL, 1);

-- Add type_id column to objects (nullable initially for migration)
ALTER TABLE objects ADD COLUMN type_id UUID REFERENCES object_types(id);

-- Migrate existing data
UPDATE objects SET type_id = '00000000-0000-0000-0000-000000000001' WHERE type = 'page';
UPDATE objects SET type_id = '00000000-0000-0000-0000-000000000002' WHERE type = 'note';

-- Make type_id NOT NULL after migration
ALTER TABLE objects ALTER COLUMN type_id SET NOT NULL;

-- Drop old type column (removes CHECK constraint and index automatically)
DROP INDEX IF EXISTS objects_type_idx;
ALTER TABLE objects DROP COLUMN type;

-- Add index on new column
CREATE INDEX objects_type_id_idx ON objects(type_id);

-- RLS for object_types
ALTER TABLE object_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read built-in types" ON object_types
  FOR SELECT USING (is_built_in = true);

CREATE POLICY "Users can read own types" ON object_types
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own types" ON object_types
  FOR INSERT WITH CHECK (auth.uid() = owner_id AND is_built_in = false);

CREATE POLICY "Users can update own types" ON object_types
  FOR UPDATE USING (auth.uid() = owner_id AND is_built_in = false);

CREATE POLICY "Users can delete own types" ON object_types
  FOR DELETE USING (auth.uid() = owner_id AND is_built_in = false);

-- Updated_at trigger
CREATE TRIGGER object_types_updated_at
  BEFORE UPDATE ON object_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
