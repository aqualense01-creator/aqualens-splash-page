CREATE OR REPLACE FUNCTION public.can_access_farm(_farm_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR public.has_role(_user_id, 'technician')
    OR EXISTS (
      SELECT 1
      FROM public.farms f
      WHERE f.id = _farm_id
        AND public.is_active_user(_user_id)
        AND f.owner_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _user_id
        AND p.assigned_farm_id = _farm_id
        AND public.has_role(_user_id, 'farm_manager')
    )
$$;

CREATE OR REPLACE FUNCTION public.enforce_single_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF lower(COALESCE(OLD.email, '')) = 'aqualense01@gmail.com' THEN
      RAISE EXCEPTION 'The sole admin profile cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF lower(COALESCE(NEW.email, '')) = 'aqualense01@gmail.com' THEN
    NEW.account_status := 'active';
  END IF;

  IF TG_OP = 'UPDATE'
    AND lower(COALESCE(OLD.email, '')) = 'aqualense01@gmail.com'
    AND lower(COALESCE(NEW.email, '')) <> 'aqualense01@gmail.com'
  THEN
    RAISE EXCEPTION 'The sole admin email cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_admin_profile ON public.profiles;
CREATE TRIGGER enforce_single_admin_profile
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_admin_profile();

CREATE OR REPLACE FUNCTION public.admin_update_user_profile_role(
  _user_id uuid,
  _full_name text,
  _phone text,
  _email text,
  _district text,
  _language text,
  _account_status text,
  _assigned_farm_id uuid,
  _role public.app_role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text := lower(NULLIF(trim(_email), ''));
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access is required';
  END IF;

  IF _role = 'admin' AND normalized_email IS DISTINCT FROM 'aqualense01@gmail.com' THEN
    RAISE EXCEPTION 'Only the configured sole admin can hold the admin role';
  END IF;

  IF normalized_email = 'aqualense01@gmail.com'
    AND (_role <> 'admin' OR COALESCE(_account_status, 'active') <> 'active')
  THEN
    RAISE EXCEPTION 'The sole admin must keep admin access and active status';
  END IF;

  UPDATE public.profiles
  SET
    full_name = NULLIF(trim(_full_name), ''),
    phone = NULLIF(trim(_phone), ''),
    email = normalized_email,
    district = NULLIF(trim(_district), ''),
    language = CASE WHEN _language IN ('en', 'bn') THEN _language ELSE 'en' END,
    account_status = CASE
      WHEN normalized_email = 'aqualense01@gmail.com' THEN 'active'
      WHEN _account_status IN ('active', 'suspended', 'invited') THEN _account_status
      ELSE 'active'
    END,
    assigned_farm_id = _assigned_farm_id,
    updated_at = now()
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile was not found';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _user_id
    AND role <> _role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_profile_role(
  uuid, text, text, text, text, text, text, uuid, public.app_role
) TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "Owners + admins read farms" ON public.farms;
CREATE POLICY "Owners + admins read farms" ON public.farms FOR SELECT
  USING (public.can_access_farm(id, auth.uid()));

DROP POLICY IF EXISTS "Pond read via farm" ON public.ponds;
CREATE POLICY "Pond read via farm" ON public.ponds FOR SELECT USING (
  public.can_access_farm(farm_id, auth.uid())
);

DROP POLICY IF EXISTS "Device read via farm" ON public.devices;
CREATE POLICY "Device read via farm" ON public.devices FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'technician')
  OR (
    farm_id IS NOT NULL
    AND public.can_access_farm(farm_id, auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.ponds p
    WHERE p.id = devices.pond_id
      AND public.can_access_farm(p.farm_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Sensor read via device" ON public.sensors;
CREATE POLICY "Sensor read via device" ON public.sensors FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'technician')
  OR public.has_role(auth.uid(), 'support')
  OR EXISTS (
    SELECT 1
    FROM public.devices d
    LEFT JOIN public.ponds p ON p.id = d.pond_id
    WHERE d.id = sensors.device_id
      AND (
        (d.farm_id IS NOT NULL AND public.can_access_farm(d.farm_id, auth.uid()))
        OR (p.farm_id IS NOT NULL AND public.can_access_farm(p.farm_id, auth.uid()))
      )
  )
);

DROP POLICY IF EXISTS "Readings read via pond" ON public.readings;
CREATE POLICY "Readings read via pond" ON public.readings FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.ponds p
    WHERE p.id = readings.pond_id
      AND public.can_access_farm(p.farm_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Alerts read via pond" ON public.alerts;
CREATE POLICY "Alerts read via pond" ON public.alerts FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'technician')
  OR public.has_role(auth.uid(), 'support')
  OR (
    pond_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.ponds p
      WHERE p.id = alerts.pond_id
        AND public.can_access_farm(p.farm_id, auth.uid())
    )
  )
  OR (
    pond_id IS NULL
    AND device_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.devices d
      LEFT JOIN public.ponds p ON p.id = d.pond_id
      WHERE d.id = alerts.device_id
        AND (
          (d.farm_id IS NOT NULL AND public.can_access_farm(d.farm_id, auth.uid()))
          OR (p.farm_id IS NOT NULL AND public.can_access_farm(p.farm_id, auth.uid()))
        )
    )
  )
);

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
      WHERE a.id = _alert_id
        AND public.can_access_farm(p.farm_id, _user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.alerts a
      JOIN public.devices d ON d.id = a.device_id
      LEFT JOIN public.ponds p ON p.id = d.pond_id
      WHERE a.id = _alert_id
        AND a.pond_id IS NULL
        AND (
          (d.farm_id IS NOT NULL AND public.can_access_farm(d.farm_id, _user_id))
          OR (p.farm_id IS NOT NULL AND public.can_access_farm(p.farm_id, _user_id))
        )
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
    WHERE a.id = _alert_id
      AND public.can_access_farm(p.farm_id, _user_id)
      AND NOT (
        public.is_admin(_user_id)
        OR public.has_role(_user_id, 'technician')
        OR public.has_role(_user_id, 'support')
      )
  )
$$;
