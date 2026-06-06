-- Production hardening: active-account checks, safer write policies, and hot-path indexes.

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND COALESCE(
      (SELECT p.account_status = 'active' FROM public.profiles p WHERE p.id = _user_id),
      false
    )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_user(_user_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_user(_user_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
    )
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_protected_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF OLD.id = auth.uid()
    AND (
      OLD.email IS DISTINCT FROM NEW.email
      OR OLD.account_status IS DISTINCT FROM NEW.account_status
      OR OLD.assigned_farm_id IS DISTINCT FROM NEW.assigned_farm_id
      OR OLD.last_active_at IS DISTINCT FROM NEW.last_active_at
    )
  THEN
    RAISE EXCEPTION 'Protected profile fields can only be changed by admins';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_protected_field_changes ON public.profiles;
CREATE TRIGGER prevent_profile_protected_field_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_protected_field_changes();

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (public.is_active_user(auth.uid()) AND auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (public.is_active_user(auth.uid()) AND auth.uid() = id)
  WITH CHECK (public.is_active_user(auth.uid()) AND auth.uid() = id);

DROP POLICY IF EXISTS "Owners + admins read farms" ON public.farms;
CREATE POLICY "Owners + admins read farms" ON public.farms FOR SELECT
  USING (
    (public.is_active_user(auth.uid()) AND owner_id = auth.uid())
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(),'technician')
  );

DROP POLICY IF EXISTS "Owners + admins write farms" ON public.farms;
CREATE POLICY "Owners + admins write farms" ON public.farms FOR ALL
  USING (
    (public.is_active_user(auth.uid()) AND owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    (public.is_active_user(auth.uid()) AND owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Pond read via farm" ON public.ponds;
CREATE POLICY "Pond read via farm" ON public.ponds FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farms f WHERE f.id = ponds.farm_id
    AND (
      (public.is_active_user(auth.uid()) AND f.owner_id = auth.uid())
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(),'technician')
    )
  )
);

DROP POLICY IF EXISTS "Pond write via farm" ON public.ponds;
CREATE POLICY "Pond write via farm" ON public.ponds FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.farms f WHERE f.id = ponds.farm_id
    AND (
      (public.is_active_user(auth.uid()) AND f.owner_id = auth.uid())
      OR public.is_admin(auth.uid())
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.farms f WHERE f.id = ponds.farm_id
    AND (
      (public.is_active_user(auth.uid()) AND f.owner_id = auth.uid())
      OR public.is_admin(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Device read via farm" ON public.devices;
CREATE POLICY "Device read via farm" ON public.devices FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR EXISTS (
    SELECT 1 FROM public.farms f
    WHERE f.id = devices.farm_id
      AND public.is_active_user(auth.uid())
      AND f.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Device write technician/admin" ON public.devices;
CREATE POLICY "Device write technician/admin" ON public.devices FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'));

DROP POLICY IF EXISTS "Sensor read via device" ON public.sensors;
CREATE POLICY "Sensor read via device" ON public.sensors FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR public.has_role(auth.uid(),'support')
  OR EXISTS (
    SELECT 1 FROM public.devices d
    JOIN public.farms f ON f.id = d.farm_id
    WHERE d.id = sensors.device_id
      AND public.is_active_user(auth.uid())
      AND f.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Sensor write tech/admin" ON public.sensors;
CREATE POLICY "Sensor write tech/admin" ON public.sensors FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'));

DROP POLICY IF EXISTS "Readings read via pond" ON public.readings;
CREATE POLICY "Readings read via pond" ON public.readings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ponds p
    JOIN public.farms f ON f.id = p.farm_id
    WHERE p.id = readings.pond_id
      AND (
        (public.is_active_user(auth.uid()) AND f.owner_id = auth.uid())
        OR public.is_admin(auth.uid())
        OR public.has_role(auth.uid(),'technician')
      )
  )
);

DROP POLICY IF EXISTS "Readings insert by farm member/tech" ON public.readings;
DROP POLICY IF EXISTS "Readings insert by technician/admin" ON public.readings;
CREATE POLICY "Readings insert by technician/admin" ON public.readings
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'));

DROP POLICY IF EXISTS "Alerts read via pond" ON public.alerts;
CREATE POLICY "Alerts read via pond" ON public.alerts FOR SELECT USING (
  (pond_id IS NULL AND public.is_active_user(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.ponds p
    JOIN public.farms f ON f.id = p.farm_id
    WHERE p.id = alerts.pond_id
      AND (
        (public.is_active_user(auth.uid()) AND f.owner_id = auth.uid())
        OR public.is_admin(auth.uid())
        OR public.has_role(auth.uid(),'technician')
        OR public.has_role(auth.uid(),'support')
      )
  )
);

DROP POLICY IF EXISTS "Alerts write via pond" ON public.alerts;
CREATE POLICY "Alerts write via pond" ON public.alerts FOR ALL USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR public.has_role(auth.uid(),'support')
  OR (
    pond_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ponds p
      JOIN public.farms f ON f.id = p.farm_id
      WHERE p.id = alerts.pond_id
        AND public.is_active_user(auth.uid())
        AND f.owner_id = auth.uid()
    )
  )
) WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR public.has_role(auth.uid(),'support')
  OR (
    pond_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ponds p
      JOIN public.farms f ON f.id = p.farm_id
      WHERE p.id = alerts.pond_id
        AND public.is_active_user(auth.uid())
        AND f.owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Tickets insert" ON public.support_tickets;
CREATE POLICY "Tickets insert" ON public.support_tickets
  FOR INSERT WITH CHECK (public.is_active_user(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Tickets read" ON public.support_tickets;
CREATE POLICY "Tickets read" ON public.support_tickets FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'support')
  OR (
    public.is_active_user(auth.uid())
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  )
);

DROP POLICY IF EXISTS "Tickets update" ON public.support_tickets;
CREATE POLICY "Tickets update" ON public.support_tickets FOR UPDATE USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'support')
  OR (public.is_active_user(auth.uid()) AND assigned_to = auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'support')
  OR (public.is_active_user(auth.uid()) AND assigned_to = auth.uid())
);

DROP POLICY IF EXISTS "Cal logs read tech/admin/owner" ON public.calibration_logs;
CREATE POLICY "Cal logs read tech/admin/owner" ON public.calibration_logs FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR EXISTS (
    SELECT 1 FROM public.devices d
    JOIN public.farms f ON f.id = d.farm_id
    WHERE d.id = calibration_logs.device_id
      AND public.is_active_user(auth.uid())
      AND f.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Cal logs write tech/admin" ON public.calibration_logs;
CREATE POLICY "Cal logs write tech/admin" ON public.calibration_logs FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'));

DROP POLICY IF EXISTS "Maintenance read" ON public.maintenance_logs;
CREATE POLICY "Maintenance read" ON public.maintenance_logs FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR EXISTS (
    SELECT 1 FROM public.devices d
    JOIN public.farms f ON f.id = d.farm_id
    WHERE d.id = maintenance_logs.device_id
      AND public.is_active_user(auth.uid())
      AND f.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Maintenance write" ON public.maintenance_logs;
CREATE POLICY "Maintenance write" ON public.maintenance_logs FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'));

DROP POLICY IF EXISTS "Alert notes read" ON public.alert_notes;
CREATE POLICY "Alert notes read" ON public.alert_notes FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR public.has_role(auth.uid(),'support')
  OR EXISTS (
    SELECT 1 FROM public.alerts a
    JOIN public.ponds p ON p.id = a.pond_id
    JOIN public.farms f ON f.id = p.farm_id
    WHERE a.id = alert_notes.alert_id
      AND public.is_active_user(auth.uid())
      AND f.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Alert notes write" ON public.alert_notes;
CREATE POLICY "Alert notes write" ON public.alert_notes FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR public.has_role(auth.uid(),'support')
  OR (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.alerts a
      JOIN public.ponds p ON p.id = a.pond_id
      JOIN public.farms f ON f.id = p.farm_id
      WHERE a.id = alert_notes.alert_id
        AND public.is_active_user(auth.uid())
        AND f.owner_id = auth.uid()
    )
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sensors
    GROUP BY device_id, sensor_type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate sensors exist. Resolve duplicate (device_id, sensor_type) rows before adding the unique index.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.thresholds
    WHERE pond_id IS NULL
    GROUP BY scope, parameter
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate global thresholds exist. Resolve duplicate (scope, parameter) rows before adding the unique index.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.thresholds
    WHERE pond_id IS NOT NULL
    GROUP BY pond_id, parameter
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate pond thresholds exist. Resolve duplicate (pond_id, parameter) rows before adding the unique index.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sensors_device_sensor_type_unique
  ON public.sensors(device_id, sensor_type);

CREATE UNIQUE INDEX IF NOT EXISTS thresholds_global_scope_parameter_unique
  ON public.thresholds(scope, parameter)
  WHERE pond_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS thresholds_pond_parameter_unique
  ON public.thresholds(pond_id, parameter)
  WHERE pond_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS maintenance_logs_device_performed_idx
  ON public.maintenance_logs(device_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS calibration_logs_device_performed_idx
  ON public.calibration_logs(device_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS readings_device_recorded_idx
  ON public.readings(device_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_created_idx
  ON public.support_tickets(status, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_assigned_status_idx
  ON public.support_tickets(assigned_to, status);
