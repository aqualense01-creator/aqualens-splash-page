-- Acqua Lence — water monitoring schema (Phase 1)

-- ============================================================================
-- ENUMS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('farmer','farm_manager','technician','admin','support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pond_status AS ENUM ('good','watch','warning','critical','offline','calibration_due');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.device_status AS ENUM ('online','offline','low_battery','calibration_due','maintenance_due');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('info','watch','warning','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_status AS ENUM ('open','acknowledged','resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sensor_type AS ENUM ('do','ph','temperature','turbidity','salinity','ammonia','water_level');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PROFILES (1:1 with auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  district text,
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','bn')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- USER ROLES (separate table to avoid recursive RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check (avoids recursive RLS).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- ============================================================================
-- FARMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  district text,
  location text,
  latitude numeric,
  longitude numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS farms_owner_idx ON public.farms(owner_id);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners + admins read farms" ON public.farms;
CREATE POLICY "Owners + admins read farms" ON public.farms FOR SELECT
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'));
DROP POLICY IF EXISTS "Owners + admins write farms" ON public.farms;
CREATE POLICY "Owners + admins write farms" ON public.farms FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================================
-- PONDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ponds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  pond_type text,
  water_type text,
  species text,
  area_m2 numeric,
  depth_m numeric,
  stocking_date date,
  stocking_density numeric,
  threshold_preset text DEFAULT 'shrimp_default',
  status public.pond_status NOT NULL DEFAULT 'good',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ponds_farm_idx ON public.ponds(farm_id);

ALTER TABLE public.ponds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pond read via farm" ON public.ponds;
CREATE POLICY "Pond read via farm" ON public.ponds FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.farms f WHERE f.id = ponds.farm_id
    AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician')))
);
DROP POLICY IF EXISTS "Pond write via farm" ON public.ponds;
CREATE POLICY "Pond write via farm" ON public.ponds FOR ALL USING (
  EXISTS (SELECT 1 FROM public.farms f WHERE f.id = ponds.farm_id
    AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.farms f WHERE f.id = ponds.farm_id
    AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid())))
);

-- ============================================================================
-- DEVICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial text UNIQUE NOT NULL,
  name text,
  hardware_version text,
  firmware_version text,
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  pond_id uuid REFERENCES public.ponds(id) ON DELETE SET NULL,
  status public.device_status NOT NULL DEFAULT 'online',
  battery_pct integer CHECK (battery_pct BETWEEN 0 AND 100),
  signal_pct integer CHECK (signal_pct BETWEEN 0 AND 100),
  last_seen timestamptz,
  installed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS devices_pond_idx ON public.devices(pond_id);
CREATE INDEX IF NOT EXISTS devices_farm_idx ON public.devices(farm_id);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Device read via farm" ON public.devices;
CREATE POLICY "Device read via farm" ON public.devices FOR SELECT USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician') OR
  EXISTS (SELECT 1 FROM public.farms f WHERE f.id = devices.farm_id AND f.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Device write technician/admin" ON public.devices;
CREATE POLICY "Device write technician/admin" ON public.devices FOR ALL USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician') OR
  EXISTS (SELECT 1 FROM public.farms f WHERE f.id = devices.farm_id AND f.owner_id = auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician') OR
  EXISTS (SELECT 1 FROM public.farms f WHERE f.id = devices.farm_id AND f.owner_id = auth.uid())
);

-- ============================================================================
-- SENSORS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  sensor_type public.sensor_type NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  last_calibrated timestamptz,
  calibration_due timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sensors_device_idx ON public.sensors(device_id);

ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sensor read via device" ON public.sensors;
CREATE POLICY "Sensor read via device" ON public.sensors FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.devices d
    LEFT JOIN public.farms f ON f.id = d.farm_id
    WHERE d.id = sensors.device_id
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician') OR f.owner_id = auth.uid()))
);
DROP POLICY IF EXISTS "Sensor write tech/admin" ON public.sensors;
CREATE POLICY "Sensor write tech/admin" ON public.sensors FOR ALL USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician')
) WITH CHECK (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician')
);

-- ============================================================================
-- READINGS (hot path)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id uuid NOT NULL REFERENCES public.ponds(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  do_mg_l numeric,
  ph numeric,
  temp_c numeric,
  turbidity_ntu numeric,
  salinity_ppt numeric,
  ammonia_mg_l numeric,
  water_level_cm numeric,
  battery_pct integer,
  signal_pct integer
);
CREATE INDEX IF NOT EXISTS readings_pond_time_idx ON public.readings(pond_id, recorded_at DESC);

ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readings read via pond" ON public.readings;
CREATE POLICY "Readings read via pond" ON public.readings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ponds p
    JOIN public.farms f ON f.id = p.farm_id
    WHERE p.id = readings.pond_id
    AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician')))
);
DROP POLICY IF EXISTS "Readings insert by farm member/tech" ON public.readings;
CREATE POLICY "Readings insert by farm member/tech" ON public.readings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.ponds p
    JOIN public.farms f ON f.id = p.farm_id
    WHERE p.id = readings.pond_id
    AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician')))
);

