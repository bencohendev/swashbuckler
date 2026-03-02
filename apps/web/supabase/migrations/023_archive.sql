-- Add archive support to objects, object_types, and spaces

ALTER TABLE objects
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE object_types
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE spaces
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN archived_at TIMESTAMPTZ;

-- Indexes for filtering archived items
CREATE INDEX idx_objects_is_archived ON objects(is_archived) WHERE is_archived = true;
CREATE INDEX idx_object_types_is_archived ON object_types(is_archived) WHERE is_archived = true;
CREATE INDEX idx_spaces_is_archived ON spaces(is_archived) WHERE is_archived = true;
