
DROP POLICY "System inserts notifications" ON public.notifications_log;
CREATE POLICY "Service role inserts notifications"
ON public.notifications_log FOR INSERT
TO service_role
WITH CHECK (true);
