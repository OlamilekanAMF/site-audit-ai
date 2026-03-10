import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Globe, Zap } from "lucide-react";

const Scanner = () => {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const prefillUrl = searchParams.get("url");
    if (prefillUrl) setUrl(prefillUrl);
  }, [searchParams]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !user) return;

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setScanning(true);
    setProgress(10);
    setStatusText("Initializing scan...");

    try {
      setProgress(20);
      setStatusText("Running Google PageSpeed Insights (mobile & desktop)...");

      const { data: psiData, error: psiError } = await supabase.functions.invoke("pagespeed-insights", {
        body: { url: formattedUrl },
      });

      if (psiError) throw psiError;
      if (!psiData.success) throw new Error(psiData.error || "PageSpeed analysis failed");

      setProgress(60);
      setStatusText("Generating AI optimization suggestions...");

      const aiResult = await supabase.functions.invoke("ai-suggestions", { body: { scanResults: psiData } });
      const aiSuggestionsData = aiResult.data?.success ? aiResult.data.suggestions : null;

      const { data: insertData, error: insertError } = await supabase.from("scan_reports").insert({
        url: formattedUrl,
        user_id: user.id,
        status: "completed",
        overall_score: psiData.overallScore,
        results: { ...psiData, aiSuggestions: aiSuggestionsData },
      }).select("id").single();

      if (insertError) throw insertError;

      setProgress(100);
      setStatusText("Complete!");

      toast({ title: "Scan complete!", description: `Overall Score: ${psiData.overallScore}/100` });

      // Navigate to the report page with the new report
      navigate(`/report/${insertData.id}`);
    } catch (error: any) {
      console.error("Scan error:", error);
      toast({ title: "Scan failed", description: error.message || "Something went wrong", variant: "destructive" });
      setScanning(false);
      setProgress(0);
      setStatusText("");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Website Scanner</h1>
          <p className="text-muted-foreground mt-1">
            Analyze any website using Google PageSpeed Insights.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleScan} className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={scanning}
                  className="pl-10"
                  required
                />
              </div>
              <Button type="submit" disabled={scanning} className="gap-2 min-w-[120px]">
                {scanning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Scanning</>
                ) : (
                  <><Search className="h-4 w-4" /> Scan Now</>
                )}
              </Button>
            </form>
            {scanning && (
              <div className="mt-4 space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{statusText}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info card when not scanning */}
        {!scanning && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Zap className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Powered by Google PageSpeed Insights</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Performance, SEO, Accessibility & Best Practices scores</li>
                    <li>Core Web Vitals (LCP, FID, CLS, FCP, TBT, Speed Index)</li>
                    <li>Mobile & Desktop comparison</li>
                    <li>Actionable optimization opportunities</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Scanner;
