-- Add reference_value to calibration logs so technicians can record the
-- expected/standard value alongside the measured calibration value.
ALTER TABLE public.calibration_logs
  ADD COLUMN IF NOT EXISTS reference_value numeric;
