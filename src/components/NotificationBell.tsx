import { useEffect, useState } from "react";
import { Bell, Globe, CheckCircle2, ArrowUpRight, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ScanNotification = {
  kind: "scan";
  id: string;
  url: string;
  overall_score: number | null;
  created_at: string;
  read: boolean;
};

type SecurityNotification = {
  kind: "security";
  id: string;
  title: string;
  description: string | null;
  severity: "critical" | "high" | "medium" | "low";
  source: "website_scan" | "platform";
  scan_report_id: string | null;
  site_url: string | null;
  created_at: string;
  read: boolean;
};

type Notification = ScanNotification | SecurityNotification;

const severityClass = (s: string) => {
  switch (s) {
    case "critical":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "high":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const [scansRes, alertsRes] = await Promise.all([
        supabase
          .from("scan_reports")
          .select("id, url, overall_score, created_at")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("security_alerts")
          .select("id, title, description, severity, source, scan_report_id, site_url, created_at, read")
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

      const scans: Notification[] = (scansRes.data || []).map((d) => ({
        kind: "scan" as const,
        ...d,
        read: true, // older scans treated as read; only security drives the unread badge
      }));
      const alerts: Notification[] = (alertsRes.data || []).map((a) => ({
        kind: "security" as const,
        id: a.id,
        title: a.title,
        description: a.description,
        severity: a.severity as SecurityNotification["severity"],
        source: a.source as SecurityNotification["source"],
        scan_report_id: a.scan_report_id,
        site_url: a.site_url,
        created_at: a.created_at,
        read: a.read,
      }));

      const merged = [...alerts, ...scans].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(merged.slice(0, 20));
    };
    fetchAll();

    const channel = supabase
      .channel("dashboard-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scan_reports" },
        (payload) => {
          const row = payload.new as any;
          if (row.status !== "completed") return;
          setNotifications((prev) => [
            { kind: "scan", id: row.id, url: row.url, overall_score: row.overall_score, created_at: row.created_at, read: true },
            ...prev,
          ].slice(0, 20));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "security_alerts" },
        (payload) => {
          const a = payload.new as any;
          if (a.user_id !== user.id) return;
          setNotifications((prev) => [
            {
              kind: "security",
              id: a.id,
              title: a.title,
              description: a.description,
              severity: a.severity,
              source: a.source,
              scan_report_id: a.scan_report_id,
              site_url: a.site_url,
              created_at: a.created_at,
              read: false,
            },
            ...prev,
          ].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadAlerts = notifications.filter((n) => n.kind === "security" && !n.read);
  const unreadCount = unreadAlerts.length;

  const markAllRead = async () => {
    const ids = unreadAlerts.map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (ids.length > 0) {
      await supabase.from("security_alerts").update({ read: true }).in("id", ids);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) markAllRead();
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-score-excellent";
    if (score >= 50) return "text-score-average";
    return "text-score-poor";
  };

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
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {unreadCount} new security {unreadCount === 1 ? "alert" : "alerts"}
            </Badge>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) =>
              n.kind === "security" ? (
                <Link
                  key={`sec-${n.id}`}
                  to={n.scan_report_id ? `/report/${n.scan_report_id}` : "/dashboard"}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 group ${
                    !n.read ? "bg-destructive/5" : ""
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${severityClass(n.severity)} border`}>
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{n.title}</span>
                      <Badge variant="outline" className={`text-[10px] uppercase ${severityClass(n.severity)}`}>
                        {n.severity}
                      </Badge>
                    </div>
                    {n.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {n.site_url && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {n.site_url.replace(/^https?:\/\//, "")}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground/60">· {timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  key={`scan-${n.id}`}
                  to={`/report/${n.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 group"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {n.url.replace(/^https?:\/\//, "")}
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Score:{" "}
                        <span className={`font-semibold ${getScoreColor(n.overall_score)}`}>
                          {n.overall_score ?? "—"}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground/60">· {timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </Link>
              )
            )
          )}
        </div>
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <Link
              to="/reports"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline"
            >
              View all reports →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
