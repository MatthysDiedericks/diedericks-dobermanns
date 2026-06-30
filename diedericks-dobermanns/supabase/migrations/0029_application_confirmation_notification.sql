-- 0029 — Application confirmation rows in notifications_log (client inbox)

ALTER TABLE public.notifications_log DROP CONSTRAINT IF EXISTS notifications_log_type_check;
ALTER TABLE public.notifications_log ADD CONSTRAINT notifications_log_type_check
  CHECK (type IN ('push', 'email', 'whatsapp', 'application_confirmation'));

DROP POLICY IF EXISTS "notifications self insert" ON public.notifications_log;
CREATE POLICY "notifications self insert" ON public.notifications_log
  FOR INSERT TO authenticated
  WITH CHECK (recipient_id = auth.uid());
