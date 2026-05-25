
CREATE POLICY "Admin reads all closures"
ON public.monthly_closures
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Users delete own bug screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bug-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