-- ============================================================================
-- ALERTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id uuid REFERENCES public.ponds(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  parameter text,
  value numeric,
  threshold numeric,
  severity public.alert_severity NOT NULL DEFAULT 'warning',
  status public.alert_status NOT NULL DEFAULT 'open',
  message text,
  recommended_action text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  notes text
);
CREATE INDEX IF NOT EXISTS alerts_pond_idx ON public.alerts(pond_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS alerts_status_idx ON public.alerts(status);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Alerts read via pond" ON public.alerts;
CREATE POLICY "Alerts read via pond" ON public.alerts FOR SELECT USING (
  pond_id IS NULL OR EXISTS (SELECT 1 FROM public.ponds p
    JOIN public.farms f ON f.id = p.farm_id
    WHERE p.id = alerts.pond_id
    AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician')))
);
DROP POLICY IF EXISTS "Alerts write via pond" ON public.alerts;
CREATE POLICY "Alerts write via pond" ON public.alerts FOR ALL USING (
  pond_id IS NULL OR EXISTS (SELECT 1 FROM public.ponds p
    JOIN public.farms f ON f.id = p.farm_id
    WHERE p.id = alerts.pond_id
    AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician')))
) WITH CHECK (
  pond_id IS NULL OR EXISTS (SELECT 1 FROM public.ponds p
    JOIN public.farms f ON f.id = p.farm_id
    WHERE p.id = alerts.pond_id
    AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician')))
);

-- ============================================================================
-- THRESHOLDS, MAINTENANCE, CALIBRATION, SUPPORT TICKETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  pond_id uuid REFERENCES public.ponds(id) ON DELETE CASCADE,
  parameter text NOT NULL,
  safe_min numeric,
  safe_max numeric,
  warn_min numeric,
  warn_max numeric,
  crit_min numeric,
  crit_max numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Thresholds readable" ON public.thresholds;
CREATE POLICY "Thresholds readable" ON public.thresholds FOR SELECT USING (true);
DROP POLICY IF EXISTS "Thresholds admin write" ON public.thresholds;
CREATE POLICY "Thresholds admin write" ON public.thresholds FOR ALL USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.calibration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  sensor_type public.sensor_type NOT NULL,
  calibration_value numeric,
  technician_id uuid REFERENCES auth.users(id),
  technician_name text,
  result text,
  notes text,
  performed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calibration_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cal logs read tech/admin/owner" ON public.calibration_logs;
CREATE POLICY "Cal logs read tech/admin/owner" ON public.calibration_logs FOR SELECT USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician') OR
  EXISTS (SELECT 1 FROM public.devices d JOIN public.farms f ON f.id = d.farm_id
    WHERE d.id = calibration_logs.device_id AND f.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Cal logs write tech/admin" ON public.calibration_logs;
CREATE POLICY "Cal logs write tech/admin" ON public.calibration_logs FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'));

CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES auth.users(id),
  visit_type text,
  notes text,
  photos jsonb DEFAULT '[]'::jsonb,
  performed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Maintenance read" ON public.maintenance_logs;
CREATE POLICY "Maintenance read" ON public.maintenance_logs FOR SELECT USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician') OR
  EXISTS (SELECT 1 FROM public.devices d JOIN public.farms f ON f.id = d.farm_id
    WHERE d.id = maintenance_logs.device_id AND f.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Maintenance write" ON public.maintenance_logs;
CREATE POLICY "Maintenance write" ON public.maintenance_logs FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'technician'));

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  pond_id uuid REFERENCES public.ponds(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  issue_type text,
  priority text DEFAULT 'normal',
  description text,
  photos jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tickets read" ON public.support_tickets;
CREATE POLICY "Tickets read" ON public.support_tickets FOR SELECT USING (
  created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'support')
);
DROP POLICY IF EXISTS "Tickets insert" ON public.support_tickets;
CREATE POLICY "Tickets insert" ON public.support_tickets FOR INSERT WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Tickets update" ON public.support_tickets;
CREATE POLICY "Tickets update" ON public.support_tickets FOR UPDATE USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'support') OR assigned_to = auth.uid()
);

-- ============================================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  -- Default to farmer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'farmer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- DEFAULT THRESHOLDS (global, shrimp/fish friendly)
-- ============================================================================
INSERT INTO public.thresholds (scope, parameter, safe_min, safe_max, warn_min, warn_max, crit_min, crit_max)
VALUES
  ('global','do_mg_l',         5.0, 8.0,  4.0, 9.0,  3.0, 12.0),
  ('global','ph',               7.0, 8.5,  6.5, 9.0,  6.0, 9.5),
  ('global','temp_c',          26.0,30.0, 24.0,32.0, 22.0,35.0),
  ('global','turbidity_ntu',    0.0,15.0,  0.0,25.0,  0.0,40.0),
  ('global','salinity_ppt',    10.0,25.0,  5.0,30.0,  0.0,40.0),
  ('global','ammonia_mg_l',     0.0, 0.5,  0.0, 1.0,  0.0, 2.0)
ON CONFLICT DO NOTHING;
