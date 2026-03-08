import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, ExternalLink, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

type ReportData = {
  id: string;
  url: string;
  status: string;
  overall_score: number | null;
  results: any;
  created_at: string;
};

const chartConfig = {
  score: { label: "Score", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const Report = () => {
  const { id } = useParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const { data, error } = await supabase
        .from("scan_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setReport(data as ReportData);
      setLoading(false);
    };
    fetchReport();
  }, [id]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-score-excellent";
    if (score >= 60) return "text-score-good";
    if (score >= 40) return "text-score-average";
    return "text-score-poor";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-score-excellent/10";
    if (score >= 60) return "bg-score-good/10";
    if (score >= 40) return "bg-score-average/10";
    return "bg-score-poor/10";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "pass": return <CheckCircle className="h-4 w-4 text-score-excellent" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-score-average" />;
      case "error": return <XCircle className="h-4 w-4 text-score-poor" />;
      default: return null;
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

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

  const results = report.results || {};
  const categories = results.categories || [];
  const findings = results.findings || [];

  const radarData = categories.map((cat: any) => ({
    category: cat.name,
    score: cat.score,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
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
          <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>

        {/* Overall score */}
        <Card>
          <CardContent className="p-8 flex items-center gap-8">
            <div className={`h-28 w-28 rounded-full flex items-center justify-center ${getScoreBg(report.overall_score || 0)}`}>
              <span className={`font-display text-4xl font-bold ${getScoreColor(report.overall_score || 0)}`}>
                {report.overall_score || 0}
              </span>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Overall Score</h2>
              <p className="text-muted-foreground">
                {(report.overall_score || 0) >= 80
                  ? "Great! Your website follows most best practices."
                  : (report.overall_score || 0) >= 60
                  ? "Good, but there are areas for improvement."
                  : "Your website needs significant improvements."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Category scores */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Category Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {radarData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" className="text-xs" />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No category data</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {categories.map((cat: any) => (
              <Card key={cat.name}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={cat.score} className="w-20 h-2" />
                    <span className={`font-display font-bold text-lg min-w-[2.5rem] text-right ${getScoreColor(cat.score)}`}>
                      {cat.score}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Findings */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Detailed Findings</CardTitle>
            <CardDescription>Issues found and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No findings</p>
            ) : (
              <div className="space-y-3">
                {findings.map((finding: any, i: number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
                    {getSeverityIcon(finding.severity)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{finding.title}</p>
                        <Badge variant={finding.severity === "pass" ? "default" : finding.severity === "warning" ? "secondary" : "destructive"} className="text-xs">
                          {finding.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.description}</p>
                      {finding.recommendation && (
                        <p className="text-sm text-primary mt-1">💡 {finding.recommendation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Report;
