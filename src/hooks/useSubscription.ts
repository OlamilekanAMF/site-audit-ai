import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FREE_SCAN_LIMIT = 3;

export type Plan = "free" | "premium";

export function useSubscription() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [scansThisMonth, setScansThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      // Get subscription
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      if (sub) setPlan(sub.plan as Plan);
      else {
        // Create default subscription for existing users
        await supabase.from("user_subscriptions").insert({ user_id: user.id, plan: "free" });
      }

      // Count scans this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from("scan_reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth);

      setScansThisMonth(count || 0);
      setLoading(false);
    };

    fetch();
  }, [user]);

  const canScan = plan === "premium" || scansThisMonth < FREE_SCAN_LIMIT;
  const scansRemaining = plan === "premium" ? Infinity : Math.max(0, FREE_SCAN_LIMIT - scansThisMonth);
  const isPremium = plan === "premium";

  const incrementScanCount = () => setScansThisMonth((c) => c + 1);

  return { plan, isPremium, canScan, scansThisMonth, scansRemaining, loading, incrementScanCount, FREE_SCAN_LIMIT };
}
