# Supabase Setup

## Running Migrations

Run these migrations in order in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql):

1. `migrations/001_extensions.sql` - Enable required PostgreSQL extensions
2. `migrations/002_objects.sql` - Create objects table with RLS policies
3. `migrations/003_object_relations.sql` - Create relations table for graph (Phase 6)
4. `migrations/004_sharing.sql` - Create sharing tables (Phase 5)
5. `migrations/005_functions.sql` - Create helper functions and triggers

**For quick testing, only migrations 001 and 002 are required.**

## Quick Setup (Minimum for Testing)

Copy and run this in the SQL Editor:

```sql
-- 001: Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 002: Objects table
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

CREATE INDEX objects_owner_id_idx ON objects(owner_id);
CREATE INDEX objects_is_deleted_idx ON objects(is_deleted);
CREATE INDEX objects_updated_at_idx ON objects(updated_at DESC);

ALTER TABLE objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own objects" ON objects
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own objects" ON objects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own objects" ON objects
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own objects" ON objects
  FOR DELETE USING (auth.uid() = owner_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER objects_updated_at
  BEFORE UPDATE ON objects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## Environment Variables

Make sure your `.env.local` has:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Guest Mode

The app also supports guest mode using local IndexedDB storage. No Supabase setup required - just use the app without signing in.
