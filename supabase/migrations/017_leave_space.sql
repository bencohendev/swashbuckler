-- Allow shared-space recipients to delete their own share record (leave space)
DROP POLICY "Owners can delete shares" ON space_shares;
CREATE POLICY "Owners and recipients can delete shares" ON space_shares
  FOR DELETE USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);
