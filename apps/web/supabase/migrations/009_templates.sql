-- Create templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID NOT NULL REFERENCES object_types(id),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  icon TEXT,
  cover_image TEXT,
  properties JSONB NOT NULL DEFAULT '{}',
  content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX templates_owner_id_idx ON templates(owner_id);
CREATE INDEX templates_type_id_idx ON templates(type_id);
CREATE INDEX templates_updated_at_idx ON templates(updated_at DESC);

-- Migrate existing template objects to the new table
INSERT INTO templates (id, name, type_id, owner_id, icon, cover_image, properties, content, created_at, updated_at)
SELECT id, title, type_id, owner_id, icon, cover_image, properties, content, created_at, updated_at
FROM objects
WHERE is_template = true AND is_deleted = false;

-- Delete migrated template objects from objects table
DELETE FROM objects WHERE is_template = true;

-- Remove is_template column and index from objects
DROP INDEX IF EXISTS objects_is_template_idx;
ALTER TABLE objects DROP COLUMN is_template;

-- RLS for templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own templates" ON templates
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own templates" ON templates
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own templates" ON templates
  FOR DELETE USING (auth.uid() = owner_id);

-- Updated_at trigger
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
