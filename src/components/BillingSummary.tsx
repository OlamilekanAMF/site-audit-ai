import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Repeat,
  Zap,
  ArrowRight,
  Clock,
} from "lucide-react";

type PaymentTx = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  billing_type: string | null;
  reference: string;
};

type Variant = "card" | "inline";

const statusMeta: Record<string, { label: string; icon: any; className: string }> = {
  active: { label: "Active", icon: CheckCircle2, className: "bg-score-excellent/10 text-score-excellent border-score-excellent/20" },
  canceled: { label: "Canceled", icon: AlertCircle, className: "bg-score-average/10 text-score-average border-score-average/20" },
  expired: { label: "Expired", icon: XCircle, className: "bg-score-poor/10 text-score-poor border-score-poor/20" },
  free: { label: "Free", icon: CheckCircle2, className: "bg-muted text-muted-foreground border-border" },
};

const paymentStatusMeta: Record<string, { label: string; className: string }> = {
  success: { label: "Paid", className: "bg-score-excellent/10 text-score-excellent" },
  pending: { label: "Pending", className: "bg-score-average/10 text-score-average" },
  failed: { label: "Failed", className: "bg-score-poor/10 text-score-poor" },
};

export function BillingSummary({ variant = "card" }: { variant?: Variant }) {
  const { user } = useAuth();
  const { plan, isPremium, subscription, scansThisMonth, scansRemaining, FREE_SCAN_LIMIT, loading } = useSubscription();
  const [lastPayment, setLastPayment] = useState<PaymentTx | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("payment_transactions")
      .select("id, status, amount, currency, created_at, billing_type, reference")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLastPayment(data as PaymentTx);
      });
  }, [user]);

  const meta = statusMeta[subscription.status] || statusMeta.free;
  const StatusIcon = meta.icon;
  const renewalDate = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const daysLeft = renewalDate
    ? Math.max(0, Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const payMeta = lastPayment ? paymentStatusMeta[lastPayment.status] || { label: lastPayment.status, className: "bg-muted text-muted-foreground" } : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isPremium ? "bg-primary/10" : "bg-muted"}`}>
              {isPremium ? <Crown className="h-4 w-4 text-primary" /> : <CreditCard className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div>
              <CardTitle className="font-display text-sm font-semibold">Billing & Subscription</CardTitle>
              <CardDescription className="text-xs">Your current plan and payment status</CardDescription>
            </div>
          </div>
          <Link to="/dashboard/pricing">
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
              Manage <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Plan + status */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold capitalize">{plan}</span>
              <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                <StatusIcon className="h-3 w-3" />
                {meta.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isPremium
                ? subscription.billingType === "subscription"
                  ? "Monthly subscription · $19/mo"
                  : "One-time premium access · $19"
                : `${scansThisMonth} of ${FREE_SCAN_LIMIT} free scans used this month`}
            </p>
          </div>
          {!isPremium && (
            <Link to="/dashboard/pricing">
              <Button size="sm" className="gap-1.5">
                <Crown className="h-3.5 w-3.5" /> Upgrade
              </Button>
            </Link>
          )}
        </div>

        {/* Renewal + payment grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <Calendar className="h-3 w-3" />
              {subscription.billingType === "subscription" && subscription.status === "active"
                ? "Next renewal"
                : isPremium
                ? "Access ends"
                : "Resets"}
            </div>
            <div className="mt-1.5 font-display font-bold text-sm">
              {renewalDate
                ? renewalDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : isPremium
                ? "—"
                : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            {daysLeft !== null && isPremium && (
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {subscription.billingType === "subscription" ? <Repeat className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
              Last payment
            </div>
            {lastPayment ? (
              <>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="font-display font-bold text-sm">
                    ${(lastPayment.amount / 100).toFixed(2)} {lastPayment.currency}
                  </span>
                  {payMeta && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${payMeta.className}`}>
                      {payMeta.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(lastPayment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </>
            ) : (
              <>
                <div className="mt-1.5 font-display font-bold text-sm text-muted-foreground">No payments yet</div>
                <div className="text-xs text-muted-foreground mt-0.5">Free plan</div>
              </>
            )}
          </div>
        </div>

        {/* Scans usage bar (free) */}
        {!isPremium && !loading && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Monthly scans</span>
              <span className="font-medium">
                {scansThisMonth} / {FREE_SCAN_LIMIT}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (scansThisMonth / FREE_SCAN_LIMIT) * 100)}%` }}
              />
            </div>
            {scansRemaining === 0 && (
              <p className="text-xs text-score-poor mt-1.5">
                You've reached your monthly limit. Upgrade to Premium for unlimited scans.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
