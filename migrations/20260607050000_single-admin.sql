-- Ensure aqualense01@gmail.com is the sole platform admin.

DO $$
DECLARE
  target_email constant text := 'aqualense01@gmail.com';
  target_user_id uuid;
BEGIN
  SELECT id
  INTO target_user_id
  FROM auth.users
  WHERE lower(email) = target_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot promote %, auth user does not exist', target_email;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, account_status)
  VALUES (target_user_id, target_email, target_email, 'active')
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    email = EXCLUDED.email,
    account_status = 'active',
    updated_at = now();

  DELETE FROM public.user_roles
  WHERE role = 'admin'
    AND user_id <> target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_admin_idx
  ON public.user_roles (role)
  WHERE role = 'admin';

CREATE OR REPLACE FUNCTION public.enforce_single_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_email constant text := 'aqualense01@gmail.com';
  candidate_email text;
  existing_admin_user_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' THEN
      RAISE EXCEPTION 'The sole admin role cannot be removed';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin' AND NEW.role <> 'admin' THEN
      RAISE EXCEPTION 'The sole admin role cannot be changed';
    END IF;
  END IF;

  IF NEW.role <> 'admin' THEN
    RETURN NEW;
  END IF;

  SELECT lower(email)
  INTO candidate_email
  FROM auth.users
  WHERE id = NEW.user_id;

  IF candidate_email IS DISTINCT FROM target_email THEN
    RAISE EXCEPTION 'Only % can hold the admin role', target_email;
  END IF;

  SELECT user_id
  INTO existing_admin_user_id
  FROM public.user_roles
  WHERE role = 'admin'
    AND user_id <> NEW.user_id
  LIMIT 1;

  IF existing_admin_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only one admin role is allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_admin_role ON public.user_roles;
CREATE TRIGGER enforce_single_admin_role
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_admin_role();
