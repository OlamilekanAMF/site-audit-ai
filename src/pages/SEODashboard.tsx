import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity, Target, TrendingUp, Search, FileText, ArrowRight, Zap, Shield, Globe, Crown,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";

const chartConfig = {
  score: { label: "Score", color: "hsl(var(--primary))" },
  performance: { label: "Performance", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

const SEODashboard = () => {
  const { user } = useAuth();
  const { isPremium, scansThisMonth, scansRemaining, FREE_SCAN_LIMIT } = useSubscription();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [seoReportCount, setSeoReportCount] = useState(0);
  const [keywordCount, setKeywordCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("scan_reports").select("id, url, overall_score, created_at, results, status").eq("status", "completed").order("created_at", { ascending: false }).limit(20),
      supabase.from("seo_reports").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("saved_keywords").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([scans, seo, kw]) => {
      if (scans.data) setReports(scans.data);
      setSeoReportCount(seo.count || 0);
      setKeywordCount(kw.count || 0);
      setLoading(false);
    });
  }, [user]);

  const stats = useMemo(() => {
    const completed = reports.filter((r) => r.overall_score != null);
    const avgScore = completed.length ? Math.round(completed.reduce((s, r) => s + (r.overall_score || 0), 0) / completed.length) : 0;
    const avgSeo = completed.length ? Math.round(completed.reduce((s, r) => s + (r.results?.mobile?.seo || 0), 0) / completed.length) : 0;
    const avgPerf = completed.length ? Math.round(completed.reduce((s, r) => s + (r.results?.mobile?.performance || 0), 0) / completed.length) : 0;
    return { avgScore, avgSeo, avgPerf, total: completed.length };
  }, [reports]);

  const trendData = useMemo(() => {
    return [...reports].reverse().slice(-12).map((r) => ({
      date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: r.overall_score || 0,
      performance: r.results?.mobile?.performance || 0,
    }));
  }, [reports]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-score-excellent";
    if (score >= 50) return "text-score-average";
    return "text-score-poor";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">SEO Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Overview of your SEO performance and opportunities.</p>
          </div>
          {!isPremium && (
            <Link to="/dashboard/pricing">
              <Button size="sm" className="gap-1.5">
                <Crown className="h-3.5 w-3.5" /> Upgrade
              </Button>
            </Link>
          )}
        </div>

        {/* Plan Status */}
        {!isPremium && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Free Plan — {scansRemaining} scans remaining</p>
                  <p className="text-xs text-muted-foreground">{scansThisMonth}/{FREE_SCAN_LIMIT} scans used this month</p>
                </div>
              </div>
              <Progress value={(scansThisMonth / FREE_SCAN_LIMIT) * 100} className="w-32 h-2" />
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Health Score", value: stats.avgScore, icon: Activity, color: "text-primary", bg: "bg-primary/10" },
            { label: "SEO Score", value: stats.avgSeo, icon: Search, color: "text-accent", bg: "bg-accent/10" },
            { label: "Performance", value: stats.avgPerf, icon: Zap, color: "text-primary", bg: "bg-primary/10" },
            { label: "Keywords Saved", value: keywordCount, icon: Target, color: "text-accent", bg: "bg-accent/10" },
            { label: "SEO Reports", value: seoReportCount, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
          ].map((s) => (
            <Card key={s.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
                  <div className={`h-7 w-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  </div>
                </div>
                <p className="font-display text-2xl font-bold">{s.value || "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm">Score Trends</CardTitle>
              <CardDescription className="text-xs">Performance over recent scans</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 1 ? (
                <ChartContainer config={chartConfig} className="h-52 w-full">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="seoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#seoGrad)" strokeWidth={2} name="Overall" />
                    <Area type="monotone" dataKey="performance" stroke="hsl(var(--accent))" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" name="Performance" />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Run more scans to see trends</div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm">Quick Actions</CardTitle>
              <CardDescription className="text-xs">Tools and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Scan a Website", desc: "Run a full audit", to: "/scan", icon: Globe },
                { label: "Keyword Research", desc: "Find keyword opportunities", to: "/keywords", icon: Search, premium: true },
                { label: "Ranking Opportunities", desc: "Improve your rankings", to: "/opportunities", icon: TrendingUp, premium: true },
                { label: "SEO Reports", desc: "Monthly performance reports", to: "/seo-reports", icon: FileText, premium: true },
                { label: "Competitor Analysis", desc: "Compare against competitors", to: "/competitor-analysis", icon: Shield, premium: true },
              ].map((action) => (
                <Link key={action.to} to={action.to}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <action.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {action.label}
                          {action.premium && !isPremium && <Badge variant="secondary" className="text-[9px] py-0">PRO</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{action.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Audits */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm">Recent Audits</CardTitle>
              <Link to="/reports"><Button variant="ghost" size="sm" className="gap-1 text-xs h-7">View All <ArrowRight className="h-3 w-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No scans yet.</p>
            ) : (
              <div className="space-y-2">
                {reports.slice(0, 5).map((r) => (
                  <Link key={r.id} to={`/report/${r.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{r.url.replace(/^https?:\/\//, "")}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-display font-bold ${getScoreColor(r.overall_score || 0)}`}>{r.overall_score ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SEODashboard;
