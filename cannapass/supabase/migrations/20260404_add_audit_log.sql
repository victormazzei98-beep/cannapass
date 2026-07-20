CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_admin_created ON public.audit_log (admin_id, created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_log
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert audit logs"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (is_admin());
