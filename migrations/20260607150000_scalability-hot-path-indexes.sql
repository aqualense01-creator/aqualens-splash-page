-- Hot-path indexes for admin/support/report screens.
-- These support the current broad list queries and the next round of server-side pagination/RPCs.

CREATE INDEX IF NOT EXISTS alerts_detected_at_idx
  ON public.alerts(detected_at DESC);

CREATE INDEX IF NOT EXISTS alerts_status_detected_idx
  ON public.alerts(status, detected_at DESC);

CREATE INDEX IF NOT EXISTS alerts_device_status_detected_idx
  ON public.alerts(device_id, status, detected_at DESC)
  WHERE device_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS readings_recorded_at_idx
  ON public.readings(recorded_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_updated_idx
  ON public.support_tickets(updated_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_created_by_updated_idx
  ON public.support_tickets(created_by, updated_at DESC);

CREATE INDEX IF NOT EXISTS support_ticket_activities_created_idx
  ON public.support_ticket_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS support_ticket_attachments_created_idx
  ON public.support_ticket_attachments(created_at DESC);

CREATE INDEX IF NOT EXISTS devices_serial_idx
  ON public.devices(serial);

CREATE INDEX IF NOT EXISTS farms_name_idx
  ON public.farms(name);

CREATE INDEX IF NOT EXISTS profiles_lower_email_idx
  ON public.profiles(lower(email));

CREATE INDEX IF NOT EXISTS user_roles_role_user_idx
  ON public.user_roles(role, user_id);
