-- Object relations for graph view and bi-directional links
CREATE TABLE object_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'link', -- link, mention, parent
  source_property TEXT,  -- which property created this relation
  context JSONB,         -- additional context (e.g., block_id for inline mentions)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate relations
  UNIQUE(source_id, target_id, relation_type, source_property),
  -- Prevent self-references
  CHECK (source_id != target_id)
);

-- Indexes
CREATE INDEX object_relations_source_id_idx ON object_relations(source_id);
CREATE INDEX object_relations_target_id_idx ON object_relations(target_id);
CREATE INDEX object_relations_type_idx ON object_relations(relation_type);

-- Enable RLS
ALTER TABLE object_relations ENABLE ROW LEVEL SECURITY;

-- Users can manage relations for objects they own
CREATE POLICY "Users can read relations for own objects" ON object_relations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM objects WHERE id = source_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM objects WHERE id = target_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can insert relations for own objects" ON object_relations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM objects WHERE id = source_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can delete relations for own objects" ON object_relations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM objects WHERE id = source_id AND owner_id = auth.uid())
  );
