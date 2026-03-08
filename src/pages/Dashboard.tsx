import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  FileText,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Globe,
  Zap,
  Eye,
  Shield,
  Clock,
  Activity,
  Target,
  ArrowUpRight,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

type ScanReport = {
  id: string;
  url: string;
  status: string;
  overall_score: number | null;
  created_at: string;
  results: any;
};

const chartConfig = {
  score: { label: "Score", color: "hsl(var(--primary))" },
  performance: { label: "Performance", color: "hsl(var(--primary))" },
  seo: { label: "SEO", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

const Dashboard = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickUrl, setQuickUrl] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from("scan_reports")
        .select("id, url, status, overall_score, created_at, results")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setReports(data);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const stats = useMemo(() => {
    const completed = reports.filter((r) => r.overall_score != null);
    const avgScore = completed.length
      ? Math.round(completed.reduce((s, r) => s + (r.overall_score || 0), 0) / completed.length)
      : 0;
    const avgPerf = completed.length
      ? Math.round(completed.reduce((s, r) => s + (r.results?.mobile?.performance || 0), 0) / completed.length)
      : 0;
    const avgSeo = completed.length
      ? Math.round(completed.reduce((s, r) => s + (r.results?.mobile?.seo || 0), 0) / completed.length)
      : 0;
    const uniqueUrls = new Set(reports.map((r) => r.url)).size;

    // Trend: compare last 5 vs previous 5
    const recent5 = completed.slice(0, 5);
    const prev5 = completed.slice(5, 10);
    const recentAvg = recent5.length ? recent5.reduce((s, r) => s + (r.overall_score || 0), 0) / recent5.length : 0;
    const prevAvg = prev5.length ? prev5.reduce((s, r) => s + (r.overall_score || 0), 0) / prev5.length : 0;
    const trend = prev5.length ? Math.round(recentAvg - prevAvg) : 0;

    return { total: reports.length, avgScore, avgPerf, avgSeo, uniqueUrls, trend };
  }, [reports]);

  const trendChartData = useMemo(() => {
    return [...reports]
      .reverse()
      .slice(-12)
      .map((r) => ({
        date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: r.overall_score || 0,
        performance: r.results?.mobile?.performance || 0,
        seo: r.results?.mobile?.seo || 0,
      }));
  }, [reports]);

  const categoryChartData = useMemo(() => {
    const completed = reports.filter((r) => r.results?.mobile).slice(0, 10);
    if (!completed.length) return [];
    const avg = (key: string) =>
      Math.round(completed.reduce((s, r) => s + (r.results?.mobile?.[key] || 0), 0) / completed.length);
    return [
      { category: "Performance", score: avg("performance") },
      { category: "SEO", score: avg("seo") },
      { category: "Accessibility", score: avg("accessibility") },
      { category: "Best Practices", score: avg("bestPractices") },
    ];
  }, [reports]);

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickUrl.trim()) {
      navigate(`/scan?url=${encodeURIComponent(quickUrl.trim())}`);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-score-excellent";
    if (score >= 50) return "text-score-average";
    return "text-score-poor";
  };

  const getScoreBg = (score: number | null) => {
    if (!score) return "bg-muted";
    if (score >= 90) return "bg-score-excellent";
    if (score >= 50) return "bg-score-average";
    return "bg-score-poor";
  };

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {firstName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Here's how your websites are performing.</p>
          </div>
          <form onSubmit={handleQuickScan} className="flex gap-2">
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Enter URL to scan..."
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                className="pl-8 h-9 w-64 text-sm"
              />
            </div>
            <Button type="submit" size="sm" className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> Scan
            </Button>
          </form>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Scans",
              value: stats.total,
              icon: Activity,
              desc: `${stats.uniqueUrls} unique sites`,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Avg Score",
              value: stats.avgScore || "—",
              icon: Target,
              desc: stats.trend > 0 ? `+${stats.trend} vs previous` : stats.trend < 0 ? `${stats.trend} vs previous` : "No trend data",
              color: "text-accent",
              bg: "bg-accent/10",
              trend: stats.trend,
            },
            {
              label: "Avg Performance",
              value: stats.avgPerf || "—",
              icon: Zap,
              desc: "Mobile performance",
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Avg SEO",
              value: stats.avgSeo || "—",
              icon: Search,
              desc: "Search optimization",
              color: "text-accent",
              bg: "bg-accent/10",
            },
          ].map((stat) => (
            <Card key={stat.label} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="font-display text-3xl font-bold tracking-tight">{stat.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {"trend" in stat && stat.trend !== 0 && (
                    stat.trend! > 0
                      ? <TrendingUp className="h-3 w-3 text-score-excellent" />
                      : <TrendingDown className="h-3 w-3 text-score-poor" />
                  )}
                  <span className="text-xs text-muted-foreground">{stat.desc}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Performance Trend - wider */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-sm font-semibold">Performance Trends</CardTitle>
                  <CardDescription className="text-xs">Score history across recent scans</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">{trendChartData.length} scans</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {trendChartData.length > 1 ? (
                <ChartContainer config={chartConfig} className="h-52 w-full">
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#scoreGrad)" strokeWidth={2} name="Overall" />
                    <Area type="monotone" dataKey="performance" stroke="hsl(var(--accent))" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" name="Performance" />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                  Run more scans to see trends
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Averages */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm font-semibold">Category Averages</CardTitle>
              <CardDescription className="text-xs">Avg scores across all scans</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {categoryChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-52 w-full">
                  <BarChart data={categoryChartData} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={90} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} name="Score" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Scans */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-sm font-semibold">Recent Scans</CardTitle>
                <CardDescription className="text-xs">Latest website audit results</CardDescription>
              </div>
              <Link to="/reports">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No scans yet. Run your first audit!</p>
                <Button size="sm" className="mt-3 gap-1" onClick={() => navigate("/scan")}>
                  <Search className="h-3.5 w-3.5" /> Start Scanning
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">Website</th>
                      <th className="text-center pb-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="text-center pb-2 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Perf</th>
                      <th className="text-center pb-2 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">SEO</th>
                      <th className="text-center pb-2 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Access.</th>
                      <th className="text-right pb-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 8).map((report) => {
                      const m = report.results?.mobile || {};
                      return (
                        <tr key={report.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <span className="truncate max-w-[200px] font-medium text-sm">{report.url.replace(/^https?:\/\//, "")}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <div className="inline-flex items-center justify-center">
                              <span className={`font-display font-bold text-base ${getScoreColor(report.overall_score)}`}>
                                {report.overall_score ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-center hidden sm:table-cell">
                            <span className={`text-xs font-medium ${getScoreColor(m.performance)}`}>{m.performance ?? "—"}</span>
                          </td>
                          <td className="py-3 text-center hidden sm:table-cell">
                            <span className={`text-xs font-medium ${getScoreColor(m.seo)}`}>{m.seo ?? "—"}</span>
                          </td>
                          <td className="py-3 text-center hidden md:table-cell">
                            <span className={`text-xs font-medium ${getScoreColor(m.accessibility)}`}>{m.accessibility ?? "—"}</span>
                          </td>
                          <td className="py-3 text-right text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="py-3 pl-2">
                            <Link to={`/report/${report.id}`}>
                              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
