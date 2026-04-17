-- Update handle_new_user trigger to set pending_approval for new agent signups
-- New agents must be approved by an admin before accessing the agent portal

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, agent_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'agent'
      THEN 'pending_approval'
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
