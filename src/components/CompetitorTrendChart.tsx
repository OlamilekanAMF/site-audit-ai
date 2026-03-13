import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

type SavedComparison = {
  id: string;
  your_url: string;
  competitor_urls: string[];
  results: {
    yourSite: { url: string; overallScore: number; mobile?: Record<string, any> | null };
    competitors: { url: string; overallScore: number; mobile?: Record<string, any> | null }[];
  };
  created_at: string;
};

const METRIC_OPTIONS = [
  { value: "overallScore", label: "Overall Score" },
  { value: "performance", label: "Performance" },
  { value: "seo", label: "SEO" },
  { value: "accessibility", label: "Accessibility" },
  { value: "bestPractices", label: "Best Practices" },
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(165 70% 42%)",
  "hsl(45 90% 55%)",
  "hsl(340 70% 55%)",
];

const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export function CompetitorTrendChart({ comparisons }: { comparisons: SavedComparison[] }) {
  const [selectedUrl, setSelectedUrl] = useState<string>("");
  const [metric, setMetric] = useState("overallScore");

  // Group comparisons by your_url
  const urlGroups = useMemo(() => {
    const groups: Record<string, SavedComparison[]> = {};
    comparisons.forEach((c) => {
      const key = c.your_url;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    // Only show URLs with 2+ comparisons
    return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length >= 2));
  }, [comparisons]);

  const urls = Object.keys(urlGroups);

  // Auto-select first URL
  const activeUrl = selectedUrl && urlGroups[selectedUrl] ? selectedUrl : urls[0];

  const { chartData, allSites } = useMemo(() => {
    if (!activeUrl || !urlGroups[activeUrl]) return { chartData: [], allSites: [] as string[] };

    const group = [...urlGroups[activeUrl]].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const sitesSet = new Set<string>();
    group.forEach((c) => {
      sitesSet.add(c.results.yourSite.url);
      c.results.competitors.forEach((comp) => sitesSet.add(comp.url));
    });
    const allSites = Array.from(sitesSet);

    const chartData = group.map((c) => {
      const point: Record<string, string | number> = {
        date: new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };

      const getScore = (site: SavedComparison["results"]["yourSite"]) => {
        if (metric === "overallScore") return site.overallScore ?? null;
        return (site.mobile as any)?.[metric] ?? null;
      };

      point[c.results.yourSite.url] = getScore(c.results.yourSite) ?? 0;
      c.results.competitors.forEach((comp) => {
        point[comp.url] = getScore(comp) ?? 0;
      });

      return point;
    });

    return { chartData, allSites };
  }, [activeUrl, urlGroups, metric]);

  if (urls.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Score Trends
            </CardTitle>
            <CardDescription className="text-xs mt-1">Track how scores change across saved comparisons</CardDescription>
          </div>
          <div className="flex gap-2">
            {urls.length > 1 && (
              <Select value={activeUrl} onValueChange={setSelectedUrl}>
                <SelectTrigger className="h-8 text-xs w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urls.map((url) => (
                    <SelectItem key={url} value={url} className="text-xs">
                      {shortUrl(url)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number, name: string) => [value, shortUrl(name)]}
              />
              <Legend formatter={(value: string) => shortUrl(value)} wrapperStyle={{ fontSize: "11px" }} />
              {allSites.map((site, i) => (
                <Line
                  key={site}
                  type="monotone"
                  dataKey={site}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={i === 0 ? 2.5 : 1.5}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name={site}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
