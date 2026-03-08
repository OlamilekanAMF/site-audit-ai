import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScoreGauge, getScoreTextClass } from "@/components/ScoreGauge";
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
  Globe,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
} from "recharts";

const chartConfig = {
  performance: { label: "Performance", color: "hsl(var(--primary))" },
  seo: { label: "SEO", color: "hsl(var(--accent))" },
  accessibility: { label: "Accessibility", color: "hsl(var(--score-good))" },
  overall: { label: "Overall", color: "hsl(var(--foreground))" },
} satisfies ChartConfig;

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

const getSeverityIcon = (score: number) => {
  if (score >= 0.9) return <CheckCircle className="h-4 w-4 text-score-excellent" />;
  if (score >= 0.5) return <AlertTriangle className="h-4 w-4 text-score-average" />;
  return <XCircle className="h-4 w-4 text-score-poor" />;
};

// Metric status dot
const MetricDot = ({ score }: { score: number }) => {
  const colorClass = score >= 0.9 ? "bg-score-excellent" : score >= 0.5 ? "bg-score-average" : "bg-score-poor";
  return <span className={`inline-block h-3 w-3 rounded-full ${colorClass}`} />;
};

const Report = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deviceTab, setDeviceTab] = useState("mobile");
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
        performance: scan.results?.mobile?.performance || 0,
        seo: scan.results?.mobile?.seo || 0,
        accessibility: scan.results?.mobile?.accessibility || 0,
      };
    });
  }, [historyScans]);

  const results = report?.results || {};
  const mobile = results.mobile || {};
  const desktop = results.desktop || {};
  const activeDevice = deviceTab === "mobile" ? mobile : desktop;
  const coreWebVitals = results.coreWebVitals || {};
  const loadTime = results.loadTime || {};
  const opportunities = results.opportunities || [];
  const diagnostics = results.diagnostics || [];
  const aiSuggestions = results.aiSuggestions || null;
  const detectedIssues: any[] = results.detectedIssues || [];
  const screenshot: string | null = results.screenshot || null;
  const filmstrip: { timing: number; data: string }[] = results.filmstrip || [];

  // Build sections from data
  const perfScore = activeDevice.performance || 0;
  const a11yScore = activeDevice.accessibility || 0;
  const bpScore = activeDevice.bestPractices || 0;
  const seoScore = activeDevice.seo || 0;

  // PDF generation (preserved from original)
  const handleDownloadPdf = useCallback(async () => {
    if (!report) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const pageMargin = 18;
      let y = 20;
      const addPage = () => { doc.addPage(); y = 20; };
      const checkPage = (need: number) => { if (y + need > 270) addPage(); };

      // Header
      const gSteps = 20;
      const hH = 52;
      for (let i = 0; i < gSteps; i++) {
        const t = i / gSteps;
        doc.setFillColor(Math.round(30 + t * 29), Math.round(64 + t * 66), Math.round(175 + t * 71));
        doc.rect(0, (hH / gSteps) * i, W, hH / gSteps + 0.5, "F");
      }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("SiteDoctor AI", pageMargin, 14);
      doc.setFontSize(20);
      doc.text("Website Audit Report", pageMargin, 32);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(219, 234, 254);
      doc.text(report.url, pageMargin, 39);
      doc.text(`Scan Date: ${new Date(report.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageMargin, 45);
      y = 60;

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Score Summary", pageMargin, y);
      y += 8;

      const scoreColor = (s: number): [number, number, number] =>
        s >= 90 ? [22, 163, 74] : s >= 50 ? [234, 179, 8] : [220, 38, 38];
      const cW = W - pageMargin * 2;
      const cols = 4;
      const colW = cW / cols;

      [
        { label: "Performance", score: perfScore },
        { label: "Accessibility", score: a11yScore },
        { label: "Best Practices", score: bpScore },
        { label: "SEO", score: seoScore },
      ].forEach(({ label, score }, idx) => {
        const [r, g, b] = scoreColor(score);
        const x = pageMargin + colW * idx;
        doc.setFillColor(r, g, b);
        doc.circle(x + 12, y + 10, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        const ss = String(score);
        doc.text(ss, x + 12 - doc.getTextWidth(ss) / 2, y + 14);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + 12 - doc.getTextWidth(label) / 2, y + 24);
      });
      y += 32;

      // CWV
      const cwvEntries = Object.entries(coreWebVitals);
      if (cwvEntries.length > 0) {
        checkPage(30);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Performance Metrics", pageMargin, y);
        y += 8;
        for (const [, vital] of cwvEntries as [string, any][]) {
          checkPage(8);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(vital.title, pageMargin + 3, y + 4);
          doc.setFont("helvetica", "normal");
          doc.text(vital.displayValue, pageMargin + cW * 0.6, y + 4);
          y += 7;
        }
        y += 6;
      }

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(156, 163, 175);
        doc.text(`Page ${i} of ${pages}`, W / 2 - 10, 290);
      }

      const filename = `audit-report-${new URL(report.url).hostname}-${new Date(report.created_at).toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGenerating(false);
    }
  }, [report, perfScore, a11yScore, bpScore, seoScore, coreWebVitals]);

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

  // Build metrics for display
  const metricsGrid = [
    { key: "fcp", label: "First Contentful Paint", vital: coreWebVitals.fcp },
    { key: "lcp", label: "Largest Contentful Paint", vital: coreWebVitals.lcp },
    { key: "tbt", label: "Total Blocking Time", vital: coreWebVitals.tbt },
    { key: "cls", label: "Cumulative Layout Shift", vital: coreWebVitals.cls },
    { key: "si", label: "Speed Index", vital: coreWebVitals.si },
  ].filter(m => m.vital);

  // Accessibility sub-categories from detected issues
  const a11yIssues = detectedIssues.filter((i: any) =>
    i.category === "accessibility" || i.name?.toLowerCase().includes("aria") || i.name?.toLowerCase().includes("label") || i.name?.toLowerCase().includes("alt")
  );

  // Security/best practice issues
  const securityIssues = detectedIssues.filter((i: any) =>
    i.category === "security" || i.name?.toLowerCase().includes("csp") || i.name?.toLowerCase().includes("https") || i.name?.toLowerCase().includes("clickjack")
  );

  // SEO issues
  const seoIssues = detectedIssues.filter((i: any) =>
    i.category === "seo" || i.name?.toLowerCase().includes("meta") || i.name?.toLowerCase().includes("crawl") || i.name?.toLowerCase().includes("structured")
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Top Section: URL bar + Analyze + device toggle */}
        <div className="space-y-4">
          <Link to="/reports" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports
          </Link>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={report.url}
                readOnly
                className="pl-10 bg-card font-mono text-sm"
              />
            </div>
            <Button
              variant="default"
              className="gap-2 shrink-0"
              onClick={() => navigate(`/scan?url=${encodeURIComponent(report.url)}`)}
            >
              <Search className="h-4 w-4" /> Analyze
            </Button>
            <Button variant="outline" onClick={handleDownloadPdf} disabled={generating} className="gap-2 shrink-0">
              <Download className="h-4 w-4" /> {generating ? "Generating..." : "PDF"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Tabs value={deviceTab} onValueChange={setDeviceTab}>
              <TabsList className="h-9">
                <TabsTrigger value="mobile" className="gap-1.5 text-xs px-3">
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </TabsTrigger>
                <TabsTrigger value="desktop" className="gap-1.5 text-xs px-3">
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Report from {new Date(report.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        {/* Score Summary Row — 4 circular gauges */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
              <ScoreGauge score={perfScore} label="Performance" size={100} />
              <ScoreGauge score={a11yScore} label="Accessibility" size={100} />
              <ScoreGauge score={bpScore} label="Best Practices" size={100} />
              <ScoreGauge score={seoScore} label="SEO" size={100} />
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-score-excellent" /> 90–100 (Good)</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-score-average" /> 50–89 (Needs Work)</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-score-poor" /> 0–49 (Poor)</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-display text-lg">Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score gauge + Screenshot placeholder */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <ScoreGauge score={perfScore} size={160} strokeWidth={10} />
              <div className="flex-1 w-full rounded-lg border border-border bg-muted/30 flex items-center justify-center min-h-[180px]">
                <div className="text-center text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Screenshot preview</p>
                  <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center justify-center gap-1 mt-1">
                    Visit site <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            {metricsGrid.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {metricsGrid.map(({ key, label, vital }) => (
                  <div key={key} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
                    <MetricDot score={vital.score} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">{label}</p>
                      <p className={`font-display text-lg font-bold ${getScoreTextClass(vital.score)}`}>
                        {vital.displayValue}
                      </p>
                    </div>
                  </div>
                ))}
                {loadTime.displayValue && (
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
                    <span className="inline-block h-3 w-3 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Time to Interactive</p>
                      <p className="font-display text-lg font-bold text-primary">{loadTime.displayValue}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filmstrip placeholder */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Page Loading Timeline</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((sec) => (
                  <div key={sec} className="shrink-0 text-center">
                    <div className="w-16 h-10 rounded border border-border bg-background flex items-center justify-center">
                      <Globe className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{sec}s</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights / Opportunities Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-score-average" />
              <CardTitle className="font-display text-lg">Opportunities</CardTitle>
            </div>
            <CardDescription>These suggestions can help your page load faster.</CardDescription>
          </CardHeader>
          <CardContent>
            {opportunities.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-score-excellent mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No major opportunities — great job!</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {opportunities.map((opp: any, i: number) => (
                  <AccordionItem key={i} value={`opp-${i}`}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <AlertTriangle className="h-4 w-4 text-score-average shrink-0" />
                        <span className="text-sm font-medium">{opp.title}</span>
                        {opp.savings && (
                          <Badge variant="secondary" className="text-xs ml-auto mr-2 shrink-0">{opp.savings}</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground pl-7">{opp.description || "Optimize this resource to improve loading performance."}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Diagnostics Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-lg">Diagnostics</CardTitle>
            </div>
            <CardDescription>More information about the performance of your application.</CardDescription>
          </CardHeader>
          <CardContent>
            {diagnostics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No diagnostics to show.</p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {diagnostics.map((diag: any, i: number) => (
                  <AccordionItem key={i} value={`diag-${i}`}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{diag.title}</span>
                        {diag.displayValue && (
                          <span className="text-xs text-muted-foreground ml-auto mr-2 shrink-0">{diag.displayValue}</span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground pl-7">{diag.description || "Review this diagnostic for potential improvements."}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Accessibility Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-display text-lg">Accessibility</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <ScoreGauge score={a11yScore} size={120} strokeWidth={8} />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  These checks highlight opportunities to improve the accessibility of your web app.
                </p>
                <Badge className={`${getScoreBg(a11yScore)} text-white border-0`}>{getScoreLabel(a11yScore)}</Badge>
              </div>
            </div>
            <Accordion type="multiple" className="w-full">
              {[
                { title: "Names and Labels", desc: "Ensure interactive elements have accessible names and labels for screen readers." },
                { title: "ARIA", desc: "Verify that ARIA attributes are used correctly to enhance accessibility." },
                { title: "Contrast", desc: "Ensure text and interactive elements have sufficient color contrast." },
              ].map((cat, i) => {
                const relevantIssues = a11yIssues.filter((issue: any) =>
                  issue.name?.toLowerCase().includes(cat.title.toLowerCase().split(" ")[0])
                );
                return (
                  <AccordionItem key={i} value={`a11y-${i}`}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        {relevantIssues.length > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-score-average shrink-0" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-score-excellent shrink-0" />
                        )}
                        <span className="text-sm font-medium">{cat.title}</span>
                        {relevantIssues.length > 0 && (
                          <Badge variant="secondary" className="text-xs ml-auto mr-2">{relevantIssues.length} issues</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground pl-7 mb-2">{cat.desc}</p>
                      {relevantIssues.length > 0 && (
                        <div className="pl-7 space-y-2">
                          {relevantIssues.map((issue: any, j: number) => (
                            <div key={j} className="text-sm p-2 rounded bg-muted/50">
                              <p className="font-medium">{issue.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Best Practices Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-display text-lg">Best Practices</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <ScoreGauge score={bpScore} size={120} strokeWidth={8} />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  These checks ensure your page follows modern web development best practices.
                </p>
                <Badge className={`${getScoreBg(bpScore)} text-white border-0`}>{getScoreLabel(bpScore)}</Badge>
              </div>
            </div>
            <Accordion type="multiple" className="w-full">
              {[
                { title: "CSP Protection", desc: "Content Security Policy helps prevent XSS attacks." },
                { title: "HTTPS", desc: "All resources should be served over HTTPS." },
                { title: "Browser Errors", desc: "Check for JavaScript errors logged to the console." },
              ].map((check, i) => {
                const hasIssue = securityIssues.some((issue: any) =>
                  issue.name?.toLowerCase().includes(check.title.toLowerCase().split(" ")[0])
                );
                return (
                  <AccordionItem key={i} value={`bp-${i}`}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        {hasIssue ? (
                          <XCircle className="h-4 w-4 text-score-poor shrink-0" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-score-excellent shrink-0" />
                        )}
                        <span className="text-sm font-medium">{check.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground pl-7">{check.desc}</p>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* SEO Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-display text-lg">SEO</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <ScoreGauge score={seoScore} size={120} strokeWidth={8} />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  These checks ensure that your page is following basic search engine optimization advice.
                </p>
                <Badge className={`${getScoreBg(seoScore)} text-white border-0`}>{getScoreLabel(seoScore)}</Badge>
              </div>
            </div>
            <Accordion type="multiple" className="w-full">
              {[
                { title: "Meta Tags", desc: "Title and meta description are properly configured for search engines." },
                { title: "Crawlability", desc: "Page can be discovered and indexed by search engine crawlers." },
                { title: "Structured Data", desc: "Structured data (Schema.org) helps search engines understand your content." },
                { title: "Mobile Friendliness", desc: "Page is optimized for mobile devices with proper viewport configuration." },
              ].map((check, i) => {
                const hasIssue = seoIssues.some((issue: any) =>
                  issue.name?.toLowerCase().includes(check.title.toLowerCase().split(" ")[0])
                );
                return (
                  <AccordionItem key={i} value={`seo-${i}`}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        {hasIssue ? (
                          <AlertTriangle className="h-4 w-4 text-score-average shrink-0" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-score-excellent shrink-0" />
                        )}
                        <span className="text-sm font-medium">{check.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground pl-7">{check.desc}</p>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        {aiSuggestions && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle className="font-display text-lg">AI Recommendations</CardTitle>
              </div>
              <CardDescription>Actionable recommendations powered by AI analysis of your scan results.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {[
                  { key: "performance", title: "Performance Fixes", icon: <Zap className="h-4 w-4 text-score-average" />, items: aiSuggestions.performance || [] },
                  { key: "seo", title: "SEO Improvements", icon: <Search className="h-4 w-4 text-primary" />, items: aiSuggestions.seo || [] },
                  { key: "ux", title: "UX & Accessibility", icon: <Eye className="h-4 w-4 text-score-excellent" />, items: aiSuggestions.ux || [] },
                ].map((section) => (
                  section.items.map((s: any, i: number) => (
                    <AccordionItem key={`${section.key}-${i}`} value={`ai-${section.key}-${i}`}>
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 text-left">
                          {section.icon}
                          <span className="text-sm font-medium">{s.title}</span>
                          <Badge variant="outline" className="text-xs ml-auto mr-2 shrink-0">
                            {s.impact} impact
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-7 space-y-2">
                          {s.explanation && <p className="text-sm text-muted-foreground">{s.explanation}</p>}
                          {s.description && !s.explanation && <p className="text-sm text-muted-foreground">{s.description}</p>}
                          {s.howToFix && (
                            <div className="p-3 rounded-md bg-muted/50 flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <p className="text-sm text-muted-foreground">{s.howToFix}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {historyScans.length > 1 && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="font-display text-lg">Score History</CardTitle>
              </div>
              <CardDescription>{historyScans.length} scans of {report.url}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <LineChart data={historyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default Report;
