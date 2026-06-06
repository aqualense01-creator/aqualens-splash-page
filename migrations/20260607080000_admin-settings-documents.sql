-- Durable admin settings configuration documents.

CREATE TABLE IF NOT EXISTS public.admin_settings_documents (
  key text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin settings documents read" ON public.admin_settings_documents;
CREATE POLICY "Admin settings documents read" ON public.admin_settings_documents
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'support')
  );

DROP POLICY IF EXISTS "Admin settings documents write" ON public.admin_settings_documents;
CREATE POLICY "Admin settings documents write" ON public.admin_settings_documents
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_admin_settings_document_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_settings_documents_touch_updated_at ON public.admin_settings_documents;
CREATE TRIGGER admin_settings_documents_touch_updated_at
  BEFORE UPDATE ON public.admin_settings_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_admin_settings_document_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_settings_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  detail text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_settings_change_logs_created_idx
  ON public.admin_settings_change_logs(created_at DESC);

ALTER TABLE public.admin_settings_change_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin settings logs read" ON public.admin_settings_change_logs;
CREATE POLICY "Admin settings logs read" ON public.admin_settings_change_logs
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'support')
  );

DROP POLICY IF EXISTS "Admin settings logs insert" ON public.admin_settings_change_logs;
CREATE POLICY "Admin settings logs insert" ON public.admin_settings_change_logs
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin settings logs delete" ON public.admin_settings_change_logs;
CREATE POLICY "Admin settings logs delete" ON public.admin_settings_change_logs
  FOR DELETE USING (public.is_admin(auth.uid()));
