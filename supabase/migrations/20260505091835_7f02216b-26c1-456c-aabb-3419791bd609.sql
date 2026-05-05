
-- user_subscriptions: drop overly permissive policies
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;

CREATE POLICY "Authenticated users view own subscription"
  ON public.user_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies: only service role can write.

-- payment_transactions: explicit no-write policies (service role bypasses RLS)
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.payment_transactions;
CREATE POLICY "Authenticated users view own transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Scope other policies from public -> authenticated
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own keywords" ON public.saved_keywords;
DROP POLICY IF EXISTS "Users can insert their own keywords" ON public.saved_keywords;
DROP POLICY IF EXISTS "Users can delete their own keywords" ON public.saved_keywords;
CREATE POLICY "Users can view their own keywords" ON public.saved_keywords FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own keywords" ON public.saved_keywords FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own keywords" ON public.saved_keywords FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own reports" ON public.scan_reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON public.scan_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.scan_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON public.scan_reports;
CREATE POLICY "Users can view their own reports" ON public.scan_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reports" ON public.scan_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reports" ON public.scan_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reports" ON public.scan_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own seo reports" ON public.seo_reports;
DROP POLICY IF EXISTS "Users can insert their own seo reports" ON public.seo_reports;
DROP POLICY IF EXISTS "Users can delete their own seo reports" ON public.seo_reports;
CREATE POLICY "Users can view their own seo reports" ON public.seo_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own seo reports" ON public.seo_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own seo reports" ON public.seo_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own tracked websites" ON public.tracked_websites;
DROP POLICY IF EXISTS "Users can insert their own tracked websites" ON public.tracked_websites;
DROP POLICY IF EXISTS "Users can delete their own tracked websites" ON public.tracked_websites;
CREATE POLICY "Users can view their own tracked websites" ON public.tracked_websites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tracked websites" ON public.tracked_websites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tracked websites" ON public.tracked_websites FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
