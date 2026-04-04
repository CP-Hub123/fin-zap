
-- Fix activity_logs: restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Users insert own logs" ON public.activity_logs;
CREATE POLICY "Users insert own logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix activity_logs: restrict SELECT policies to authenticated
DROP POLICY IF EXISTS "Users read own logs" ON public.activity_logs;
CREATE POLICY "Users read own logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all logs" ON public.activity_logs;
CREATE POLICY "Admins read all logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (is_admin());

-- Add length constraint on action column to prevent audit trail poisoning
ALTER TABLE public.activity_logs ADD CONSTRAINT chk_action_length CHECK (char_length(action) <= 100);
