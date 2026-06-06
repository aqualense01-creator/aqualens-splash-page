CREATE OR REPLACE FUNCTION public.get_recent_visible_readings(
  _farm_id uuid DEFAULT NULL,
  _lookback_hours integer DEFAULT 24,
  _per_pond_limit integer DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  pond_id uuid,
  device_id uuid,
  recorded_at timestamptz,
  do_mg_l numeric,
  ph numeric,
  temp_c numeric,
  turbidity_ntu numeric,
  salinity_ppt numeric,
  ammonia_mg_l numeric,
  water_level_cm numeric,
  battery_pct integer,
  signal_pct integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH visible_ponds AS (
    SELECT p.id
    FROM public.ponds p
    WHERE public.can_access_farm(p.farm_id, auth.uid())
      AND (_farm_id IS NULL OR p.farm_id = _farm_id)
  ),
  ranked AS (
    SELECT
      r.*,
      row_number() OVER (PARTITION BY r.pond_id ORDER BY r.recorded_at DESC) AS rn
    FROM public.readings r
    JOIN visible_ponds vp ON vp.id = r.pond_id
    WHERE r.recorded_at >= now()
      - make_interval(hours => GREATEST(1, LEAST(COALESCE(_lookback_hours, 24), 168)))
  )
  SELECT
    ranked.id,
    ranked.pond_id,
    ranked.device_id,
    ranked.recorded_at,
    ranked.do_mg_l,
    ranked.ph,
    ranked.temp_c,
    ranked.turbidity_ntu,
    ranked.salinity_ppt,
    ranked.ammonia_mg_l,
    ranked.water_level_cm,
    ranked.battery_pct,
    ranked.signal_pct
  FROM ranked
  WHERE ranked.rn <= GREATEST(1, LEAST(COALESCE(_per_pond_limit, 12), 120))
  ORDER BY ranked.recorded_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.save_device_configuration(
  _device_id uuid,
  _farm_id uuid DEFAULT NULL,
  _pond_id uuid DEFAULT NULL,
  _sampling_interval_seconds integer DEFAULT 300,
  _threshold_profile text DEFAULT 'default',
  _idempotency_key text DEFAULT NULL
)
RETURNS public.device_commands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _pond_farm_id uuid;
  _command public.device_commands;
  _payload jsonb;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to update device settings';
  END IF;

  IF NOT public.can_manage_device_commands(_device_id, _actor) THEN
    RAISE EXCEPTION 'You do not have permission to manage this device';
  END IF;

  IF _sampling_interval_seconds NOT BETWEEN 30 AND 86400 THEN
    RAISE EXCEPTION 'Sampling interval must be between 30 seconds and 24 hours';
  END IF;

  IF _threshold_profile NOT IN ('default', 'shrimp', 'hatchery', 'carp') THEN
    RAISE EXCEPTION 'Unsupported threshold profile: %', _threshold_profile;
  END IF;

  IF _pond_id IS NOT NULL THEN
    SELECT p.farm_id INTO _pond_farm_id
    FROM public.ponds p
    WHERE p.id = _pond_id;

    IF _pond_farm_id IS NULL THEN
      RAISE EXCEPTION 'Assigned pond does not exist';
    END IF;

    IF _farm_id IS NULL OR _farm_id <> _pond_farm_id THEN
      RAISE EXCEPTION 'Assigned pond must belong to the selected farm';
    END IF;
  END IF;

  UPDATE public.devices
  SET
    farm_id = _farm_id,
    pond_id = _pond_id,
    updated_at = now()
  WHERE id = _device_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Device was not found';
  END IF;

  INSERT INTO public.device_configurations (
    device_id,
    sampling_interval_seconds,
    threshold_profile,
    updated_by,
    updated_at
  )
  VALUES (
    _device_id,
    _sampling_interval_seconds,
    _threshold_profile,
    _actor,
    now()
  )
  ON CONFLICT (device_id) DO UPDATE
  SET
    sampling_interval_seconds = EXCLUDED.sampling_interval_seconds,
    threshold_profile = EXCLUDED.threshold_profile,
    version = public.device_configurations.version + 1,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

  _payload := jsonb_build_object(
    'device_id', _device_id,
    'farm_id', _farm_id,
    'pond_id', _pond_id,
    'sampling_interval_seconds', _sampling_interval_seconds,
    'threshold_profile', _threshold_profile,
    'updated_at', now()
  );

  SELECT *
  INTO _command
  FROM public.enqueue_device_command(
    _device_id,
    'config_update',
    _payload,
    COALESCE(NULLIF(_idempotency_key, ''), gen_random_uuid()::text)
  );

  RETURN _command;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_visible_readings(uuid, integer, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_device_configuration(uuid, uuid, uuid, integer, text, text)
  TO authenticated;
