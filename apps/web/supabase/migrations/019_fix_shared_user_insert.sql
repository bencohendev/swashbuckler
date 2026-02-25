-- Fix: ensure shared users with edit permission can create objects
-- Re-applies the user_can_edit_space function and INSERT policy from migration 011
-- (safe to run even if already applied — uses CREATE OR REPLACE and DROP IF EXISTS)

-- Re-create the helper function
CREATE OR REPLACE FUNCTION user_can_edit_space(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces WHERE id = p_space_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.space_shares
    WHERE space_id = p_space_id AND shared_with_id = p_user_id AND permission = 'edit'
  );
$$;

-- Drop any stale INSERT policies on objects and re-create the correct one
DROP POLICY IF EXISTS "Users can insert own objects" ON objects;
DROP POLICY IF EXISTS "Users can insert objects in editable spaces" ON objects;

CREATE POLICY "Users can insert objects in editable spaces" ON objects
  FOR INSERT WITH CHECK (
    user_can_edit_space(auth.uid(), space_id)
  );
