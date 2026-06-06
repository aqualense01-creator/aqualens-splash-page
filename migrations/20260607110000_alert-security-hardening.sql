-- Alert security hardening: narrow owner actions and separate internal notes.

ALTER TABLE public.alert_notes
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('public', 'internal'));

CREATE INDEX IF NOT EXISTS alert_notes_public_alert_idx
  ON public.alert_notes(alert_id, created_at DESC)
  WHERE visibility = 'public';

UPDATE public.alert_notes n
SET visibility = 'public'
FROM public.alerts a
JOIN public.ponds p ON p.id = a.pond_id
JOIN public.farms f ON f.id = p.farm_id
WHERE n.alert_id = a.id
  AND n.author_id = f.owner_id;

CREATE OR REPLACE FUNCTION public.can_access_alert(_alert_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR public.has_role(_user_id, 'technician')
    OR public.has_role(_user_id, 'support')
    OR EXISTS (
      SELECT 1
      FROM public.alerts a
      JOIN public.ponds p ON p.id = a.pond_id
      JOIN public.farms f ON f.id = p.farm_id
      WHERE a.id = _alert_id
        AND public.is_active_user(_user_id)
        AND f.owner_id = _user_id
    )
$$;

CREATE OR REPLACE FUNCTION public.can_update_owned_alert(_alert_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.alerts a
    JOIN public.ponds p ON p.id = a.pond_id
    JOIN public.farms f ON f.id = p.farm_id
    WHERE a.id = _alert_id
      AND public.is_active_user(_user_id)
      AND f.owner_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Alerts write via pond" ON public.alerts;
DROP POLICY IF EXISTS "Alerts privileged write" ON public.alerts;
CREATE POLICY "Alerts privileged write" ON public.alerts
  FOR ALL
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'technician')
    OR public.has_role(auth.uid(), 'support')
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'technician')
    OR public.has_role(auth.uid(), 'support')
  );

DROP POLICY IF EXISTS "Alert notes read" ON public.alert_notes;
CREATE POLICY "Alert notes read" ON public.alert_notes
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'technician')
    OR public.has_role(auth.uid(), 'support')
    OR (
      visibility = 'public'
      AND public.can_update_owned_alert(alert_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Alert notes write" ON public.alert_notes;
CREATE POLICY "Alert notes write" ON public.alert_notes
  FOR INSERT WITH CHECK (
    public.is_active_user(auth.uid())
    AND author_id = auth.uid()
    AND (
      (
        public.is_admin(auth.uid())
        OR public.has_role(auth.uid(), 'technician')
        OR public.has_role(auth.uid(), 'support')
      )
      OR (
        visibility = 'public'
        AND public.can_update_owned_alert(alert_id, auth.uid())
      )
    )
  );

CREATE OR REPLACE FUNCTION public.acknowledge_alert(_alert_id uuid)
RETURNS public.alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _alert public.alerts;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to acknowledge alerts';
  END IF;

  IF NOT public.can_update_owned_alert(_alert_id, _actor) THEN
    RAISE EXCEPTION 'You do not have permission to update this alert';
  END IF;

  UPDATE public.alerts
  SET
    status = 'acknowledged',
    acknowledged_at = COALESCE(acknowledged_at, now()),
    acknowledged_by = COALESCE(acknowledged_by, _actor)
  WHERE id = _alert_id
  RETURNING * INTO _alert;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert not found';
  END IF;

  INSERT INTO public.alert_notes(alert_id, author_id, kind, body, visibility)
  VALUES (_alert_id, _actor, 'status_change', 'Alert acknowledged by farm user', 'public');

  RETURN _alert;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_alert(_alert_id uuid)
RETURNS public.alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _alert public.alerts;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to resolve alerts';
  END IF;

  IF NOT public.can_update_owned_alert(_alert_id, _actor) THEN
    RAISE EXCEPTION 'You do not have permission to update this alert';
  END IF;

  UPDATE public.alerts
  SET
    status = 'resolved',
    resolved_at = now(),
    resolved_by = _actor
  WHERE id = _alert_id
  RETURNING * INTO _alert;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert not found';
  END IF;

  INSERT INTO public.alert_notes(alert_id, author_id, kind, body, visibility)
  VALUES (_alert_id, _actor, 'resolution', 'Alert resolved by farm user', 'public');

  RETURN _alert;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.alert_notes WHERE author_id IS NULL) THEN
    ALTER TABLE public.alert_notes ALTER COLUMN author_id SET NOT NULL;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.acknowledge_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_alert(uuid) TO authenticated;
