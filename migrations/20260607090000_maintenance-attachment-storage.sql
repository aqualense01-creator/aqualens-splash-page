-- Storage policies for maintenance and installation evidence.
-- Create the `maintenance-attachments` bucket via InsForge CLI or dashboard before deploying uploads.

CREATE OR REPLACE FUNCTION public.uuid_or_null(_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN _value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_maintenance_attachment_device(
  _device_id uuid,
  _user_id uuid
)
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

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_maintenance_attachment_select ON storage.objects;
CREATE POLICY storage_objects_maintenance_attachment_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket = 'maintenance-attachments'
    AND public.can_access_maintenance_attachment_device(
      public.uuid_or_null((storage.foldername(key))[1]),
      public.uuid_or_null((SELECT auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS storage_objects_maintenance_attachment_insert ON storage.objects;
CREATE POLICY storage_objects_maintenance_attachment_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'maintenance-attachments'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
    AND (
      public.is_admin(public.uuid_or_null((SELECT auth.jwt() ->> 'sub')))
      OR public.has_role(public.uuid_or_null((SELECT auth.jwt() ->> 'sub')), 'technician')
    )
    AND public.can_access_maintenance_attachment_device(
      public.uuid_or_null((storage.foldername(key))[1]),
      public.uuid_or_null((SELECT auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS storage_objects_maintenance_attachment_delete ON storage.objects;
CREATE POLICY storage_objects_maintenance_attachment_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'maintenance-attachments'
    AND (
      uploaded_by = (SELECT auth.jwt() ->> 'sub')
      OR public.is_admin(public.uuid_or_null((SELECT auth.jwt() ->> 'sub')))
      OR public.has_role(public.uuid_or_null((SELECT auth.jwt() ->> 'sub')), 'technician')
    )
  );

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
