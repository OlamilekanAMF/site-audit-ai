import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";

export function PremiumGate({ feature }: { feature: string }) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-display text-xl font-bold">Premium Feature</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {feature} is available exclusively on the Premium plan. Upgrade to unlock unlimited scans, keyword research, SEO reports, and more.
        </p>
        <Link to="/dashboard/pricing">
          <Button className="gap-2">
            <Crown className="h-4 w-4" /> Upgrade to Premium
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
