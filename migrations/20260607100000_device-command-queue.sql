-- Durable device command queue and device configuration state.

CREATE OR REPLACE FUNCTION public.can_access_device(_device_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _device_id IS NOT NULL
    AND _user_id IS NOT NULL
    AND (
      public.is_admin(_user_id)
      OR public.has_role(_user_id, 'technician')
      OR public.has_role(_user_id, 'support')
      OR EXISTS (
        SELECT 1
        FROM public.devices d
        JOIN public.farms f ON f.id = d.farm_id
        WHERE d.id = _device_id
          AND f.owner_id = _user_id
          AND public.is_active_user(_user_id)
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_device_commands(_device_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_device(_device_id, _user_id)
    AND (
      public.is_admin(_user_id)
      OR public.has_role(_user_id, 'technician')
    )
$$;

CREATE TABLE IF NOT EXISTS public.device_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  command_type text NOT NULL CHECK (
    command_type IN ('diagnostics', 'restart', 'config_update', 'maintenance_due', 'deactivate')
  ),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'sent', 'acknowledged', 'succeeded', 'failed', 'expired', 'cancelled')
  ),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  result jsonb,
  error_message text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS device_commands_device_created_idx
  ON public.device_commands(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS device_commands_pending_idx
  ON public.device_commands(status, expires_at)
  WHERE status IN ('queued', 'sent', 'acknowledged');
CREATE INDEX IF NOT EXISTS device_commands_requested_by_idx
  ON public.device_commands(requested_by, created_at DESC);

ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Device commands read" ON public.device_commands;
CREATE POLICY "Device commands read" ON public.device_commands
  FOR SELECT USING (public.can_access_device(device_id, auth.uid()));

DROP POLICY IF EXISTS "Device commands no direct insert" ON public.device_commands;
CREATE POLICY "Device commands no direct insert" ON public.device_commands
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Device commands no direct update" ON public.device_commands;
CREATE POLICY "Device commands no direct update" ON public.device_commands
  FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Device commands no direct delete" ON public.device_commands;
CREATE POLICY "Device commands no direct delete" ON public.device_commands
  FOR DELETE USING (false);

CREATE TABLE IF NOT EXISTS public.device_configurations (
  device_id uuid PRIMARY KEY REFERENCES public.devices(id) ON DELETE CASCADE,
  sampling_interval_seconds integer NOT NULL DEFAULT 300 CHECK (
    sampling_interval_seconds BETWEEN 30 AND 86400
  ),
  threshold_profile text NOT NULL DEFAULT 'default' CHECK (
    threshold_profile IN ('default', 'shrimp', 'hatchery', 'carp')
  ),
  version integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Device config read" ON public.device_configurations;
CREATE POLICY "Device config read" ON public.device_configurations
  FOR SELECT USING (public.can_access_device(device_id, auth.uid()));

DROP POLICY IF EXISTS "Device config manage" ON public.device_configurations;
CREATE POLICY "Device config manage" ON public.device_configurations
  FOR ALL USING (public.can_manage_device_commands(device_id, auth.uid()))
  WITH CHECK (public.can_manage_device_commands(device_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.enqueue_device_command(
  _device_id uuid,
  _command_type text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _idempotency_key text DEFAULT NULL
)
RETURNS public.device_commands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _key text := COALESCE(NULLIF(_idempotency_key, ''), gen_random_uuid()::text);
  _command public.device_commands;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to enqueue device commands';
  END IF;

  IF NOT public.can_manage_device_commands(_device_id, _actor) THEN
    RAISE EXCEPTION 'You do not have permission to manage this device';
  END IF;

  IF _command_type NOT IN ('diagnostics', 'restart', 'config_update', 'maintenance_due', 'deactivate') THEN
    RAISE EXCEPTION 'Unsupported device command type: %', _command_type;
  END IF;

  INSERT INTO public.device_commands (
    device_id,
    command_type,
    payload,
    requested_by,
    idempotency_key
  )
  VALUES (
    _device_id,
    _command_type,
    COALESCE(_payload, '{}'::jsonb),
    _actor,
    _key
  )
  ON CONFLICT (device_id, idempotency_key)
  DO UPDATE SET updated_at = public.device_commands.updated_at
  RETURNING * INTO _command;

  RETURN _command;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_device_assignment_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pond_farm_id uuid;
BEGIN
  IF NEW.pond_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.farm_id INTO _pond_farm_id
  FROM public.ponds p
  WHERE p.id = NEW.pond_id;

  IF _pond_farm_id IS NULL THEN
    RAISE EXCEPTION 'Assigned pond does not exist';
  END IF;

  IF NEW.farm_id IS NULL OR NEW.farm_id <> _pond_farm_id THEN
    RAISE EXCEPTION 'Assigned pond must belong to the selected farm';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_device_assignment_scope ON public.devices;
CREATE TRIGGER validate_device_assignment_scope
  BEFORE INSERT OR UPDATE OF farm_id, pond_id ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.validate_device_assignment_scope();

GRANT SELECT ON public.device_commands TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.device_configurations TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_device_command(uuid, text, jsonb, text) TO authenticated;
