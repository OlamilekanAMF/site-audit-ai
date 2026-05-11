
-- Explicit deny-write policies on sensitive tables (defense in depth; RLS default-deny already applies, but make it explicit)
CREATE POLICY "Deny client inserts on user_subscriptions" ON public.user_subscriptions AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny client updates on user_subscriptions" ON public.user_subscriptions AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on user_subscriptions" ON public.user_subscriptions AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY "Deny client inserts on payment_transactions" ON public.payment_transactions AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny client updates on payment_transactions" ON public.payment_transactions AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on payment_transactions" ON public.payment_transactions AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY "Deny client inserts on user_roles" ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny client updates on user_roles" ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on user_roles" ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- Hide sensitive Paystack tokens from clients via column-level privileges
REVOKE SELECT (paystack_email_token, paystack_subscription_code, paystack_customer_code, paystack_customer_code) ON public.user_subscriptions FROM anon, authenticated;
GRANT SELECT (id, user_id, plan, billing_type, current_period_end, created_at, updated_at) ON public.user_subscriptions TO anon, authenticated;
