-- Expand maintenance_logs with the fields the maintenance form captures.
ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS technician_name text,
  ADD COLUMN IF NOT EXISTS issue_type text,
  ADD COLUMN IF NOT EXISTS work_performed text,
  ADD COLUMN IF NOT EXISTS parts_replaced text,
  ADD COLUMN IF NOT EXISTS device_status_after text,
  ADD COLUMN IF NOT EXISTS follow_up_required boolean NOT NULL DEFAULT false;
