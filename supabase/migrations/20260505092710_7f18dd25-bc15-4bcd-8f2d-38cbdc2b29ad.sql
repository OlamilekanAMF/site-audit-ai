
CREATE TABLE public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('website_scan', 'platform')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  scan_report_id UUID,
  site_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_alerts_user_created ON public.security_alerts(user_id, created_at DESC);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own security alerts"
  ON public.security_alerts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own website-scan alerts"
  ON public.security_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND source = 'website_scan');

CREATE POLICY "Users update own security alerts"
  ON public.security_alerts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all security alerts"
  ON public.security_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.security_alerts;
