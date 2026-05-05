import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FREE_SCAN_LIMIT = 3;

export type Plan = "free" | "premium";
export type SubscriptionStatus = "active" | "canceled" | "expired" | "free";

export type SubscriptionDetails = {
  plan: Plan;
  billingType: "subscription" | "one_time" | null;
  paystackSubscriptionCode: string | null;
  currentPeriodEnd: string | null;
  status: SubscriptionStatus;
};

export function useSubscription() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [details, setDetails] = useState<SubscriptionDetails>({
    plan: "free",
    billingType: null,
    paystackSubscriptionCode: null,
    currentPeriodEnd: null,
    status: "free",
  });
  const [scansThisMonth, setScansThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      // Get subscription
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("plan, billing_type, paystack_subscription_code, current_period_end")
        .eq("user_id", user.id)
        .single();

      if (sub) {
        const subPlan = (sub.plan as Plan) || "free";
        setPlan(subPlan);

        const periodEnd = sub.current_period_end;
        const periodActive = periodEnd ? new Date(periodEnd).getTime() > Date.now() : true;

        let status: SubscriptionStatus = "free";
        if (subPlan === "premium") {
          if (sub.billing_type === "subscription") {
            status = sub.paystack_subscription_code ? "active" : "canceled";
          } else if (sub.billing_type === "one_time") {
            status = periodActive ? "active" : "expired";
          } else {
            status = "active";
          }
        }

        setDetails({
          plan: subPlan,
          billingType: (sub.billing_type as "subscription" | "one_time" | null) ?? null,
          paystackSubscriptionCode: sub.paystack_subscription_code ?? null,
          currentPeriodEnd: periodEnd ?? null,
          status,
        });
      }
      // Note: default 'free' subscription is auto-created by handle_new_user trigger.

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

  return {
    plan,
    isPremium,
    canScan,
    scansThisMonth,
    scansRemaining,
    loading,
    incrementScanCount,
    FREE_SCAN_LIMIT,
    subscription: details,
  };
}
