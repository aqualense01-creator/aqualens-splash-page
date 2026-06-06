-- Durable support ticket timeline and attachment records.

CREATE OR REPLACE FUNCTION public.uuid_or_null(_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN _value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_support_ticket(_ticket_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.is_admin(_user_id)
    OR public.has_role(_user_id, 'support')
    OR EXISTS (
      SELECT 1
      FROM public.support_tickets t
      LEFT JOIN public.farms f ON f.id = t.farm_id
      WHERE t.id = _ticket_id
        AND public.is_active_user(_user_id)
        AND (
          t.created_by = _user_id
          OR t.assigned_to = _user_id
          OR f.owner_id = _user_id
        )
    ),
    false
  )
$$;

DROP POLICY IF EXISTS "Tickets insert" ON public.support_tickets;
CREATE POLICY "Tickets insert" ON public.support_tickets
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'support')
    OR (public.is_active_user(auth.uid()) AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Tickets read" ON public.support_tickets;
CREATE POLICY "Tickets read" ON public.support_tickets
  FOR SELECT USING (public.can_access_support_ticket(id, auth.uid()));

DROP POLICY IF EXISTS "Tickets update" ON public.support_tickets;
CREATE POLICY "Tickets update" ON public.support_tickets
  FOR UPDATE USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'support')
    OR (public.is_active_user(auth.uid()) AND assigned_to = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'support')
    OR (public.is_active_user(auth.uid()) AND assigned_to = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.touch_support_ticket_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_touch_updated_at ON public.support_tickets;
CREATE TRIGGER support_ticket_touch_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_support_ticket_updated_at();

CREATE OR REPLACE FUNCTION public.validate_support_ticket_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pond_farm_id uuid;
  device_farm_id uuid;
  device_pond_id uuid;
BEGIN
  IF NEW.pond_id IS NOT NULL THEN
    SELECT farm_id INTO pond_farm_id
    FROM public.ponds
    WHERE id = NEW.pond_id;

    IF pond_farm_id IS NULL THEN
      RAISE EXCEPTION 'Support ticket pond does not exist.';
    END IF;

    IF NEW.farm_id IS NULL OR pond_farm_id <> NEW.farm_id THEN
      RAISE EXCEPTION 'Support ticket pond must belong to the selected farm.';
    END IF;
  END IF;

  IF NEW.device_id IS NOT NULL THEN
    SELECT farm_id, pond_id INTO device_farm_id, device_pond_id
    FROM public.devices
    WHERE id = NEW.device_id;

    IF device_farm_id IS NULL AND device_pond_id IS NULL THEN
      RAISE EXCEPTION 'Support ticket device does not exist or is not assigned.';
    END IF;

    IF NEW.farm_id IS NOT NULL AND device_farm_id IS NOT NULL AND device_farm_id <> NEW.farm_id THEN
      RAISE EXCEPTION 'Support ticket device must belong to the selected farm.';
    END IF;

    IF NEW.pond_id IS NOT NULL AND device_pond_id IS NOT NULL AND device_pond_id <> NEW.pond_id THEN
      RAISE EXCEPTION 'Support ticket device must belong to the selected pond.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_validate_scope ON public.support_tickets;
CREATE TRIGGER support_ticket_validate_scope
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_support_ticket_scope();

CREATE TABLE IF NOT EXISTS public.support_ticket_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('created','assignment','status_change','note','resolution','attachment')),
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_activities_ticket_created_idx
  ON public.support_ticket_activities(ticket_id, created_at DESC);

ALTER TABLE public.support_ticket_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support ticket activities read" ON public.support_ticket_activities;
CREATE POLICY "Support ticket activities read" ON public.support_ticket_activities
  FOR SELECT USING (public.can_access_support_ticket(ticket_id, auth.uid()));

DROP POLICY IF EXISTS "Support ticket activities insert" ON public.support_ticket_activities;
CREATE POLICY "Support ticket activities insert" ON public.support_ticket_activities
  FOR INSERT WITH CHECK (
    actor_id = auth.uid()
    AND public.can_access_support_ticket(ticket_id, auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.support_ticket_activities(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bucket text NOT NULL DEFAULT 'support-ticket-attachments',
  storage_key text NOT NULL,
  url text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, storage_key)
);

CREATE INDEX IF NOT EXISTS support_ticket_attachments_ticket_created_idx
  ON public.support_ticket_attachments(ticket_id, created_at DESC);

ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support ticket attachments read" ON public.support_ticket_attachments;
CREATE POLICY "Support ticket attachments read" ON public.support_ticket_attachments
  FOR SELECT USING (public.can_access_support_ticket(ticket_id, auth.uid()));

DROP POLICY IF EXISTS "Support ticket attachments insert" ON public.support_ticket_attachments;
CREATE POLICY "Support ticket attachments insert" ON public.support_ticket_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND public.can_access_support_ticket(ticket_id, auth.uid())
  );

DROP POLICY IF EXISTS "Support ticket attachments delete" ON public.support_ticket_attachments;
CREATE POLICY "Support ticket attachments delete" ON public.support_ticket_attachments
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'support')
  );

INSERT INTO public.support_ticket_activities (ticket_id, actor_id, kind, body, created_at)
SELECT
  t.id,
  t.created_by,
  'created',
  COALESCE(NULLIF(t.description, ''), 'Support ticket created.'),
  t.created_at
FROM public.support_tickets t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.support_ticket_activities a
  WHERE a.ticket_id = t.id
    AND a.kind = 'created'
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_support_ticket_select ON storage.objects;
CREATE POLICY storage_objects_support_ticket_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket = 'support-ticket-attachments'
    AND public.can_access_support_ticket(
      public.uuid_or_null((storage.foldername(key))[1]),
      public.uuid_or_null((SELECT auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS storage_objects_support_ticket_insert ON storage.objects;
CREATE POLICY storage_objects_support_ticket_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'support-ticket-attachments'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
    AND public.can_access_support_ticket(
      public.uuid_or_null((storage.foldername(key))[1]),
      public.uuid_or_null((SELECT auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS storage_objects_support_ticket_delete ON storage.objects;
CREATE POLICY storage_objects_support_ticket_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'support-ticket-attachments'
    AND (
      uploaded_by = (SELECT auth.jwt() ->> 'sub')
      OR public.is_admin(public.uuid_or_null((SELECT auth.jwt() ->> 'sub')))
      OR public.has_role(public.uuid_or_null((SELECT auth.jwt() ->> 'sub')), 'support')
    )
  );

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
