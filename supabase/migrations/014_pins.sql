-- Per-user object pins for quick access
CREATE TABLE pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, object_id)
);

CREATE INDEX pins_user_id_idx ON pins(user_id);
CREATE INDEX pins_object_id_idx ON pins(object_id);

ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own pins
CREATE POLICY "Users can view own pins" ON pins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pins" ON pins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own pins" ON pins FOR DELETE USING (auth.uid() = user_id);
