-- App table privileges and append-only evidence logs.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON
  public.profiles,
  public.user_roles,
  public.farms,
  public.ponds,
  public.devices,
  public.sensors,
  public.readings,
  public.alerts,
  public.alert_notes,
  public.support_tickets,
  public.support_ticket_activities,
  public.support_ticket_attachments,
  public.calibration_logs,
  public.maintenance_logs,
  public.thresholds,
  public.products,
  public.admin_settings_documents,
  public.admin_settings_change_logs,
  public.device_commands,
  public.device_configurations
TO authenticated;

GRANT INSERT, UPDATE ON
  public.profiles,
  public.farms,
  public.ponds,
  public.devices,
  public.sensors,
  public.readings,
  public.alerts,
  public.alert_notes,
  public.support_tickets,
  public.support_ticket_activities,
  public.support_ticket_attachments,
  public.thresholds,
  public.products,
  public.admin_settings_documents,
  public.admin_settings_change_logs,
  public.device_configurations
TO authenticated;

GRANT INSERT ON public.calibration_logs, public.maintenance_logs TO authenticated;
GRANT UPDATE, DELETE ON public.calibration_logs, public.maintenance_logs TO authenticated;
GRANT DELETE ON public.support_ticket_attachments TO authenticated;

DROP POLICY IF EXISTS "Cal logs write tech/admin" ON public.calibration_logs;
DROP POLICY IF EXISTS "Cal logs insert tech/admin" ON public.calibration_logs;
DROP POLICY IF EXISTS "Cal logs update admin" ON public.calibration_logs;
DROP POLICY IF EXISTS "Cal logs delete admin" ON public.calibration_logs;

CREATE POLICY "Cal logs insert tech/admin" ON public.calibration_logs
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'technician')
  );

CREATE POLICY "Cal logs update admin" ON public.calibration_logs
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Cal logs delete admin" ON public.calibration_logs
  FOR DELETE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Maintenance write" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Maintenance insert tech/admin" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Maintenance update admin" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Maintenance delete admin" ON public.maintenance_logs;

CREATE POLICY "Maintenance insert tech/admin" ON public.maintenance_logs
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'technician')
  );

CREATE POLICY "Maintenance update admin" ON public.maintenance_logs
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Maintenance delete admin" ON public.maintenance_logs
  FOR DELETE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS storage_objects_maintenance_delete ON storage.objects;
CREATE POLICY storage_objects_maintenance_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'maintenance-attachments'
    AND (
      uploaded_by = (SELECT auth.jwt() ->> 'sub')
      OR public.is_admin(public.uuid_or_null((SELECT auth.jwt() ->> 'sub')))
    )
  );
