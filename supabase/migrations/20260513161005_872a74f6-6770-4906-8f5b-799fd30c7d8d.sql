-- 1. Remove client INSERT on competitor_alerts (system/service-role only)
DROP POLICY IF EXISTS "Users can insert their own alerts" ON public.competitor_alerts;

CREATE POLICY "Deny client inserts on competitor_alerts"
ON public.competitor_alerts
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

-- 2. Enforce column-level update grant on security_alerts (only 'read' editable)
REVOKE UPDATE ON public.security_alerts FROM anon, authenticated;
GRANT UPDATE (read) ON public.security_alerts TO authenticated;
