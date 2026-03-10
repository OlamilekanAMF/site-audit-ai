import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PremiumGate } from "@/components/PremiumGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Trophy, FileText, Wrench, MapPin, ArrowRight } from "lucide-react";

type Opportunity = { title: string; description: string; impact: string };

const impactColors: Record<string, string> = {
  high: "bg-score-excellent/10 text-score-excellent border-score-excellent/20",
  medium: "bg-score-average/10 text-score-average border-score-average/20",
  low: "bg-primary/10 text-primary border-primary/20",
};

const sections = [
  { key: "easy_wins", label: "Easy Wins", icon: Trophy, description: "Quick improvements with immediate impact" },
  { key: "content_opportunities", label: "Content Opportunities", icon: FileText, description: "Content gaps and topics to create" },
  { key: "technical_fixes", label: "Technical Fixes", icon: Wrench, description: "Technical improvements for better performance" },
  { key: "local_seo", label: "Local SEO", icon: MapPin, description: "Local search optimization suggestions" },
] as const;

const RankingOpportunities = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, Opportunity[]> | null>(null);
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { toast } = useToast();

  if (!isPremium) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Ranking Opportunities</h1>
            <p className="text-sm text-muted-foreground mt-0.5">AI-powered analysis to improve your search rankings.</p>
          </div>
          <PremiumGate feature="Ranking Opportunities" />
        </div>
      </DashboardLayout>
    );
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      // Get latest scan data for this URL
      const { data: scanData } = await supabase
        .from("scan_reports")
        .select("results")
        .eq("url", url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const mobile = scanData?.results?.mobile;
      const { data, error } = await supabase.functions.invoke("ranking-opportunities", {
        body: {
          url: url.trim(),
          scanData: mobile ? { performance: mobile.performance, seo: mobile.seo, accessibility: mobile.accessibility } : undefined,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setResults(data.opportunities);
      toast({ title: "Analysis complete!", description: "Ranking opportunities generated." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="font-display text-2xl font-bold">Ranking Opportunities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered analysis to improve your search rankings.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleAnalyze} className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} disabled={loading} className="pl-10" required />
              </div>
              <Button type="submit" disabled={loading} className="gap-2 min-w-[120px]">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing</> : <><Trophy className="h-4 w-4" /> Analyze</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {results && (
          <div className="grid md:grid-cols-2 gap-6">
            {sections.map(({ key, label, icon: Icon, description }) => {
              const items = results[key] || [];
              return (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-display text-sm">{label}</CardTitle>
                        <CardDescription className="text-xs">{description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recommendations in this category.</p>
                    ) : (
                      items.map((item, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${impactColors[item.impact] || "border-border"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{item.title}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{item.impact}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RankingOpportunities;
