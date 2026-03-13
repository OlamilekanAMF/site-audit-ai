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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Swords, Plus, X, Loader2, TrendingUp, TrendingDown, Minus, Globe, Zap,
  Search, Shield, Eye, BarChart3, Lightbulb, Save, Clock, Trash2, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SiteData = {
  url: string;
  mobile: { performance: number; seo: number; accessibility: number; bestPractices: number; fcp: string; lcp: string; cls: string; tbt: string; si: string } | null;
  desktop: { performance: number; seo: number; accessibility: number; bestPractices: number; fcp: string; lcp: string; cls: string; tbt: string; si: string } | null;
  overallScore: number;
};

type AnalysisResult = {
  yourSite: SiteData;
  competitors: SiteData[];
  insights: string[];
};

type SavedComparison = {
  id: string;
  your_url: string;
  competitor_urls: string[];
  results: AnalysisResult;
  created_at: string;
};

const METRICS = [
  { key: "performance", label: "Performance", icon: Zap },
  { key: "seo", label: "SEO", icon: Search },
  { key: "accessibility", label: "Accessibility", icon: Eye },
  { key: "bestPractices", label: "Best Practices", icon: Shield },
] as const;

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-score-excellent";
  if (score >= 50) return "text-score-average";
  return "text-score-poor";
};

const getScoreBg = (score: number) => {
  if (score >= 90) return "bg-score-excellent/10";
  if (score >= 50) return "bg-score-average/10";
  return "bg-score-poor/10";
};

const DiffBadge = ({ yours, theirs }: { yours: number; theirs: number }) => {
  const diff = yours - theirs;
  if (diff > 0) return <Badge variant="outline" className="text-score-excellent border-score-excellent/30 text-[10px] gap-0.5"><TrendingUp className="h-3 w-3" />+{diff}</Badge>;
  if (diff < 0) return <Badge variant="outline" className="text-score-poor border-score-poor/30 text-[10px] gap-0.5"><TrendingDown className="h-3 w-3" />{diff}</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-[10px] gap-0.5"><Minus className="h-3 w-3" />0</Badge>;
};

const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

