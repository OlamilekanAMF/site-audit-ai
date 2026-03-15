import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PremiumGate } from "@/components/PremiumGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, TrendingUp, TrendingDown, Loader2, CheckCheck, Trash2, Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Alert = {
  id: string;
  site_url: string;
  metric: string;
  old_score: number;
  new_score: number;
  diff: number;
  read: boolean;
  created_at: string;
  comparison_id: string | null;
};

const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

const CompetitorAlerts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("competitor_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setAlerts(data as unknown as Alert[]);
        setLoading(false);
      });
  }, [user]);

  const markAllRead = async () => {
    const unreadIds = alerts.filter((a) => !a.read).map((a) => a.id);
    if (!unreadIds.length) return;
    const { error } = await supabase
      .from("competitor_alerts")
      .update({ read: true })
      .in("id", unreadIds);
    if (!error) {
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      toast({ title: "All marked as read" });
    }
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase.from("competitor_alerts").delete().eq("id", id);
    if (!error) setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAll = async () => {
    if (!user) return;
    const { error } = await supabase.from("competitor_alerts").delete().eq("user_id", user.id);
    if (!error) {
      setAlerts([]);
      toast({ title: "All alerts cleared" });
    }
  };

  const filtered = filter === "unread" ? alerts.filter((a) => !a.read) : alerts;
  const unreadCount = alerts.filter((a) => !a.read).length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <DashboardLayout>
      <PremiumGate feature="Competitor Alerts">
        <div className="space-y-6 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary" /> Score Alerts
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Significant competitor score changes (±10 pts) detected during re-runs.
              </p>
            </div>
            {unreadCount > 0 && (
              <Badge className="text-xs">{unreadCount} unread</Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setFilter("all")}
            >
              <Filter className="h-3 w-3" /> All ({alerts.length})
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setFilter("unread")}
            >
              <Bell className="h-3 w-3" /> Unread ({unreadCount})
            </Button>
            <div className="flex-1" />
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={markAllRead}>
                <CheckCheck className="h-3 w-3" /> Mark all read
              </Button>
            )}
            {alerts.length > 0 && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5 text-destructive hover:text-destructive" onClick={clearAll}>
                <Trash2 className="h-3 w-3" /> Clear all
              </Button>
            )}
          </div>

          {/* Alerts List */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {filter === "unread" ? "No unread alerts." : "No alerts yet. Re-run a saved competitor comparison to generate alerts."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((alert) => {
                    const improved = alert.diff > 0;
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-center gap-4 px-4 py-3 transition-colors ${!alert.read ? "bg-primary/5" : "hover:bg-muted/30"}`}
                      >
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${improved ? "bg-score-excellent/10" : "bg-score-poor/10"}`}>
                          {improved ? (
                            <TrendingUp className="h-4 w-4 text-score-excellent" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-score-poor" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            <span className="text-foreground">{shortUrl(alert.site_url)}</span>
                            <span className="text-muted-foreground"> — {alert.metric} </span>
                            <span className={improved ? "text-score-excellent" : "text-score-poor"}>
                              {improved ? "improved" : "dropped"}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Score: {alert.old_score} → {alert.new_score}{" "}
                            <span className={`font-bold ${improved ? "text-score-excellent" : "text-score-poor"}`}>
                              ({improved ? "+" : ""}{alert.diff} pts)
                            </span>
                            <span className="ml-2">· {timeAgo(alert.created_at)}</span>
                          </p>
                        </div>
                        {!alert.read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteAlert(alert.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PremiumGate>
    </DashboardLayout>
  );
};

export default CompetitorAlerts;
