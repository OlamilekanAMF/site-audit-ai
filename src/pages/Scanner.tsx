import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Globe, AlertCircle } from "lucide-react";

const Scanner = () => {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const prefillUrl = searchParams.get("url");
    if (prefillUrl) {
      setUrl(prefillUrl);
    }
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
    setStatusText("Creating scan report...");

    try {
      // Create report
      const { data: report, error: insertError } = await supabase
        .from("scan_reports")
        .insert({ url: formattedUrl, user_id: user.id, status: "scanning" })
        .select()
        .single();

      if (insertError) throw insertError;

      setProgress(25);
      setStatusText("Scraping website with Firecrawl...");

      // Scrape
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("firecrawl-scrape", {
        body: { url: formattedUrl, options: { formats: ["markdown", "html", "links"] } },
      });

      if (scrapeError) throw scrapeError;

      setProgress(60);
      setStatusText("Analyzing website content...");

      // Analyze
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-website", {
        body: { url: formattedUrl, scrapeData },
      });

      if (analysisError) throw analysisError;

      setProgress(90);
      setStatusText("Saving results...");

      // Update report
      const { error: updateError } = await supabase
        .from("scan_reports")
        .update({
          status: "completed",
          overall_score: analysisData.overallScore,
          results: analysisData,
        })
        .eq("id", report.id);

      if (updateError) throw updateError;

      setProgress(100);
      setStatusText("Complete!");

      toast({ title: "Scan complete!", description: `Score: ${analysisData.overallScore}/100` });
      setTimeout(() => navigate(`/report/${report.id}`), 500);
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
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Website Scanner</h1>
          <p className="text-muted-foreground mt-1">
            Enter a URL to run a comprehensive website audit.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Scan a Website
            </CardTitle>
            <CardDescription>
              We'll crawl the page and analyze performance, SEO, and best practices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={scanning}
                  className="flex-1"
                  required
                />
                <Button type="submit" disabled={scanning} className="gap-2">
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Scanning
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" /> Scan
                    </>
                  )}
                </Button>
              </div>

              {scanning && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground">{statusText}</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How it works</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>We use Firecrawl to fetch your website's content</li>
                  <li>AI analyzes HTML structure, meta tags, headings, images, and links</li>
                  <li>You get a scored report with specific recommendations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Scanner;
