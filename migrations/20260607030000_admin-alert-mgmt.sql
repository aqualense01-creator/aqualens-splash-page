-- Admin alert monitoring: assignment, escalation, internal notes
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS assigned_technician_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS alerts_assigned_idx ON public.alerts(assigned_technician_id);

CREATE TABLE IF NOT EXISTS public.alert_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note'
    CHECK (kind IN ('note','assignment','escalation','resolution','status_change')),
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_notes_alert_idx ON public.alert_notes(alert_id, created_at DESC);

ALTER TABLE public.alert_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alert notes read" ON public.alert_notes;
CREATE POLICY "Alert notes read" ON public.alert_notes FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR public.has_role(auth.uid(),'support')
  OR EXISTS (
    SELECT 1 FROM public.alerts a
    JOIN public.ponds p ON p.id = a.pond_id
    JOIN public.farms f ON f.id = p.farm_id
    WHERE a.id = alert_notes.alert_id AND f.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Alert notes write" ON public.alert_notes;
CREATE POLICY "Alert notes write" ON public.alert_notes FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'technician')
  OR public.has_role(auth.uid(),'support')
);
