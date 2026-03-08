import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Globe,
  Zap,
  Eye,
  Shield,
  BarChart3,
  Clock,
  Smartphone,
  Monitor,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

type ScanResults = {
  success: boolean;
  url: string;
  overallScore: number;
  mobile: { performance: number; seo: number; accessibility: number; bestPractices: number };
  desktop: { performance: number; seo: number; accessibility: number; bestPractices: number };
  coreWebVitals: Record<string, { value: number; displayValue: string; score: number; title: string }>;
  loadTime: { value: number; displayValue: string };
  opportunities: { title: string; description: string; savings?: string }[];
  diagnostics: { title: string; description: string; displayValue?: string }[];
};

type Suggestion = {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "easy" | "moderate" | "hard";
};

type AISuggestions = {
  performance: Suggestion[];
  seo: Suggestion[];
  ux: Suggestion[];
};

const chartConfig = {
  mobile: { label: "Mobile", color: "hsl(var(--primary))" },
  desktop: { label: "Desktop", color: "hsl(var(--accent))" },
  score: { label: "Score", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const Scanner = () => {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [results, setResults] = useState<ScanResults | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

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
    setResults(null);
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

      setProgress(70);
      setStatusText("Saving results...");

      // Save to database
      const { error: insertError } = await supabase
        .from("scan_reports")
        .insert({
          url: formattedUrl,
          user_id: user.id,
          status: "completed",
          overall_score: psiData.overallScore,
          results: psiData,
        });

      if (insertError) throw insertError;

      setProgress(100);
      setStatusText("Complete!");
      setResults(psiData);

      toast({ title: "Scan complete!", description: `Overall Score: ${psiData.overallScore}/100` });
    } catch (error: any) {
      console.error("Scan error:", error);
      toast({ title: "Scan failed", description: error.message || "Something went wrong", variant: "destructive" });
    } finally {
      setScanning(false);
      setProgress(0);
      setStatusText("");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-score-excellent";
    if (score >= 50) return "text-score-average";
    return "text-score-poor";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-score-excellent";
    if (score >= 50) return "bg-score-average";
    return "bg-score-poor";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Good";
    if (score >= 50) return "Needs Improvement";
    return "Poor";
  };

  const getCwvIcon = (score: number) => {
    if (score >= 0.9) return <CheckCircle className="h-4 w-4 text-score-excellent" />;
    if (score >= 0.5) return <AlertTriangle className="h-4 w-4 text-score-average" />;
    return <XCircle className="h-4 w-4 text-score-poor" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header & URL Input */}
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

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="md:col-span-1">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
                  <div className={`h-24 w-24 rounded-full border-4 flex items-center justify-center ${
                    results.overallScore >= 90 ? "border-score-excellent" : results.overallScore >= 50 ? "border-score-average" : "border-score-poor"
                  }`}>
                    <span className={`font-display text-3xl font-bold ${getScoreColor(results.overallScore)}`}>
                      {results.overallScore}
                    </span>
                  </div>
                  <Badge className={`mt-2 ${getScoreBg(results.overallScore)} text-white border-0`}>
                    {getScoreLabel(results.overallScore)}
                  </Badge>
                </CardContent>
              </Card>

              {/* Category Score Cards */}
              {[
                { label: "Performance", icon: Zap, mobile: results.mobile.performance, desktop: results.desktop.performance },
                { label: "SEO", icon: Search, mobile: results.mobile.seo, desktop: results.desktop.seo },
                { label: "Accessibility", icon: Eye, mobile: results.mobile.accessibility, desktop: results.desktop.accessibility },
                { label: "Best Practices", icon: Shield, mobile: results.mobile.bestPractices, desktop: results.desktop.bestPractices },
              ].map((cat) => (
                <Card key={cat.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <cat.icon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{cat.label}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Mobile</span>
                        </div>
                        <span className={`font-display font-bold text-lg ${getScoreColor(cat.mobile)}`}>{cat.mobile}</span>
                      </div>
                      <Progress value={cat.mobile} className="h-1.5" />
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Desktop</span>
                        </div>
                        <span className={`font-display font-bold text-lg ${getScoreColor(cat.desktop)}`}>{cat.desktop}</span>
                      </div>
                      <Progress value={cat.desktop} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Core Web Vitals & Charts */}
            <Tabs defaultValue="vitals" className="space-y-4">
              <TabsList>
                <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
                <TabsTrigger value="charts">Comparison Charts</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              </TabsList>

              <TabsContent value="vitals">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(results.coreWebVitals).map(([key, vital]) => (
                    <Card key={key}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{vital.title}</p>
                          {getCwvIcon(vital.score)}
                        </div>
                        <p className={`font-display text-2xl font-bold ${getScoreColor(vital.score * 100)}`}>
                          {vital.displayValue}
                        </p>
                        <div className="mt-2">
                          <Progress value={vital.score * 100} className="h-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Page Load Time */}
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Time to Interactive</p>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="font-display text-2xl font-bold text-primary">
                        {results.loadTime.displayValue}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(results.loadTime.value / 1000).toFixed(1)}s until page is interactive
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="charts">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Bar Chart: Mobile vs Desktop */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display text-base">Mobile vs Desktop Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-72 w-full">
                        <BarChart
                          data={[
                            { category: "Performance", mobile: results.mobile.performance, desktop: results.desktop.performance },
                            { category: "SEO", mobile: results.mobile.seo, desktop: results.desktop.seo },
                            { category: "Accessibility", mobile: results.mobile.accessibility, desktop: results.desktop.accessibility },
                            { category: "Best Practices", mobile: results.mobile.bestPractices, desktop: results.desktop.bestPractices },
                          ]}
                        >
                          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="mobile" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="desktop" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Radar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display text-base">Mobile Score Radar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-72 w-full">
                        <RadarChart
                          data={[
                            { category: "Performance", score: results.mobile.performance },
                            { category: "SEO", score: results.mobile.seo },
                            { category: "Accessibility", score: results.mobile.accessibility },
                            { category: "Best Practices", score: results.mobile.bestPractices },
                          ]}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RadarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="opportunities">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Opportunities */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-score-average" />
                        Opportunities
                      </CardTitle>
                      <CardDescription>Suggestions to improve page load speed</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {results.opportunities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No major opportunities found — great job!</p>
                      ) : (
                        <div className="space-y-3">
                          {results.opportunities.map((opp, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
                              <TrendingUp className="h-4 w-4 text-score-average shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{opp.title}</p>
                                {opp.savings && (
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    Potential savings: {opp.savings}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Diagnostics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Diagnostics
                      </CardTitle>
                      <CardDescription>Additional information about your page</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {results.diagnostics.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No diagnostics to show</p>
                      ) : (
                        <div className="space-y-3">
                          {results.diagnostics.map((diag, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
                              <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{diag.title}</p>
                                {diag.displayValue && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{diag.displayValue}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty state info */}
        {!results && !scanning && (
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