const CompetitorAnalysis = () => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { toast } = useToast();
  const [yourUrl, setYourUrl] = useState("");
  const [competitorInputs, setCompetitorInputs] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [previousResult, setPreviousResult] = useState<AnalysisResult | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("competitor_comparisons")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setSavedComparisons(data as unknown as SavedComparison[]);
        setLoadingHistory(false);
      });
  }, [user]);

  const addCompetitor = () => {
    if (competitorInputs.length < 4) setCompetitorInputs([...competitorInputs, ""]);
  };

  const removeCompetitor = (i: number) => {
    setCompetitorInputs(competitorInputs.filter((_, idx) => idx !== i));
  };

  const updateCompetitor = (i: number, v: string) => {
    const copy = [...competitorInputs];
    copy[i] = v;
    setCompetitorInputs(copy);
  };

  const runAnalysis = async (yourUrlInput: string, competitorUrlsInput: string[]) => {
    const { data, error } = await supabase.functions.invoke("competitor-analysis", {
      body: { yourUrl: yourUrlInput.trim(), competitorUrls: competitorUrlsInput },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Analysis failed");
    return data as AnalysisResult;
  };

  const handleAnalyze = async () => {
    const competitors = competitorInputs.filter((u) => u.trim());
    if (!yourUrl.trim() || !competitors.length) {
      toast({ title: "Missing URLs", description: "Enter your URL and at least one competitor.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setPreviousResult(null);

    try {
      const data = await runAnalysis(yourUrl, competitors);
      setResult(data);
      toast({ title: "Analysis Complete", description: `Compared against ${data.competitors.length} competitor(s).` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Analysis failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async (comp: SavedComparison) => {
    setRerunningId(comp.id);
    setPreviousResult(comp.results);
    setYourUrl(comp.your_url);
    setCompetitorInputs(comp.competitor_urls.length ? comp.competitor_urls : [""]);
    setResult(null);

    try {
      const data = await runAnalysis(comp.your_url, comp.competitor_urls);
      setResult(data);
      toast({ title: "Re-run Complete", description: "Compare new scores with previous results below." });
    } catch (err: any) {
      setPreviousResult(null);
      toast({ title: "Error", description: err.message || "Re-run failed", variant: "destructive" });
    } finally {
      setRerunningId(null);
    }
  };

  const handleSave = async () => {
    if (!result || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("competitor_comparisons").insert({
        user_id: user.id,
        your_url: result.yourSite.url,
        competitor_urls: result.competitors.map((c) => c.url),
        results: result as any,
      }).select().single();

      if (error) throw error;
      setSavedComparisons((prev) => [data as unknown as SavedComparison, ...prev]);
      toast({ title: "Saved", description: "Comparison saved to history." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadComparison = (comp: SavedComparison) => {
    setYourUrl(comp.your_url);
    setCompetitorInputs(comp.competitor_urls.length ? comp.competitor_urls : [""]);
    setResult(comp.results);
    toast({ title: "Loaded", description: "Previous comparison loaded." });
  };

  const handleDeleteComparison = async (id: string) => {
    const { error } = await supabase.from("competitor_comparisons").delete().eq("id", id);
    if (!error) {
      setSavedComparisons((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Deleted", description: "Comparison removed." });
    }
  };

  return (
    <DashboardLayout>
      <PremiumGate feature="Competitor Analysis">
        <div className="space-y-6 max-w-7xl">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Swords className="h-6 w-6 text-primary" /> Competitor Analysis
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compare your website's SEO metrics against competitors to find advantages and gaps.
            </p>
          </div>

          {/* Input Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display">Enter URLs</CardTitle>
              <CardDescription className="text-xs">Your website + up to 4 competitors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your Website</label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                  <Input placeholder="yourwebsite.com" value={yourUrl} onChange={(e) => setYourUrl(e.target.value)} disabled={loading} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Competitors</label>
                {competitorInputs.map((val, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input placeholder={`competitor${i + 1}.com`} value={val} onChange={(e) => updateCompetitor(i, e.target.value)} disabled={loading} />
                    {competitorInputs.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeCompetitor(i)} disabled={loading}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {competitorInputs.length < 4 && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addCompetitor} disabled={loading}>
                    <Plus className="h-3 w-3" /> Add Competitor
                  </Button>
                )}
              </div>

              <Button onClick={handleAnalyze} disabled={loading} className="w-full gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><BarChart3 className="h-4 w-4" /> Compare Websites</>}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Save Button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Comparison
                </Button>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[result.yourSite, ...result.competitors].map((site, i) => (
                  <Card key={site.url} className={i === 0 ? "border-primary/40 ring-1 ring-primary/20" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {i === 0 ? <Globe className="h-4 w-4 text-primary shrink-0" /> : <Swords className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <span className="text-sm font-medium truncate">{shortUrl(site.url)}</span>
                        </div>
                        {i === 0 && <Badge className="shrink-0 text-[10px]">You</Badge>}
                      </div>
                      <div className="text-center mb-3">
                        <span className={`font-display text-4xl font-bold ${getScoreColor(site.overallScore || 0)}`}>
                          {site.overallScore ?? "—"}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Overall Score</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {METRICS.map((m) => {
                          const score = site.mobile?.[m.key as keyof typeof site.mobile] as number || 0;
                          return (
                            <div key={m.key} className={`rounded-lg p-2 ${getScoreBg(score)}`}>
                              <p className="text-[10px] text-muted-foreground">{m.label}</p>
                              <div className="flex items-center justify-between">
                                <span className={`font-display font-bold text-sm ${getScoreColor(score)}`}>{score}</span>
                                {i > 0 && result.yourSite.mobile && <DiffBadge yours={(result.yourSite.mobile as any)?.[m.key] || 0} theirs={score} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detailed Comparison Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-sm">Detailed Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="mobile">
                    <TabsList className="mb-3">
                      <TabsTrigger value="mobile" className="text-xs">Mobile</TabsTrigger>
                      <TabsTrigger value="desktop" className="text-xs">Desktop</TabsTrigger>
                    </TabsList>
                    {(["mobile", "desktop"] as const).map((strategy) => (
                      <TabsContent key={strategy} value={strategy}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 text-xs font-medium text-muted-foreground">Metric</th>
                                {[result.yourSite, ...result.competitors].map((site, i) => (
                                  <th key={site.url} className="text-center py-2 text-xs font-medium text-muted-foreground">
                                    {i === 0 ? "You" : shortUrl(site.url)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                ...METRICS.map((m) => ({ key: m.key, label: m.label })),
                                { key: "fcp", label: "FCP" },
                                { key: "lcp", label: "LCP" },
                                { key: "cls", label: "CLS" },
                                { key: "tbt", label: "TBT" },
                                { key: "si", label: "Speed Index" },
                              ].map((metric) => (
                                <tr key={metric.key} className="border-b border-border/50">
                                  <td className="py-2 text-xs font-medium">{metric.label}</td>
                                  {[result.yourSite, ...result.competitors].map((site, i) => {
                                    const val = (site as any)[strategy]?.[metric.key];
                                    const isNumericScore = METRICS.some((m) => m.key === metric.key);
                                    return (
                                      <td key={site.url} className="text-center py-2">
                                        {val != null ? (
                                          <span className={isNumericScore ? `font-bold ${getScoreColor(val as number)}` : "text-xs"}>
                                            {val}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* AI Insights */}
              {result.insights?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" /> Competitive Insights
                    </CardTitle>
                    <CardDescription className="text-xs">AI-generated recommendations based on your comparison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-3">
                      {result.insights.map((insight, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">{i + 1}</span>
                          </div>
                          <p className="text-sm">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Saved Comparisons History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Comparison History
              </CardTitle>
              <CardDescription className="text-xs">Your saved competitor comparisons</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : savedComparisons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No saved comparisons yet. Run an analysis and save it.</p>
              ) : (
                <div className="space-y-2">
                  {savedComparisons.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group"
                    >
                      <button
                        onClick={() => handleLoadComparison(comp)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{shortUrl(comp.your_url)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            vs {comp.competitor_urls.map(shortUrl).join(", ")}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-display font-bold ${getScoreColor(comp.results?.yourSite?.overallScore || 0)}`}>
                          {comp.results?.yourSite?.overallScore ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteComparison(comp.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PremiumGate>
    </DashboardLayout>
  );
};

export default CompetitorAnalysis;
