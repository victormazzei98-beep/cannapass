-- Add agent_status column to profiles for agent approval flow
-- Existing agents are grandfathered as 'approved'; new agents start as 'pending_approval'

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS agent_status TEXT
    CHECK (agent_status IN ('pending_approval', 'approved', 'rejected'));

-- Grandfather existing agents
UPDATE profiles
  SET agent_status = 'approved'
  WHERE role = 'agent' AND agent_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_agent_status ON profiles (agent_status)
  WHERE role = 'agent';
