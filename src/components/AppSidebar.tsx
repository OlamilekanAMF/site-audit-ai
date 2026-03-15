import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Search,
  FileText,
  CreditCard,
  LogOut,
  Stethoscope,
  Settings,
  Target,
  Trophy,
  BarChart3,
  Bell,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "SEO Dashboard", url: "/seo-dashboard", icon: BarChart3 },
  { title: "Scanner", url: "/scan", icon: Search },
  { title: "Keyword Research", url: "/keywords", icon: Target, premium: true },
  { title: "Ranking Opportunities", url: "/opportunities", icon: Trophy, premium: true },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "SEO Reports", url: "/seo-reports", icon: FileText, premium: true },
  { title: "Competitor Analysis", url: "/competitor-analysis", icon: Target, premium: true },
  { title: "Score Alerts", url: "/competitor-alerts", icon: Bell, premium: true },
  { title: "Billing", url: "/dashboard/pricing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("competitor_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count }) => {
        if (count != null) setUnreadAlerts(count);
      });
  }, [user, location.pathname]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-sidebar-primary" />
              {!collapsed && (
                <span className="font-display text-lg font-bold text-sidebar-primary-foreground">
                  SiteDoctor AI
                </span>
              )}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && (
                        <span className="flex items-center gap-1.5 flex-1">
                          {item.title}
                          {item.premium && (
                            <Badge variant="secondary" className="text-[8px] py-0 px-1 leading-tight bg-sidebar-accent text-sidebar-primary">
                              PRO
                            </Badge>
                          )}
                          {item.url === "/competitor-alerts" && unreadAlerts > 0 && (
                            <Badge className="ml-auto text-[9px] py-0 px-1.5 leading-tight bg-primary text-primary-foreground">
                              {unreadAlerts > 99 ? "99+" : unreadAlerts}
                            </Badge>
                          )}
                        </span>
                      )}
                      {collapsed && item.url === "/competitor-alerts" && unreadAlerts > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                          {unreadAlerts > 9 ? "9+" : unreadAlerts}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
