
-- 1. Helper: is the user on an active premium plan?
CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND plan = 'premium'
      AND (
        billing_type IS DISTINCT FROM 'one_time'
        OR (current_period_end IS NOT NULL AND current_period_end > now())
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_premium(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated;

-- 2. Helper: can the user start another scan this month?
CREATE OR REPLACE FUNCTION public.can_scan(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_premium(_user_id)
    OR (
      SELECT COUNT(*) FROM public.scan_reports
      WHERE user_id = _user_id
        AND created_at >= date_trunc('month', now())
    ) < 3
$$;

REVOKE EXECUTE ON FUNCTION public.can_scan(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_scan(uuid) TO authenticated;

-- 3. Tighten INSERT policies on premium-only tables to require an active premium plan
DROP POLICY IF EXISTS "Users can insert their own keywords" ON public.saved_keywords;
CREATE POLICY "Premium users can insert their own keywords"
  ON public.saved_keywords FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own seo reports" ON public.seo_reports;
CREATE POLICY "Premium users can insert their own seo reports"
  ON public.seo_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own comparisons" ON public.competitor_comparisons;
CREATE POLICY "Premium users can insert their own comparisons"
  ON public.competitor_comparisons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

-- 4. scan_reports: enforce monthly quota at the database level
DROP POLICY IF EXISTS "Users can create their own reports" ON public.scan_reports;
CREATE POLICY "Users can create their own reports within quota"
  ON public.scan_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_scan(auth.uid()));

-- 5. security_alerts: keep RLS but restrict UPDATE columns to `read` via column privileges
REVOKE UPDATE ON public.security_alerts FROM authenticated, anon;
GRANT UPDATE (read) ON public.security_alerts TO authenticated;

-- Add WITH CHECK so updated rows must still belong to the user
DROP POLICY IF EXISTS "Users update own security alerts" ON public.security_alerts;
CREATE POLICY "Users update own security alerts"
  ON public.security_alerts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Re-confirm column-level lockdown of Paystack tokens
REVOKE SELECT (paystack_email_token, paystack_subscription_code, paystack_customer_code) ON public.user_subscriptions FROM anon, authenticated;
