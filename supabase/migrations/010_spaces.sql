-- Spaces table
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX spaces_owner_id_idx ON spaces(owner_id);
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own spaces" ON spaces
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own spaces" ON spaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own spaces" ON spaces
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own spaces" ON spaces
  FOR DELETE USING (auth.uid() = owner_id);

-- Add space_id to objects, object_types, templates
ALTER TABLE objects ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE CASCADE;
ALTER TABLE object_types ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE CASCADE;
ALTER TABLE templates ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE CASCADE;

-- Create a default space for each existing user and backfill
DO $$
DECLARE
  u RECORD;
  new_space_id UUID;
BEGIN
  FOR u IN SELECT DISTINCT owner_id FROM objects WHERE owner_id IS NOT NULL
  LOOP
    INSERT INTO spaces (name, owner_id) VALUES ('My Space', u.owner_id) RETURNING id INTO new_space_id;
    UPDATE objects SET space_id = new_space_id WHERE owner_id = u.owner_id;
    UPDATE object_types SET space_id = new_space_id WHERE owner_id = u.owner_id AND NOT is_built_in;
    UPDATE templates SET space_id = new_space_id WHERE owner_id = u.owner_id;
  END LOOP;
END $$;

-- Now make space_id NOT NULL on objects and templates (object_types keeps nullable for built-ins)
ALTER TABLE objects ALTER COLUMN space_id SET NOT NULL;
ALTER TABLE templates ALTER COLUMN space_id SET NOT NULL;

-- Indexes for space-scoped queries
CREATE INDEX objects_space_id_idx ON objects(space_id);
CREATE INDEX object_types_space_id_idx ON object_types(space_id);
CREATE INDEX templates_space_id_idx ON templates(space_id);

-- Auto-create default space on new user signup
CREATE OR REPLACE FUNCTION handle_new_user_space()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO spaces (name, owner_id) VALUES ('My Space', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_space
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_space();
