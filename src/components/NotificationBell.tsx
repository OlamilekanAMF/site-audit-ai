import { useEffect, useState } from "react";
import { Bell, Globe, CheckCircle2, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Notification = {
  id: string;
  url: string;
  overall_score: number | null;
  created_at: string;
  read: boolean;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("scan_reports")
        .select("id, url, overall_score, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(8);
      if (data) {
        setNotifications(
          data.map((d) => ({ ...d, read: false }))
        );
      }
    };
    fetchRecent();

    // Listen for new completions in realtime
    const channel = supabase
      .channel("scan-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scan_reports" },
        (payload) => {
          const row = payload.new as any;
          if (row.status === "completed") {
            setNotifications((prev) => [
              { id: row.id, url: row.url, overall_score: row.overall_score, created_at: row.created_at, read: false },
              ...prev.slice(0, 7),
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">Recent Scans</h4>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {notifications.length} completed
            </span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No completed scans yet
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
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
                    <span className="text-xs text-muted-foreground/60">
                      · {timeAgo(n.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
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
