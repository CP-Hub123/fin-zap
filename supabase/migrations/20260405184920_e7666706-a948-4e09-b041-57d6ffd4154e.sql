
-- Add read column to notifications_log
ALTER TABLE public.notifications_log ADD COLUMN read boolean NOT NULL DEFAULT false;

-- Allow authenticated users to update their own notifications (mark as read)
CREATE POLICY "Users update own notifications"
ON public.notifications_log FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also allow authenticated users to insert (for in-app notification creation from edge functions via service role, and client fallback)
-- Already has service_role insert, add authenticated insert for own notifications
CREATE POLICY "Users insert own notifications"
ON public.notifications_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
