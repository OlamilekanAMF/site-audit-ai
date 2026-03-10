import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PremiumGate } from "@/components/PremiumGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Download, Save, Sparkles } from "lucide-react";

type Keyword = {
  keyword: string;
  search_intent: string;
  difficulty_score: number;
  opportunity_score: number;
  suggested_content: string;
};

const intentColors: Record<string, string> = {
  informational: "bg-primary/10 text-primary",
  navigational: "bg-accent/10 text-accent",
  commercial: "bg-score-average/10 text-score-average",
  transactional: "bg-score-excellent/10 text-score-excellent",
};

const getDifficultyColor = (score: number) => {
  if (score <= 30) return "text-score-excellent";
  if (score <= 60) return "text-score-average";
  return "text-score-poor";
};

const getOpportunityColor = (score: number) => {
  if (score >= 70) return "text-score-excellent";
  if (score >= 40) return "text-score-average";
  return "text-score-poor";
};

const KeywordResearch = () => {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { toast } = useToast();

  if (!isPremium) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Keyword Research</h1>
            <p className="text-sm text-muted-foreground mt-0.5">AI-powered keyword suggestions for your SEO strategy.</p>
          </div>
          <PremiumGate feature="Keyword Research" />
        </div>
      </DashboardLayout>
    );
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("keyword-research", {
        body: { topic: topic.trim() },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setKeywords(data.keywords || []);
      toast({ title: "Keywords generated!", description: `Found ${data.keywords?.length || 0} keyword suggestions.` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!keywords.length) return;
    const headers = "Keyword,Difficulty,Opportunity,Search Intent,Suggested Content";
    const rows = keywords.map((k) =>
      `"${k.keyword}",${k.difficulty_score},${k.opportunity_score},"${k.search_intent}","${k.suggested_content}"`
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${topic.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "Keywords downloaded as CSV." });
  };

  const handleSaveAll = async () => {
    if (!keywords.length || !user) return;
    setSaving(true);
    try {
      const rows = keywords.map((k) => ({
        user_id: user.id,
        topic: topic.trim(),
        keyword: k.keyword,
        search_intent: k.search_intent,
        difficulty_score: k.difficulty_score,
        opportunity_score: k.opportunity_score,
        suggested_content: k.suggested_content,
      }));
      const { error } = await supabase.from("saved_keywords").insert(rows);
      if (error) throw error;
      toast({ title: "Saved!", description: `${keywords.length} keywords saved to your library.` });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-display text-2xl font-bold">Keyword Research</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered keyword suggestions for your SEO strategy.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter a topic, niche, or website URL..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="gap-2 min-w-[140px]">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Researching</> : <><Search className="h-4 w-4" /> Research</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {keywords.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-base">Results for "{topic}"</CardTitle>
                  <CardDescription>{keywords.length} keywords found</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSaveAll} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save All
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
                    <Download className="h-3.5 w-3.5" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">Keyword</th>
                      <th className="text-center pb-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">Difficulty</th>
                      <th className="text-center pb-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">Opportunity</th>
                      <th className="text-center pb-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">Search Intent</th>
                      <th className="text-left pb-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">Suggested Content</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-medium">{kw.keyword}</td>
                        <td className="py-3 text-center">
                          <span className={`font-display font-bold ${getDifficultyColor(kw.difficulty_score)}`}>
                            {kw.difficulty_score}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`font-display font-bold ${getOpportunityColor(kw.opportunity_score)}`}>
                            {kw.opportunity_score}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant="secondary" className={`text-xs capitalize ${intentColors[kw.search_intent] || ""}`}>
                            {kw.search_intent}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground capitalize">{kw.suggested_content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KeywordResearch;
