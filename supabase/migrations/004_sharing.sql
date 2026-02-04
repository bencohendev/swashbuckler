-- Workspace sharing (Phase 5)
CREATE TABLE workspace_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(owner_id, shared_with_id),
  CHECK (owner_id != shared_with_id)
);

-- Share exclusions (hide specific types, objects, or fields)
CREATE TABLE share_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_share_id UUID NOT NULL REFERENCES workspace_shares(id) ON DELETE CASCADE,
  excluded_type TEXT,           -- e.g., 'note' to hide all notes
  excluded_object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
  excluded_field TEXT,          -- e.g., 'phone' to hide phone field
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Must specify exactly one exclusion type
  CHECK (
    (excluded_type IS NOT NULL AND excluded_object_id IS NULL AND excluded_field IS NULL) OR
    (excluded_type IS NULL AND excluded_object_id IS NOT NULL AND excluded_field IS NULL) OR
    (excluded_type IS NOT NULL AND excluded_object_id IS NULL AND excluded_field IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX workspace_shares_owner_id_idx ON workspace_shares(owner_id);
CREATE INDEX workspace_shares_shared_with_id_idx ON workspace_shares(shared_with_id);
CREATE INDEX share_exclusions_workspace_share_id_idx ON share_exclusions(workspace_share_id);

-- Enable RLS
ALTER TABLE workspace_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_exclusions ENABLE ROW LEVEL SECURITY;

-- Workspace shares policies
CREATE POLICY "Users can read shares they own or received" ON workspace_shares
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can create shares for their workspace" ON workspace_shares
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update shares they own" ON workspace_shares
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete shares they own" ON workspace_shares
  FOR DELETE USING (auth.uid() = owner_id);

-- Share exclusions policies
CREATE POLICY "Users can read exclusions for shares they own" ON share_exclusions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workspace_shares WHERE id = workspace_share_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can manage exclusions for shares they own" ON share_exclusions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workspace_shares WHERE id = workspace_share_id AND owner_id = auth.uid())
  );
