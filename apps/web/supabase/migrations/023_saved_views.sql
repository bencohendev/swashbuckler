-- Saved views: named filter/sort/view configurations per type
CREATE TABLE saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{"search":"","selectFilters":{},"checkboxFilters":{},"tagFilter":[],"dateFilters":{},"numberFilters":{},"textFilters":{}}',
  sort JSONB NOT NULL DEFAULT '{"field":"updated_at","direction":"desc"}',
  view_mode TEXT NOT NULL DEFAULT 'table',
  board_group_field_id UUID,
  is_default BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_saved_views_type ON saved_views(type_id);
CREATE INDEX idx_saved_views_owner ON saved_views(owner_id);

-- Only one default per (type, owner)
CREATE UNIQUE INDEX idx_saved_views_default
  ON saved_views(type_id, owner_id) WHERE is_default = true;

-- updated_at trigger (reuses existing function from 005_functions.sql)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON saved_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved views"
  ON saved_views FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
