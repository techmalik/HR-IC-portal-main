import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  FileText,
  Users,
  ClipboardCheck,
  Star,
  Settings,
  LogOut,
  ChevronUp,
  Shield,
  Activity,
  Timer,
  Briefcase,
  CheckSquare,
  CreditCard,
  BookOpen,
  Receipt,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badgeKey?: string;
}

interface MenuGroup {
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isSupervisor, isAdmin } = useAuth();

  const isActive = (path: string) => {
    const [itemPathname, itemSearch] = path.split("?");
    const currentPathname = location.split("?")[0];
    if (itemSearch) {
      const currentSearch = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
      return currentPathname === itemPathname && currentSearch === itemSearch;
    }
    return currentPathname === itemPathname;
  };

  // Fetch pending counts for badges (only for users with supervisor privileges)
  const { data: pendingLeaveCount } = useQuery<number>({
    queryKey: ["/api/leave-requests/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/leave-requests/pending-count", {
        credentials: "include",
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!user && isSupervisor,
  });

  const { data: pendingOvertimeCount } = useQuery<number>({
    queryKey: ["/api/overtime-requests/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/overtime-requests/pending-count", {
        credentials: "include",
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!user && isSupervisor,
  });

  const { data: pendingTimesheetsCount } = useQuery<number>({
    queryKey: ["/api/timesheets/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/timesheets/pending-count", {
        credentials: "include",
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!user && isSupervisor,
  });

  const { data: pendingInvoicesCount } = useQuery<number>({
    queryKey: ["/api/invoices/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/invoices/pending-count", {
        credentials: "include",
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!user && isSupervisor,
  });

  const { data: pendingExpensesCount } = useQuery<number>({
    queryKey: ["/api/expenses/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/expenses/pending-count", {
        credentials: "include",
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!user && isSupervisor,
  });

  const { data: pendingEvaluationsCount } = useQuery<number>({
    queryKey: ["/api/evaluations/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/evaluations/pending-count", {
        credentials: "include",
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!user,
  });

  const badgeCounts: Record<string, number> = {
    leaveRequests: pendingLeaveCount || 0,
    overtime: pendingOvertimeCount || 0,
    timesheets: pendingTimesheetsCount || 0,
    invoices: pendingInvoicesCount || 0,
    evaluations: pendingEvaluationsCount || 0,
    expenses: pendingExpensesCount || 0,
  };

  const getMenuGroups = (): MenuGroup[] => {
    if (!user) return [];

    // Simplified role system: IC and Admin only
    // ICs with direct reports (isSupervisor) get supervisor features dynamically
    const isRegularIC = user.role === "ic" && !user.hasDirectReports;
    const isICSupervisor = user.role === "ic" && user.hasDirectReports;

    const groups: MenuGroup[] = [];

    // Dashboard - top level, above categories (for supervisors and admins)
    if (isSupervisor || isAdmin) {
      groups.push({
        label: "",
        icon: LayoutDashboard,
        items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
      });
    }

    // My Workspace - available to all users
    const myWorkspaceItems: MenuItem[] = [];
    
    // Only include Dashboard in My Workspace for regular ICs (they don't have dual view or admin access)
    if (isRegularIC && !isAdmin) {
      myWorkspaceItems.push({ title: "Dashboard", url: "/", icon: LayoutDashboard });
    }
    
    myWorkspaceItems.push(
      { title: "My Time Off", url: "/ooo-requests", icon: Calendar },
      { title: "My Timesheets", url: "/timesheets-overview", icon: Clock },
      { title: "My Invoices", url: "/invoices", icon: FileText },
      { title: "My Expenses", url: "/expenses", icon: Receipt },
      { title: "My Evaluations", url: "/evaluations?view=my", icon: Star, badgeKey: "evaluations" }
    );

    groups.push({
      label: "My Workspace",
      icon: Briefcase,
      items: myWorkspaceItems,
    });

    // Approvals & Reviews - for users with supervisor privileges
    if (isSupervisor) {
      const approvalItems: MenuItem[] = [
        { title: "Team Members", url: "/my-team", icon: Users },
        { title: "Leave Requests", url: "/leave-requests", icon: Calendar, badgeKey: "leaveRequests" },
        { title: "Overtime Approvals", url: "/overtime-approvals", icon: Timer, badgeKey: "overtime" },
        { title: "Timesheet Reviews", url: "/team-timesheets", icon: Clock, badgeKey: "timesheets" },
        { title: "Invoice Reviews", url: "/team-invoices", icon: FileText, badgeKey: "invoices" },
        { title: "Expense Reviews", url: "/expenses", icon: Receipt, badgeKey: "expenses" },
        { title: "Approved Timesheets", url: "/approved-timesheets", icon: ClipboardCheck },
      ];

      // IC supervisors can manage team evaluations
      if (isICSupervisor) {
        approvalItems.push({ title: "Team Evaluations", url: "/evaluations?view=team", icon: Star });
      }

      groups.push({
        label: "Approvals & Reviews",
        icon: CheckSquare,
        items: approvalItems,
      });
    }

    // Admin - admin-specific features
    if (isAdmin) {
      groups.push({
        label: "Admin",
        icon: Shield,
        items: [
          { title: "User Management", url: "/users", icon: Users },
          { title: "All Timesheets", url: "/all-timesheets", icon: Clock },
          { title: "Performance Reviews", url: "/evaluations", icon: Star },
          { title: "Analytics", url: "/analytics", icon: BarChart3 },
          { title: "Billing", url: "/billing", icon: CreditCard },
          { title: "Activity Logs", url: "/activity-logs", icon: Activity },
          { title: "Blog Articles", url: "/admin/blog", icon: BookOpen },
          { title: "SEO Content", url: "/admin/seo", icon: BookOpen },
        ],
      });
    }

    // Settings - for all users
    groups.push({
      label: "Settings",
      icon: Settings,
      items: [
        { title: "Settings", url: "/profile", icon: Settings },
      ],
    });

    return groups;
  };

  const menuGroups = getMenuGroups();

  const getRoleLabel = () => {
    if (user?.jobTitle) {
      return user.jobTitle;
    }
    if (user?.role === "admin") {
      return "Administrator";
    }
    if (user?.hasDirectReports) {
      return "Team Lead";
    }
    return "Independent Contractor";
  };

  const getInitials = () => {
    if (!user) return "U";
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-[18px] border-b border-sidebar-border flex flex-row items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="shrink-0">
            <circle cx="14" cy="14" r="11.5" stroke="white" strokeWidth="2" />
            <circle cx="14" cy="14" r="4" fill="white" />
          </svg>
          <span className="font-bold text-[15px] tracking-tight text-neutral-50">Axle</span>
        </Link>
        <SidebarTrigger
          data-testid="button-sidebar-toggle"
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0 ml-2"
        />
      </SidebarHeader>

      <SidebarContent data-testid="tour-target-sidebar">
        {menuGroups.map((group, index) => (
          <SidebarGroup key={group.label || `group-${index}`}>
            {group.label && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[9.5px] font-semibold uppercase tracking-[0.12em] px-5 pt-3.5 pb-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        className="mx-2"
                      >
                        <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                          <item.icon className="w-4 h-4" />
                          <span className="flex-1">{item.title}</span>
                          {badgeCount > 0 && (
                            <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3" data-testid="tour-target-profile">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 px-2.5 py-6 text-sidebar-foreground hover:bg-sidebar-accent"
              data-testid="button-user-menu"
            >
              <Avatar className="h-[30px] w-[30px] border border-[#2A3545]">
                <AvatarFallback className="bg-[#1C2230] text-[#8DAFC8] text-[10.5px] font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="font-semibold text-[12.5px] text-neutral-200 truncate w-full text-left">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[10.5px] text-sidebar-foreground/70 truncate w-full text-left">
                  {getRoleLabel()}
                </span>
              </div>
              <ChevronUp className="w-3 h-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer" data-testid="link-profile">
                <Settings className="w-4 h-4 mr-2" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive cursor-pointer"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
