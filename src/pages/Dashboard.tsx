import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, FileText, Search, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type ScanReport = {
  id: string;
  url: string;
  status: string;
  overall_score: number | null;
  created_at: string;
  results: any;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [quickUrl, setQuickUrl] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from("scan_reports")
        .select("id, url, status, overall_score, created_at, results")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setReports(data);
        setTotalScans(data.length);
      }
    };
    fetchReports();
  }, []);

  const avgScore = reports.filter((r) => r.overall_score).reduce((sum, r) => sum + (r.overall_score || 0), 0) / (reports.filter((r) => r.overall_score).length || 1);

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickUrl.trim()) {
      navigate(`/scan?url=${encodeURIComponent(quickUrl.trim())}`);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-score-excellent";
    if (score >= 60) return "text-score-good";
    if (score >= 40) return "text-score-average";
    return "text-score-poor";
  };

  const getScoreBg = (score: number | null) => {
    if (!score) return "bg-muted";
    if (score >= 80) return "bg-score-excellent/10";
    if (score >= 60) return "bg-score-good/10";
    if (score >= 40) return "bg-score-average/10";
    return "bg-score-poor/10";
  };

  const extractScores = (report: ScanReport) => {
    const r = report.results;
    if (!r) return { performance: null, seo: null, accessibility: null };
    const mobile = r.mobile || {};
    return {
      performance: mobile.performance ?? r.desktop?.performance ?? null,
      seo: mobile.seo ?? r.desktop?.seo ?? null,
      accessibility: mobile.accessibility ?? r.desktop?.accessibility ?? null,
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's an overview of your website audits.</p>
        </div>

        {/* Quick scan */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleQuickScan} className="flex gap-3">
              <Input
                placeholder="Enter website URL to scan..."
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" className="gap-2">
                <Search className="h-4 w-4" /> Scan Now
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Scans</p>
                  <p className="text-2xl font-bold font-display">{totalScans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className={`text-2xl font-bold font-display ${getScoreColor(Math.round(avgScore))}`}>
                    {reports.length ? Math.round(avgScore) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reports Saved</p>
                  <p className="text-2xl font-bold font-display">{reports.filter((r) => r.status === "completed").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">Reports History</CardTitle>
              <CardDescription>Your saved website audit reports</CardDescription>
            </div>
            <Link to="/reports">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No scans yet. Run your first audit above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const scores = extractScores(report);
                  return (
                    <Link key={report.id} to={`/report/${report.id}`} className="block">
                      <div className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-primary shrink-0" />
                              <p className="font-medium truncate">{report.url}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(report.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                              </span>
                              <Badge variant={report.status === "completed" ? "default" : "secondary"} className={report.status === "completed" ? "bg-score-excellent/10 text-score-excellent border-0 text-xs" : "text-xs"}>
                                {report.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {report.overall_score !== null && (
                              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${getScoreBg(report.overall_score)}`}>
                                <span className={`font-display text-lg font-bold ${getScoreColor(report.overall_score)}`}>
                                  {report.overall_score}
                                </span>
                              </div>
                            )}
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        {(scores.performance !== null || scores.seo !== null) && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Performance</span>
                                <span className={`font-bold ${getScoreColor(scores.performance)}`}>{scores.performance ?? "—"}</span>
                              </div>
                              <Progress value={scores.performance ?? 0} className="h-1.5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><Search className="h-3 w-3" /> SEO</span>
                                <span className={`font-bold ${getScoreColor(scores.seo)}`}>{scores.seo ?? "—"}</span>
                              </div>
                              <Progress value={scores.seo ?? 0} className="h-1.5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Accessibility</span>
                                <span className={`font-bold ${getScoreColor(scores.accessibility)}`}>{scores.accessibility ?? "—"}</span>
                              </div>
                              <Progress value={scores.accessibility ?? 0} className="h-1.5" />
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
