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
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import {
  Loader2, Globe, FileText, Download, Plus, TrendingUp, TrendingDown, Minus,
  AlertTriangle, AlertCircle, Info, CheckCircle,
} from "lucide-react";

const SEOReports = () => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("seo_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReports(data);
        setLoading(false);
      });
  }, [user]);

  if (!isPremium) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">SEO Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Monthly SEO performance reports for your websites.</p>
          </div>
          <PremiumGate feature="Monthly SEO Reports" />
        </div>
      </DashboardLayout>
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || !user) return;
    const formattedUrl = newUrl.trim().startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`;
    setGenerating(true);

    try {
      // Get scan history for context
      const { data: scans } = await supabase
        .from("scan_reports")
        .select("created_at, overall_score, results")
        .eq("url", formattedUrl)
        .order("created_at", { ascending: false })
        .limit(5);

      const scanHistory = scans?.map((s) => ({
        date: new Date(s.created_at).toLocaleDateString(),
        score: s.overall_score,
        performance: (s.results as any)?.mobile?.performance,
        seo: (s.results as any)?.mobile?.seo,
      }));

      const { data, error } = await supabase.functions.invoke("generate-seo-report", {
        body: { url: formattedUrl, scanHistory },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const { data: inserted, error: insertError } = await supabase
        .from("seo_reports")
        .insert({ user_id: user.id, website_url: formattedUrl, report_data: data.report })
        .select()
        .single();

      if (insertError) throw insertError;
      setReports((prev) => [inserted, ...prev]);
      setSelectedReport(inserted);
      setNewUrl("");
      toast({ title: "Report generated!", description: "Your SEO report is ready." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = (report: any) => {
    const doc = new jsPDF();
    const rd = report.report_data;
    const W = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Monthly SEO Report", 18, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(report.website_url, 18, y);
    y += 5;
    doc.text(`Generated: ${new Date(report.created_at).toLocaleDateString()}`, 18, y);
    y += 12;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Website Health: ${rd.website_health_score}/100`, 18, y);
    y += 7;
    doc.text(`SEO Health: ${rd.seo_health_score}/100`, 18, y);
    y += 10;

    doc.setFontSize(10);
    doc.text("Core Web Vitals Summary", 18, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(rd.core_web_vitals_summary, W - 36);
    doc.text(lines, 18, y);
    y += lines.length * 5 + 8;

    if (rd.improvement_plan?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Improvement Plan", 18, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      rd.improvement_plan.forEach((item: any) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`• [${item.priority}] ${item.action} (${item.timeline})`, 18, y);
        y += 6;
      });
    }

    doc.save(`seo-report-${new URL(report.website_url).hostname}-${new Date(report.created_at).toISOString().split("T")[0]}.pdf`);
  };

  const rd = selectedReport?.report_data;

  const statusIcon = (status: string) => {
    if (status === "improved") return <TrendingUp className="h-3.5 w-3.5 text-score-excellent" />;
    if (status === "declined") return <TrendingDown className="h-3.5 w-3.5 text-score-poor" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const severityIcon = (s: string) => {
    if (s === "critical") return <AlertCircle className="h-3.5 w-3.5 text-score-poor" />;
    if (s === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-score-average" />;
    return <Info className="h-3.5 w-3.5 text-primary" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">SEO Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Monthly SEO performance reports for your websites.</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleGenerate} className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="https://example.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} disabled={generating} className="pl-10" required />
              </div>
              <Button type="submit" disabled={generating} className="gap-2 min-w-[160px]">
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating</> : <><Plus className="h-4 w-4" /> Generate Report</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Report List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm">Report History</CardTitle>
              <CardDescription className="text-xs">{reports.length} reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : reports.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No reports yet. Generate your first one!</p>
              ) : (
                reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedReport?.id === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <p className="text-sm font-medium truncate">{r.website_url.replace(/^https?:\/\//, "")}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Badge>
                      {r.report_data?.seo_health_score && (
                        <span className="text-xs text-muted-foreground">Score: {r.report_data.seo_health_score}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Report Detail */}
          <Card className="lg:col-span-2">
            {rd ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-display text-base">{selectedReport.website_url.replace(/^https?:\/\//, "")}</CardTitle>
                      <CardDescription className="text-xs">
                        Generated {new Date(selectedReport.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownloadPdf(selectedReport)}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Website Health</p>
                      <p className="font-display text-3xl font-bold">{rd.website_health_score}</p>
                      <Progress value={rd.website_health_score} className="h-1.5 mt-2" />
                    </div>
                    <div className="p-4 rounded-lg border border-border text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">SEO Health</p>
                      <p className="font-display text-3xl font-bold">{rd.seo_health_score}</p>
                      <Progress value={rd.seo_health_score} className="h-1.5 mt-2" />
                    </div>
                  </div>

                  {/* CWV Summary */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Core Web Vitals Summary</h3>
                    <p className="text-sm text-muted-foreground">{rd.core_web_vitals_summary}</p>
                  </div>

                  <Separator />

                  {/* Keyword Rankings */}
                  {rd.keyword_ranking_improvements?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-3">Keyword Rankings</h3>
                      <div className="space-y-2">
                        {rd.keyword_ranking_improvements.map((k: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded border border-border/50">
                            <span className="text-sm">{k.keyword}</span>
                            <div className="flex items-center gap-2">
                              {statusIcon(k.status)}
                              <span className="text-xs text-muted-foreground">{k.change}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Technical Issues */}
                  {rd.technical_issues?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-3">Technical Issues</h3>
                      <div className="space-y-2">
                        {rd.technical_issues.map((t: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-border/50">
                            <div className="flex items-center gap-2">
                              {severityIcon(t.severity)}
                              <span className="text-sm font-medium">{t.issue}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ml-5">{t.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Improvement Plan */}
                  {rd.improvement_plan?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-3">AI Improvement Plan</h3>
                      <div className="space-y-2">
                        {rd.improvement_plan.map((item: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm">{item.action}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] capitalize">{item.priority}</Badge>
                                <span className="text-xs text-muted-foreground">{item.timeline}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="p-12 text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Select a report or generate a new one to view details.</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SEOReports;
