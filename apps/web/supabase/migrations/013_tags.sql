-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, name)
);
CREATE INDEX tags_space_id_idx ON tags(space_id);
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Object-tag join table
CREATE TABLE object_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(object_id, tag_id)
);
CREATE INDEX object_tags_object_id_idx ON object_tags(object_id);
CREATE INDEX object_tags_tag_id_idx ON object_tags(tag_id);
ALTER TABLE object_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags
CREATE POLICY "tags_select" ON tags FOR SELECT USING (
  user_has_space_access(auth.uid(), space_id)
);

CREATE POLICY "tags_insert" ON tags FOR INSERT WITH CHECK (
  user_can_edit_space(auth.uid(), space_id)
);

CREATE POLICY "tags_update" ON tags FOR UPDATE USING (
  user_can_edit_space(auth.uid(), space_id)
);

CREATE POLICY "tags_delete" ON tags FOR DELETE USING (
  user_can_edit_space(auth.uid(), space_id)
);

-- RLS policies for object_tags
CREATE POLICY "object_tags_select" ON object_tags FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM objects o
    WHERE o.id = object_id
      AND user_has_space_access(auth.uid(), o.space_id)
  )
);

CREATE POLICY "object_tags_insert" ON object_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM objects o
    WHERE o.id = object_id
      AND user_can_edit_space(auth.uid(), o.space_id)
  )
);

CREATE POLICY "object_tags_delete" ON object_tags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM objects o
    WHERE o.id = object_id
      AND user_can_edit_space(auth.uid(), o.space_id)
  )
);

-- updated_at trigger for tags
CREATE TRIGGER set_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
