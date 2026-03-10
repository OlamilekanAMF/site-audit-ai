import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Crown, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DashboardPricing = () => {
  const { plan, isPremium } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ plan: "premium" })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Upgraded to Premium!", description: "You now have access to all features. Refresh to see changes." });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ plan: "free" })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Downgraded to Free", description: "Your plan has been changed. Refresh to see changes." });
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
      price: "$29",
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
            Choose the plan that fits your needs. Currently on: <Badge variant="secondary" className="ml-1 capitalize">{plan}</Badge>
          </p>
        </div>

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
                  <Button className="w-full gap-2" onClick={handleUpgrade} disabled={upgrading}>
                    {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Crown className="h-4 w-4" /> Upgrade to Premium</>}
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
    </DashboardLayout>
  );
};

export default DashboardPricing;
