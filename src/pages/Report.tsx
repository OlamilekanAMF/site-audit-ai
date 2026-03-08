import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  Search,
  Eye,
  Shield,
  Clock,
  Smartphone,
  Monitor,
  TrendingUp,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";

const chartConfig = {
  mobile: { label: "Mobile", color: "hsl(var(--primary))" },
  desktop: { label: "Desktop", color: "hsl(var(--accent))" },
  score: { label: "Score", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const impactColors: Record<string, string> = {
  high: "bg-score-poor/10 text-score-poor border-score-poor/20",
  medium: "bg-score-average/10 text-score-average border-score-average/20",
  low: "bg-score-excellent/10 text-score-excellent border-score-excellent/20",
};

const effortLabels: Record<string, string> = {
  easy: "🟢 Easy",
  moderate: "🟡 Moderate",
  hard: "🔴 Hard",
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-score-excellent";
  if (score >= 50) return "text-score-average";
  return "text-score-poor";
};

const getScoreBorderColor = (score: number) => {
  if (score >= 90) return "border-score-excellent";
  if (score >= 50) return "border-score-average";
  return "border-score-poor";
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

// -- Score Circle Component --
const ScoreCircle = ({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) => {
  const dims = size === "lg" ? "h-28 w-28" : "h-20 w-20";
  const textSize = size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${dims} rounded-full border-4 flex items-center justify-center ${getScoreBorderColor(score)}`}>
        <span className={`font-display ${textSize} font-bold ${getScoreColor(score)}`}>{score}</span>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <Badge className={`${getScoreBg(score)} text-white border-0 text-xs`}>{getScoreLabel(score)}</Badge>
    </div>
  );
};

// -- Suggestion Section Component --
const SuggestionSection = ({
  title,
  icon,
  suggestions,
}: {
  title: string;
  icon: React.ReactNode;
  suggestions: any[];
}) => (
  <div className="space-y-3">
    <h3 className="font-display text-sm font-semibold flex items-center gap-2">{icon} {title}</h3>
    {!suggestions || suggestions.length === 0 ? (
      <p className="text-sm text-muted-foreground py-2">No suggestions in this category.</p>
    ) : (
      suggestions.map((s: any, i: number) => (
        <div key={i} className="p-4 rounded-lg border border-border space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">{s.title}</p>
            <div className="flex gap-2 shrink-0">
              <Badge variant="outline" className={`text-xs ${impactColors[s.impact] || ""}`}>
                {s.impact} impact
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {effortLabels[s.effort] || s.effort}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{s.description}</p>
        </div>
      ))
    )}
  </div>
);

const Report = () => {
  const { id } = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [historyScans, setHistoryScans] = useState<any[]>([]);

  useEffect(() => {
    const fetchReport = async () => {
      const { data } = await supabase
        .from("scan_reports")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        setReport(data);
        // Fetch all completed scans for the same URL
        const { data: history } = await supabase
          .from("scan_reports")
          .select("id, created_at, overall_score, results, url")
          .eq("url", data.url)
          .eq("user_id", data.user_id)
          .eq("status", "completed")
          .order("created_at", { ascending: true });
        if (history) setHistoryScans(history);
      }
      setLoading(false);
    };
    fetchReport();
  }, [id]);

  const historyChartData = useMemo(() => {
    return historyScans.map((scan) => {
      const cwv = scan.results?.coreWebVitals || {};
      return {
        date: new Date(scan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: new Date(scan.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        id: scan.id,
        overall: scan.overall_score || 0,
        lcp: cwv.lcp?.value ? Math.round(cwv.lcp.value) : null,
        cls: cwv.cls?.value != null ? Number(cwv.cls.value.toFixed(3)) : null,
        tbt: cwv.tbt?.value ? Math.round(cwv.tbt.value) : null,
        fcp: cwv.fcp?.value ? Math.round(cwv.fcp.value) : null,
        performance: scan.results?.mobile?.performance || 0,
        seo: scan.results?.mobile?.seo || 0,
        accessibility: scan.results?.mobile?.accessibility || 0,
      };
    });
  }, [historyScans]);

  const results = report?.results || {};
  const mobile = results.mobile || {};
  const desktop = results.desktop || {};
  const coreWebVitals = results.coreWebVitals || {};
  const loadTime = results.loadTime || {};
  const opportunities = results.opportunities || [];
  const diagnostics = results.diagnostics || [];
  const aiSuggestions = results.aiSuggestions || null;

  const barData = [
    { category: "Performance", mobile: mobile.performance || 0, desktop: desktop.performance || 0 },
    { category: "SEO", mobile: mobile.seo || 0, desktop: desktop.seo || 0 },
    { category: "Accessibility", mobile: mobile.accessibility || 0, desktop: desktop.accessibility || 0 },
    { category: "Best Practices", mobile: mobile.bestPractices || 0, desktop: desktop.bestPractices || 0 },
  ];

  const radarData = barData.map((d) => ({ category: d.category, score: d.mobile }));

  const handleDownloadPdf = useCallback(async () => {
    if (!report) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const pageMargin = 18;
      const cW = W - pageMargin * 2;
      let y = 20;

      const addPage = () => { doc.addPage(); y = 20; };
      const checkPage = (need: number) => { if (y + need > 270) addPage(); };

      // Blue gradient header
      const gSteps = 20;
      const hH = 52;
      for (let i = 0; i < gSteps; i++) {
        const t = i / gSteps;
        const r = Math.round(30 + t * (59 - 30));
        const g = Math.round(64 + t * (130 - 64));
        const b = Math.round(175 + t * (246 - 175));
        doc.setFillColor(r, g, b);
        doc.rect(0, (hH / gSteps) * i, W, hH / gSteps + 0.5, "F");
      }

      // Logo: SiteDoctor AI text branding
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("SiteDoctor AI", pageMargin, 14);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(219, 234, 254);
      doc.text("Website Performance & SEO Audit Platform", pageMargin, 19);

      // Decorative line separator
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.line(pageMargin, 22, pageMargin + 50, 22);

      // Report title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Website Audit Report", pageMargin, 32);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(219, 234, 254);
      doc.text(report.url, pageMargin, 39);
      doc.text(`Scan Date: ${new Date(report.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageMargin, 45);

      // Generated date on right
      doc.setFontSize(8);
      doc.setTextColor(191, 219, 254);
      const genText = `Report #${report.id.slice(0, 8).toUpperCase()}`;
      doc.text(genText, W - pageMargin - doc.getTextWidth(genText), 14);

      y = 60;

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Score Summary", pageMargin, y);
      y += 8;

      const scoreColor = (s: number): [number, number, number] =>
        s >= 90 ? [22, 163, 74] : s >= 50 ? [234, 179, 8] : [220, 38, 38];

      const drawScore = (label: string, score: number, x: number) => {
        const [r, g, b] = scoreColor(score);
        doc.setFillColor(r, g, b);
        doc.circle(x + 12, y + 10, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        const scoreStr = String(score);
        doc.text(scoreStr, x + 12 - doc.getTextWidth(scoreStr) / 2, y + 14);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const labelW2 = doc.getTextWidth(label);
        doc.text(label, x + 12 - labelW2 / 2, y + 24);
      };

      const cols = 5;
      const colW = cW / cols;
      drawScore("Overall", report.overall_score || 0, pageMargin);
      drawScore("Performance", mobile.performance || 0, pageMargin + colW);
      drawScore("SEO", mobile.seo || 0, pageMargin + colW * 2);
      drawScore("Accessibility", mobile.accessibility || 0, pageMargin + colW * 3);
      drawScore("Best Practices", mobile.bestPractices || 0, pageMargin + colW * 4);
      y += 32;

      checkPage(40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text("Mobile vs Desktop", pageMargin, y);
      y += 7;
      doc.setFillColor(243, 244, 246);
      doc.rect(pageMargin, y, cW, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(107, 114, 128);
      doc.text("Category", pageMargin + 3, y + 5.5);
      doc.text("Mobile", pageMargin + cW * 0.55, y + 5.5);
      doc.text("Desktop", pageMargin + cW * 0.78, y + 5.5);
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 24, 39);
      for (const row of barData) {
        doc.text(row.category, pageMargin + 3, y + 4);
        const [mr, mg, mb] = scoreColor(row.mobile);
        doc.setTextColor(mr, mg, mb);
        doc.text(String(row.mobile), pageMargin + cW * 0.55, y + 4);
        const [dr, dg, db] = scoreColor(row.desktop);
        doc.setTextColor(dr, dg, db);
        doc.text(String(row.desktop), pageMargin + cW * 0.78, y + 4);
        doc.setTextColor(17, 24, 39);
        y += 7;
      }
      y += 6;

      const cwvEntries = Object.entries(coreWebVitals);
      if (cwvEntries.length > 0) {
        checkPage(30);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Core Web Vitals", pageMargin, y);
        y += 7;
        doc.setFillColor(243, 244, 246);
        doc.rect(pageMargin, y, cW, 8, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text("Metric", pageMargin + 3, y + 5.5);
        doc.text("Value", pageMargin + cW * 0.55, y + 5.5);
        doc.text("Status", pageMargin + cW * 0.78, y + 5.5);
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);
        for (const [, vital] of cwvEntries as [string, any][]) {
          checkPage(8);
          doc.text(vital.title, pageMargin + 3, y + 4);
          doc.text(vital.displayValue, pageMargin + cW * 0.55, y + 4);
          const status = vital.score >= 0.9 ? "Good" : vital.score >= 0.5 ? "Needs Work" : "Poor";
          const [sr, sg, sb] = scoreColor(vital.score * 100);
          doc.setTextColor(sr, sg, sb);
          doc.text(status, pageMargin + cW * 0.78, y + 4);
          doc.setTextColor(17, 24, 39);
          y += 7;
        }
        y += 6;
      }

      if (opportunities.length > 0) {
        checkPage(20);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Opportunities", pageMargin, y);
        y += 8;
        doc.setFontSize(9);
        for (const opp of opportunities) {
          checkPage(14);
          doc.setFont("helvetica", "bold");
          doc.text(`• ${opp.title}`, pageMargin + 2, y);
          y += 4;
          if (opp.savings) {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(107, 114, 128);
            doc.text(`  Potential savings: ${opp.savings}`, pageMargin + 4, y);
            doc.setTextColor(17, 24, 39);
            y += 5;
          }
          doc.setFont("helvetica", "normal");
        }
        y += 4;
      }

      const renderSection = (title: string, items: any[]) => {
        if (!items || items.length === 0) return;
        checkPage(20);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(title, pageMargin, y);
        y += 7;
        doc.setFontSize(9);
        for (const s of items) {
          checkPage(20);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(17, 24, 39);
          doc.text(`• ${s.title}`, pageMargin + 2, y);
          const impactLabel = `${(s.impact || "").toUpperCase()} IMPACT`;
          const impactX = pageMargin + 4 + doc.getTextWidth(`• ${s.title}`) + 3;
          if (impactX + doc.getTextWidth(impactLabel) + 4 < W - pageMargin) {
            const [ir, ig, ib] = s.impact === "high" ? [220, 38, 38] as const : s.impact === "medium" ? [234, 179, 8] as const : [22, 163, 74] as const;
            doc.setTextColor(ir, ig, ib);
            doc.text(impactLabel, impactX, y);
          }
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(107, 114, 128);
          const lines = doc.splitTextToSize(s.description || "", cW - 6);
          for (const line of lines) {
            checkPage(5);
            doc.text(line, pageMargin + 4, y);
            y += 4;
          }
          y += 3;
        }
        y += 4;
      };

      if (aiSuggestions) {
        checkPage(20);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text("AI-Generated Optimization Recommendations", pageMargin, y);
        y += 10;
        renderSection("Performance Fixes", aiSuggestions.performance || []);
        renderSection("SEO Improvements", aiSuggestions.seo || []);
        renderSection("UX & Accessibility Improvements", aiSuggestions.ux || []);
      }

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(156, 163, 175);
        doc.text(`Page ${i} of ${pages}`, W / 2 - 10, 290);
        doc.text(`Generated ${new Date().toLocaleDateString()}`, pageMargin, 290);
      }

      const filename = `audit-report-${new URL(report.url).hostname}-${new Date(report.created_at).toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGenerating(false);
    }
  }, [report, mobile, desktop, coreWebVitals, barData, opportunities, aiSuggestions]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">Report not found.</div>
      </DashboardLayout>
    );
  }



  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link to="/reports" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports
            </Link>
            <h1 className="font-display text-3xl font-bold">Audit Report</h1>
            <div className="flex items-center gap-2 mt-1">
              <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                {report.url} <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={generating} className="gap-2">
            <Download className="h-4 w-4" /> {generating ? "Generating..." : "Download PDF"}
          </Button>
        </div>

        {/* Score Overview */}
        <Card>
          <CardContent className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center">
              <ScoreCircle score={report.overall_score || 0} label="Overall" size="lg" />
              {[
                { label: "Performance", icon: Zap, score: mobile.performance || 0 },
                { label: "SEO", icon: Search, score: mobile.seo || 0 },
                { label: "Accessibility", icon: Eye, score: mobile.accessibility || 0 },
                { label: "Best Practices", icon: Shield, score: mobile.bestPractices || 0 },
              ].map((cat) => (
                <ScoreCircle key={cat.label} score={cat.score} label={cat.label} size="sm" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mobile vs Desktop Breakdown */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Performance", icon: Zap, m: mobile.performance, d: desktop.performance },
            { label: "SEO", icon: Search, m: mobile.seo, d: desktop.seo },
            { label: "Accessibility", icon: Eye, m: mobile.accessibility, d: desktop.accessibility },
            { label: "Best Practices", icon: Shield, m: mobile.bestPractices, d: desktop.bestPractices },
          ].map((cat) => (
            <Card key={cat.label}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <cat.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{cat.label}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Smartphone className="h-3 w-3" /> Mobile</span>
                    <span className={`font-display font-bold ${getScoreColor(cat.m || 0)}`}>{cat.m || 0}</span>
                  </div>
                  <Progress value={cat.m || 0} className="h-1.5" />
                  <div className="flex items-center justify-between mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Monitor className="h-3 w-3" /> Desktop</span>
                    <span className={`font-display font-bold ${getScoreColor(cat.d || 0)}`}>{cat.d || 0}</span>
                  </div>
                  <Progress value={cat.d || 0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="vitals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="issues">Issues & Opportunities</TabsTrigger>
            <TabsTrigger value="ai">AI Recommendations</TabsTrigger>
          </TabsList>

          {/* Core Web Vitals */}
          <TabsContent value="vitals">
            <div className="space-y-6">
              {/* Featured CWV Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {(() => {
                  const cwvMetrics = [
                    {
                      key: "lcp",
                      title: "Largest Contentful Paint (LCP)",
                      explanation: "Measures loading performance — the time it takes for the largest visible content element to render. A good LCP is 2.5 seconds or less.",
                      thresholds: { good: 2500, poor: 4000 },
                      unit: "ms",
                    },
                    {
                      key: "cls",
                      title: "Cumulative Layout Shift (CLS)",
                      explanation: "Measures visual stability — how much the page layout shifts unexpectedly during loading. A good CLS score is 0.1 or less.",
                      thresholds: { good: 0.1, poor: 0.25 },
                      unit: "",
                    },
                    {
                      key: "inp",
                      title: "Interaction to Next Paint (INP)",
                      explanation: "Measures responsiveness — the delay between a user interaction and the next visual update. A good INP is 200 milliseconds or less.",
                      thresholds: { good: 200, poor: 500 },
                      unit: "ms",
                      fallbackKey: "tbt",
                      fallbackTitle: "Total Blocking Time (TBT)",
                      fallbackExplanation: "Measures the total time the main thread was blocked, preventing input responsiveness. Used as a proxy for INP. A good TBT is 200ms or less.",
                    },
                  ];

                  return cwvMetrics.map((metric) => {
                    const vital = coreWebVitals[metric.key] || (metric.fallbackKey ? coreWebVitals[metric.fallbackKey] : null);
                    const title = vital ? (coreWebVitals[metric.key] ? metric.title : metric.fallbackTitle || metric.title) : metric.title;
                    const explanation = vital ? (coreWebVitals[metric.key] ? metric.explanation : metric.fallbackExplanation || metric.explanation) : metric.explanation;
                    const score = vital?.score ?? 0;
                    const statusLabel = score >= 0.9 ? "Good" : score >= 0.5 ? "Needs Improvement" : "Poor";
                    const statusColor = score >= 0.9 ? "bg-score-excellent" : score >= 0.5 ? "bg-score-average" : "bg-score-poor";
                    const statusTextColor = score >= 0.9 ? "text-score-excellent" : score >= 0.5 ? "text-score-average" : "text-score-poor";
                    const statusIcon = score >= 0.9
                      ? <CheckCircle className="h-5 w-5 text-score-excellent" />
                      : score >= 0.5
                        ? <AlertTriangle className="h-5 w-5 text-score-average" />
                        : <XCircle className="h-5 w-5 text-score-poor" />;

                    return (
                      <Card key={metric.key} className="relative overflow-hidden">
                        <div className={`absolute top-0 left-0 right-0 h-1 ${statusColor}`} />
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-sm font-semibold leading-tight">{title}</h3>
                            {statusIcon}
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className={`font-display text-3xl font-bold ${statusTextColor}`}>
                              {vital?.displayValue || "N/A"}
                            </span>
                            <Badge className={`${statusColor} text-white border-0 text-xs`}>
                              {statusLabel}
                            </Badge>
                          </div>
                          <Progress value={score * 100} className="h-1.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {explanation}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>

              {/* Additional Metrics */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(coreWebVitals)
                  .filter(([key]) => !["lcp", "cls", "inp"].includes(key))
                  .map(([key, vital]: [string, any]) => (
                    <Card key={key}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{vital.title}</p>
                          {getCwvIcon(vital.score)}
                        </div>
                        <p className={`font-display text-2xl font-bold ${getScoreColor(vital.score * 100)}`}>
                          {vital.displayValue}
                        </p>
                        <Progress value={vital.score * 100} className="h-1.5 mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Time to Interactive</p>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="font-display text-2xl font-bold text-primary">{loadTime.displayValue || "N/A"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {loadTime.value ? `${(loadTime.value / 1000).toFixed(1)}s until interactive` : ""}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Charts */}
          <TabsContent value="charts">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Mobile vs Desktop</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72 w-full">
                    <BarChart data={barData}>
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="mobile" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="desktop" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Mobile Score Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72 w-full">
                    <RadarChart data={radarData}>
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

          {/* History Comparison */}
          <TabsContent value="history">
            {historyScans.length <= 1 ? (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-8 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No previous scans found for this URL. Scan again later to see how your metrics change over time.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Score Trend Line Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Score Trends Over Time
                    </CardTitle>
                    <CardDescription>
                      {historyScans.length} scans of {report.url}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{
                      performance: { label: "Performance", color: "hsl(var(--primary))" },
                      seo: { label: "SEO", color: "hsl(var(--accent))" },
                      accessibility: { label: "Accessibility", color: "hsl(var(--score-good))" },
                      overall: { label: "Overall", color: "hsl(var(--foreground))" },
                    }} className="h-72 w-full">
                      <LineChart data={historyChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ fontWeight: 600 }}
                          formatter={(value: number, name: string) => [`${value}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                          labelFormatter={(_label: string, payload: any[]) => payload?.[0]?.payload?.fullDate || _label}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="overall" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 4 }} name="Overall" />
                        <Line type="monotone" dataKey="performance" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Performance" />
                        <Line type="monotone" dataKey="seo" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} name="SEO" />
                        <Line type="monotone" dataKey="accessibility" stroke="hsl(var(--score-good))" strokeWidth={2} dot={{ r: 3 }} name="Accessibility" />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* CWV Trend Charts */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display text-base">LCP Over Time</CardTitle>
                      <CardDescription>Largest Contentful Paint (lower is better)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={{ lcp: { label: "LCP (ms)", color: "hsl(var(--primary))" } }} className="h-56 w-full">
                        <LineChart data={historyChartData.filter(d => d.lcp != null)}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Line type="monotone" dataKey="lcp" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="LCP (ms)" />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display text-base">CLS Over Time</CardTitle>
                      <CardDescription>Cumulative Layout Shift (lower is better)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={{ cls: { label: "CLS", color: "hsl(var(--score-average))" } }} className="h-56 w-full">
                        <LineChart data={historyChartData.filter(d => d.cls != null)}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Line type="monotone" dataKey="cls" stroke="hsl(var(--score-average))" strokeWidth={2} dot={{ r: 4 }} name="CLS" />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* History Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-base">Scan History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-3 font-medium text-muted-foreground">Date</th>
                            <th className="pb-3 font-medium text-muted-foreground text-center">Overall</th>
                            <th className="pb-3 font-medium text-muted-foreground text-center">Perf</th>
                            <th className="pb-3 font-medium text-muted-foreground text-center">SEO</th>
                            <th className="pb-3 font-medium text-muted-foreground text-center">LCP</th>
                            <th className="pb-3 font-medium text-muted-foreground text-center">CLS</th>
                            <th className="pb-3 font-medium text-muted-foreground text-center">TBT</th>
                            <th className="pb-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyScans.slice().reverse().map((scan, i) => {
                            const cwv = scan.results?.coreWebVitals || {};
                            const isCurrent = scan.id === id;
                            return (
                              <tr key={scan.id} className={`border-b border-border/50 ${isCurrent ? "bg-primary/5" : ""}`}>
                                <td className="py-3">
                                  <span className="font-medium">{new Date(scan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                  {isCurrent && <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>}
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`font-display font-bold ${getScoreColor(scan.overall_score || 0)}`}>{scan.overall_score || 0}</span>
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`font-display font-bold ${getScoreColor(scan.results?.mobile?.performance || 0)}`}>{scan.results?.mobile?.performance || 0}</span>
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`font-display font-bold ${getScoreColor(scan.results?.mobile?.seo || 0)}`}>{scan.results?.mobile?.seo || 0}</span>
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`text-xs ${cwv.lcp?.score >= 0.9 ? "text-score-excellent" : cwv.lcp?.score >= 0.5 ? "text-score-average" : "text-score-poor"}`}>
                                    {cwv.lcp?.displayValue || "—"}
                                  </span>
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`text-xs ${cwv.cls?.score >= 0.9 ? "text-score-excellent" : cwv.cls?.score >= 0.5 ? "text-score-average" : "text-score-poor"}`}>
                                    {cwv.cls?.displayValue || "—"}
                                  </span>
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`text-xs ${cwv.tbt?.score >= 0.9 ? "text-score-excellent" : cwv.tbt?.score >= 0.5 ? "text-score-average" : "text-score-poor"}`}>
                                    {cwv.tbt?.displayValue || "—"}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  {!isCurrent && (
                                    <Link to={`/report/${scan.id}`}>
                                      <Button variant="ghost" size="sm" className="text-xs">View</Button>
                                    </Link>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Issues & Opportunities */}
          <TabsContent value="issues">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-score-average" /> Opportunities
                  </CardTitle>
                  <CardDescription>Suggestions to improve page load speed</CardDescription>
                </CardHeader>
                <CardContent>
                  {opportunities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No major opportunities — great job!</p>
                  ) : (
                    <div className="space-y-3">
                      {opportunities.map((opp: any, i: number) => (
                        <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
                          <TrendingUp className="h-4 w-4 text-score-average shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{opp.title}</p>
                            {opp.savings && (
                              <Badge variant="secondary" className="mt-1 text-xs">Potential savings: {opp.savings}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Diagnostics
                  </CardTitle>
                  <CardDescription>Additional information about your page</CardDescription>
                </CardHeader>
                <CardContent>
                  {diagnostics.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No diagnostics to show</p>
                  ) : (
                    <div className="space-y-3">
                      {diagnostics.map((diag: any, i: number) => (
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

          {/* AI Recommendations */}
          <TabsContent value="ai">
            {aiSuggestions ? (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" /> AI-Generated Optimization Recommendations
                  </CardTitle>
                  <CardDescription>Actionable recommendations powered by AI analysis of your scan results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <SuggestionSection
                    title="Performance Fixes"
                    icon={<Zap className="h-4 w-4 text-score-average" />}
                    suggestions={aiSuggestions.performance || []}
                  />
                  <SuggestionSection
                    title="SEO Improvements"
                    icon={<Search className="h-4 w-4 text-primary" />}
                    suggestions={aiSuggestions.seo || []}
                  />
                  <SuggestionSection
                    title="UX & Accessibility Improvements"
                    icon={<Eye className="h-4 w-4 text-score-excellent" />}
                    suggestions={aiSuggestions.ux || []}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">AI recommendations were not available for this scan.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Report;
