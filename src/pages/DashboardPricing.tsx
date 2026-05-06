import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Crown,
  Loader2,
  Repeat,
  Zap,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

const DashboardPricing = () => {
  const { plan, isPremium } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [planStatus, setPlanStatus] = useState<{
    has_plan_code: boolean;
    plan_code: string | null;
    public_key: string | null;
  } | null>(null);

  // Fetch Paystack config status when dialog opens
  useEffect(() => {
    if (!checkoutOpen || planStatus) return;
    supabase.functions
      .invoke("paystack-config", { body: {} })
      .then(({ data }) => {
        if (data) setPlanStatus(data);
      })
      .catch(() => {});
  }, [checkoutOpen, planStatus]);

  // Lazy-load Paystack inline script
  useEffect(() => {
    if (!checkoutOpen) return;
    if (document.getElementById("paystack-inline-js")) return;
    const s = document.createElement("script");
    s.id = "paystack-inline-js";
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    document.body.appendChild(s);
  }, [checkoutOpen]);
  const [billingType, setBillingType] = useState<"one_time" | "subscription">("subscription");
  const [verifying, setVerifying] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Verify Paystack redirect
  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) return;
    setVerifying(true);
    supabase.functions
      .invoke("paystack-verify", { body: { reference } })
      .then(({ data, error }) => {
        if (error) throw error;
        if (data?.status === "success") {
          toast({ title: "Payment successful!", description: "Welcome to Premium." });
          setTimeout(() => window.location.replace("/dashboard/pricing"), 1200);
        } else {
          toast({
            title: "Payment not completed",
            description: `Status: ${data?.status || "unknown"}`,
            variant: "destructive",
          });
        }
      })
      .catch((err) => {
        toast({ title: "Verification failed", description: err.message, variant: "destructive" });
      })
      .finally(() => {
        setVerifying(false);
        const next = new URLSearchParams(searchParams);
        next.delete("reference");
        next.delete("trxref");
        next.delete("paystack");
        setSearchParams(next, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCheckout = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          billing_type: billingType,
          callback_url: `${window.location.origin}/dashboard/pricing`,
        },
      });
      if (error) throw error;
      if (!data?.access_code) throw new Error("No checkout reference returned");

      // Prefer Paystack Inline if public key is available and script loaded
      const PaystackPop = (window as any).PaystackPop;
      if (planStatus?.public_key && PaystackPop) {
        const handler = PaystackPop.setup({
          key: planStatus.public_key,
          email: user.email,
          amount: 1900,
          currency: "USD",
          ref: data.reference,
          plan: billingType === "subscription" ? planStatus.plan_code || undefined : undefined,
          onClose: () => setUpgrading(false),
          callback: (response: { reference: string }) => {
            // Verify on the server before activating
            supabase.functions
              .invoke("paystack-verify", { body: { reference: response.reference } })
              .then(({ data: vd, error: verr }) => {
                if (verr) throw verr;
                if (vd?.status === "success") {
                  toast({ title: "Payment successful!", description: "Welcome to Premium." });
                  setTimeout(() => window.location.replace("/dashboard/pricing"), 1000);
                } else {
                  toast({
                    title: "Payment not completed",
                    description: `Status: ${vd?.status || "unknown"}`,
                    variant: "destructive",
                  });
                  setUpgrading(false);
                }
              })
              .catch((e) => {
                toast({ title: "Verification failed", description: e.message, variant: "destructive" });
                setUpgrading(false);
              });
          },
        });
        handler.openIframe();
        return;
      }

      // Fallback: redirect checkout
      if (!data?.authorization_url) throw new Error("No checkout URL returned");
      window.location.href = data.authorization_url;
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      const { error } = await supabase.functions.invoke("paystack-cancel");
      if (error) throw error;
      toast({ title: "Downgraded to Free", description: "Your plan has been changed." });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out SiteDoctor AI",
      features: [
        { text: "3 scans per month", included: true },
        { text: "Basic audit reports", included: true },
        { text: "SEO analysis", included: true },
        { text: "Email support", included: true },
        { text: "Keyword Research", included: false },
        { text: "Monthly SEO Reports", included: false },
        { text: "Ranking Opportunities", included: false },
        { text: "Advanced PDF Reports", included: false },
      ],
      current: plan === "free",
      popular: false,
    },
    {
      name: "Premium",
      price: "$19",
      period: "per month",
      description: "For professionals who need deeper insights",
      features: [
        { text: "Unlimited scans", included: true },
        { text: "Full audit reports", included: true },
        { text: "SEO analysis", included: true },
        { text: "Priority support", included: true },
        { text: "Keyword Research", included: true },
        { text: "Monthly SEO Reports", included: true },
        { text: "Ranking Opportunities", included: true },
        { text: "Advanced PDF Reports", included: true },
      ],
      current: plan === "premium",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      description: "For teams and agencies at scale",
      features: [
        { text: "Everything in Premium", included: true },
        { text: "Team collaboration", included: true },
        { text: "API access", included: true },
        { text: "White-label reports", included: true },
        { text: "Custom integrations", included: true },
        { text: "Dedicated support", included: true },
        { text: "Custom branding", included: true },
        { text: "SLA guarantee", included: true },
      ],
      current: false,
      popular: false,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Billing & Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose the plan that fits your needs. Currently on:{" "}
            <Badge variant="secondary" className="ml-1 capitalize">{plan}</Badge>
          </p>
        </div>

        {verifying && (
          <Card className="border-primary/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verifying your payment with Paystack…</span>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={`relative flex flex-col ${
                p.popular ? "border-primary shadow-lg scale-105" : ""
              } ${p.current ? "ring-2 ring-primary" : ""}`}
            >
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              {p.current && (
                <Badge className="absolute -top-3 right-4 bg-accent text-accent-foreground">
                  Current Plan
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="font-display">{p.name}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
                <div className="mt-4">
                  <span className="font-display text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground ml-1">/{p.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {p.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={feature.included ? "" : "text-muted-foreground"}>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {p.name === "Free" && plan === "premium" ? (
                  <Button className="w-full" variant="outline" onClick={handleDowngrade} disabled={upgrading}>
                    {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Downgrade"}
                  </Button>
                ) : p.name === "Premium" && !isPremium ? (
                  <Button
                    className="w-full gap-2"
                    onClick={() => setCheckoutOpen(true)}
                    disabled={upgrading}
                  >
                    <Crown className="h-4 w-4" /> Upgrade to Premium
                  </Button>
                ) : p.name === "Enterprise" ? (
                  <Button className="w-full" variant="outline">Contact Sales</Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>Current Plan</Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose how you want to pay</DialogTitle>
            <DialogDescription>
              Secure checkout powered by Paystack. You'll be redirected to complete your payment.
            </DialogDescription>
          </DialogHeader>

          {/* Segmented toggle */}
          <div
            role="radiogroup"
            aria-label="Billing type"
            className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billingType === "subscription"}
              onClick={() => setBillingType("subscription")}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                billingType === "subscription"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Repeat className="h-4 w-4" /> Monthly
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billingType === "one_time"}
              onClick={() => setBillingType("one_time")}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                billingType === "one_time"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="h-4 w-4" /> One-time
            </button>
          </div>

          {/* Selected option summary */}
          <div className="rounded-lg border p-4 space-y-3">
            {billingType === "subscription" ? (
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Monthly subscription</div>
                  <div className="font-display text-lg font-bold">$19<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-renews each month via Paystack. Cancel anytime.
                </p>

                {/* Paystack plan-code status */}
                <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs">
                  {planStatus === null ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Checking Paystack plan configuration…</span>
                    </>
                  ) : planStatus.has_plan_code ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-foreground">Recurring plan configured</div>
                        <div className="text-muted-foreground">Monthly subscription billing is enabled.</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-foreground">No Paystack plan code set</div>
                        <div className="text-muted-foreground">
                          You'll be charged once for $19 (no auto-renewal). Add a <code className="font-mono">PAYSTACK_PLAN_CODE</code> secret to enable true recurring billing.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">One-time payment</div>
                  <div className="font-display text-lg font-bold">$19</div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  30 days of Premium access. No automatic renewal.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)} disabled={upgrading}>
              Cancel
            </Button>
            <Button onClick={startCheckout} disabled={upgrading} className="gap-2">
              {upgrading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Crown className="h-4 w-4" /> Continue to Paystack
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardPricing;
