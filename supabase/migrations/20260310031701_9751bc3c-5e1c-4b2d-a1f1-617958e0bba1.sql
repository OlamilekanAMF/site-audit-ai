
-- User subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Saved keywords table
CREATE TABLE public.saved_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  keyword TEXT NOT NULL,
  search_intent TEXT,
  difficulty_score INTEGER,
  opportunity_score INTEGER,
  suggested_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own keywords" ON public.saved_keywords FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own keywords" ON public.saved_keywords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own keywords" ON public.saved_keywords FOR DELETE USING (auth.uid() = user_id);

-- SEO reports table
CREATE TABLE public.seo_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  website_url TEXT NOT NULL,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seo reports" ON public.seo_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own seo reports" ON public.seo_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own seo reports" ON public.seo_reports FOR DELETE USING (auth.uid() = user_id);

-- Tracked websites table
CREATE TABLE public.tracked_websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracked_websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tracked websites" ON public.tracked_websites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tracked websites" ON public.tracked_websites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tracked websites" ON public.tracked_websites FOR DELETE USING (auth.uid() = user_id);

-- Auto-create subscription for new users (update existing trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

-- Trigger for updated_at on user_subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
