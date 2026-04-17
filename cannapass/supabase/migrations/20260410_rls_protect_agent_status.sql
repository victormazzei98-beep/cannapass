-- RLS: prevent agents from self-updating their own agent_status
-- Only admins (via service role) can change agent_status

-- Drop the permissive policy that allowed any field update
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with WITH CHECK blocking agent_status self-modification
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- agent_status must not change (keep whatever is in the DB)
      agent_status IS NOT DISTINCT FROM (
        SELECT agent_status FROM profiles WHERE id = auth.uid()
      )
    )
  );
