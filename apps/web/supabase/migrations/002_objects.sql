-- Objects table (pages, notes, and future types)
CREATE TABLE objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('page', 'note')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES objects(id) ON DELETE SET NULL,
  icon TEXT,
  cover_image TEXT,
  properties JSONB NOT NULL DEFAULT '{}',
  content JSONB,
  is_template BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX objects_owner_id_idx ON objects(owner_id);
CREATE INDEX objects_parent_id_idx ON objects(parent_id);
CREATE INDEX objects_type_idx ON objects(type);
CREATE INDEX objects_is_deleted_idx ON objects(is_deleted);
CREATE INDEX objects_is_template_idx ON objects(is_template);
CREATE INDEX objects_updated_at_idx ON objects(updated_at DESC);

-- Full-text search index on title
CREATE INDEX objects_title_trgm_idx ON objects USING gin(title gin_trgm_ops);

-- Enable Row Level Security
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own objects
CREATE POLICY "Users can read own objects" ON objects
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can insert their own objects
CREATE POLICY "Users can insert own objects" ON objects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own objects
CREATE POLICY "Users can update own objects" ON objects
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own objects
CREATE POLICY "Users can delete own objects" ON objects
  FOR DELETE USING (auth.uid() = owner_id);
