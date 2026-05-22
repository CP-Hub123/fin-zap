
-- Revoke anon execute on delete_month_cascade (should only be callable by authenticated users)
REVOKE EXECUTE ON FUNCTION public.delete_month_cascade(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_month_cascade(uuid) TO authenticated;

-- Remove broad SELECT policy on app-releases bucket to prevent listing all files.
-- Public file URLs (/object/public/...) continue to work without an RLS policy.
DROP POLICY IF EXISTS "app-releases public read" ON storage.objects;
