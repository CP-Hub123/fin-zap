
-- Enums
CREATE TYPE public.bug_category AS ENUM ('visual','financial','recurring','cofrinhos','dashboard','open_finance','performance','other');
CREATE TYPE public.bug_priority AS ENUM ('low','medium','high','critical');
CREATE TYPE public.bug_status AS ENUM ('new','analyzing','fixing','resolved','ignored');

-- bug_reports table
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category public.bug_category NOT NULL DEFAULT 'other',
  priority public.bug_priority NOT NULL DEFAULT 'medium',
  status public.bug_status NOT NULL DEFAULT 'new',
  route text,
  device_info jsonb,
  browser_info jsonb,
  screen_size text,
  theme text,
  app_version text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bug_reports_user_id ON public.bug_reports(user_id);
CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports(created_at DESC);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own bug reports" ON public.bug_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own bug reports" ON public.bug_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all bug reports" ON public.bug_reports
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admin updates bug reports" ON public.bug_reports
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin deletes bug reports" ON public.bug_reports
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- screenshots table
CREATE TABLE public.bug_report_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id uuid NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bug_screenshots_report_id ON public.bug_report_screenshots(bug_report_id);

ALTER TABLE public.bug_report_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own screenshots" ON public.bug_report_screenshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own screenshots" ON public.bug_report_screenshots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all screenshots" ON public.bug_report_screenshots
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admin deletes screenshots" ON public.bug_report_screenshots
  FOR DELETE TO authenticated USING (public.is_admin());

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('bug-screenshots','bug-screenshots', false);

CREATE POLICY "Users upload own bug screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bug-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own bug screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bug-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admin reads all bug screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bug-screenshots' AND public.is_admin());

CREATE POLICY "Admin deletes bug screenshots" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'bug-screenshots' AND public.is_admin());
