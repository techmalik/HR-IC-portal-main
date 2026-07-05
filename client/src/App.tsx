import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { MobileBottomTabs } from "@/components/mobile-bottom-tabs";
import { InstallPwaHint } from "@/components/install-pwa-hint";
import { OnboardingTour, portalTourConfig, ownerTourConfig, type TourStep } from "@/components/onboarding-tour";
import NotFound from "@/pages/not-found";
import AccessDenied from "@/pages/access-denied";
import LoginPage from "@/pages/login";
import DashboardIC from "@/pages/dashboard-ic";
import DashboardSupervisor from "@/pages/dashboard-supervisor";
import DashboardAdmin from "@/pages/dashboard-admin";
import OOORequestsPage from "@/pages/ooo-requests";
import TimesheetsPage from "@/pages/timesheets";
import InvoicesPage from "@/pages/invoices";
import LeaveRequestsPage from "@/pages/leave-requests";
import EvaluationsPage from "@/pages/evaluations";
import UsersPage from "@/pages/users";
import MyTeamPage from "@/pages/my-team";
import ActivityLogsPage from "@/pages/activity-logs";
import OvertimeApprovalsPage from "@/pages/overtime-approvals";
import ProfilePage from "@/pages/profile";
import TimesheetsOverviewPage from "@/pages/timesheets-overview";
import ApprovedTimesheetsPage from "@/pages/approved-timesheets";
import TeamTimesheetsPage from "@/pages/team-timesheets";
import ICDetailPage from "@/pages/ic-detail";
import TeamInvoicesPage from "@/pages/team-invoices";
import AllTimesheetsPage from "@/pages/all-timesheets";
import AnalyticsPage from "@/pages/analytics";
import { UserRole } from "@shared/schema";
import { Loader2 } from "lucide-react";
import MigrateFilesPage from "@/pages/migrate-files";
import SignupPage from "@/pages/signup";
import LandingPage from "@/pages/landing";
import BillingPage from "@/pages/billing";
import AdminBlogPage from "@/pages/admin-blog";
import AdminSeoPage from "@/pages/admin-seo";
import ExpensesPage from "@/pages/expenses";
import CompetitiveAnalysisPage from "@/pages/competitive-analysis";
import BackofficeOverviewPage from "@/pages/backoffice-overview";
import BackofficeTenantDetailPage from "@/pages/backoffice-tenant-detail";
import BackofficeLogsPage from "@/pages/backoffice-logs";
import BackofficeFlagsPage from "@/pages/backoffice-flags";
import BackofficeTicketsPage from "@/pages/backoffice-tickets";
import BackofficeSupportPage from "@/pages/backoffice-support";

type TourId = "portal" | "timesheets" | "invoices" | "ooo" | "supervisor" | "owner";

interface TourContextType {
  activeTour: TourId | null;
  pendingTour: TourId | null;
  startTour: (tourId: TourId) => void;
  startTourAfterNavigation: (tourId: TourId) => void;
  activatePendingTour: () => void;
  completeTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTourContext must be used within TourProvider");
  }
  return context;
}

function TourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourId | null>(null);
  const [pendingTour, setPendingTour] = useState<TourId | null>(null);
  const [location] = useLocation();

  const startTour = (tourId: TourId) => {
    setActiveTour(tourId);
    setPendingTour(null);
  };

  const startTourAfterNavigation = (tourId: TourId) => {
    setPendingTour(tourId);
  };

  const activatePendingTour = () => {
    if (pendingTour) {
      setActiveTour(pendingTour);
      setPendingTour(null);
    }
  };

  const completeTour = () => {
    setActiveTour(null);
    setPendingTour(null);
  };

  // Map tour IDs to expected route prefixes for validation
  const tourRouteMap: Record<TourId, string[]> = {
    portal: ["/"],
    owner: ["/"],
    timesheets: ["/timesheets"],
    invoices: ["/invoices"],
    ooo: ["/ooo-requests"],
    supervisor: ["/leave-requests", "/overtime-approvals", "/team-timesheets", "/team-invoices"],
  };

  // Activate pending tour when route changes (with delay to allow page to mount)
  useEffect(() => {
    if (pendingTour) {
      const timer = setTimeout(() => {
        // Verify we're on the correct route before activating
        const currentPath = location.split('?')[0];
        const expectedPrefixes = tourRouteMap[pendingTour];
        const isOnCorrectRoute = expectedPrefixes.some(prefix => 
          currentPath === prefix || currentPath.startsWith(prefix + "/") || prefix === currentPath
        );
        
        if (isOnCorrectRoute) {
          activatePendingTour();
        } else {
          // Clear pending tour if we're not on the expected route
          setPendingTour(null);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [location, pendingTour]);

  return (
    <TourContext.Provider value={{ activeTour, pendingTour, startTour, startTourAfterNavigation, activatePendingTour, completeTour }}>
      {children}
    </TourContext.Provider>
  );
}

interface RouteConfig {
  title: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  backHref?: string;
  backLabel?: string;
}

function getRouteConfig(pathname: string, userRole?: string, hasDirectReports?: boolean): RouteConfig {
  const isIC = userRole === UserRole.IC;
  const isSupervisor = hasDirectReports === true;

  const routes: Record<string, RouteConfig> = {
    "/": {
      title: "Dashboard",
      breadcrumbs: [{ label: "Dashboard" }],
    },
    "/ooo-requests": {
      title: "Out of Office",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: isSupervisor ? "My Out of Office" : "Out of Office" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/ooo-requests/new": {
      title: "New OOO Request",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: isSupervisor ? "My Out of Office" : "Out of Office", href: "/ooo-requests" },
        { label: "New Request" },
      ],
      backHref: "/ooo-requests",
      backLabel: "OOO Requests",
    },
    "/timesheets": {
      title: "Timesheet Calendar",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: isSupervisor ? "My Timesheets" : "Timesheets", href: "/timesheets-overview" },
        { label: "Calendar" },
      ],
      backHref: "/timesheets-overview",
      backLabel: "Timesheets",
    },
    "/timesheets/current": {
      title: "Current Timesheet",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: isSupervisor ? "My Timesheets" : "Timesheets", href: "/timesheets-overview" },
        { label: "Current" },
      ],
      backHref: "/timesheets-overview",
      backLabel: "Timesheets",
    },
    "/timesheets-overview": {
      title: "Timesheets Overview",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: isSupervisor ? "My Timesheets" : "Timesheets" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/invoices": {
      title: "Invoices",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: isSupervisor ? "My Invoices" : "Invoices" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/invoices/upload": {
      title: "Upload Invoice",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: isSupervisor ? "My Invoices" : "Invoices", href: "/invoices" },
        { label: "Upload" },
      ],
      backHref: "/invoices",
      backLabel: "Invoices",
    },
    "/leave-requests": {
      title: "Leave Requests",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Leave Requests" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/overtime-approvals": {
      title: "Overtime Approvals",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Overtime Approvals" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/team-timesheets": {
      title: "Team Timesheets",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Team Timesheets" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/team-invoices": {
      title: "Team Invoices",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Team Invoices" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/all-timesheets": {
      title: "All Timesheets",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "All Timesheets" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/approved-timesheets": {
      title: "Approved Timesheets",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Approved Timesheets" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/evaluations": {
      title: "Performance Reviews",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Performance Reviews" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/my-team": {
      title: "Team Members",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Team Members" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/team": {
      title: "Team Member Details",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Team Members", href: "/my-team" },
        { label: "Team Member" },
      ],
      backHref: "/my-team",
      backLabel: "Team Members",
    },
    "/users": {
      title: "All Users",
      breadcrumbs: [
        { label: "All Users" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/users/new": {
      title: "Add User",
      breadcrumbs: [
        { label: "All Users", href: "/users" },
        { label: "Add User" },
      ],
      backHref: "/users",
      backLabel: "Users",
    },
    "/roles": {
      title: "Roles & Permissions",
      breadcrumbs: [
        { label: "All Users", href: "/users" },
        { label: "Roles & Permissions" },
      ],
      backHref: "/users",
      backLabel: "Users",
    },
    "/billing": {
      title: "Billing & Subscription",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Billing" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/analytics": {
      title: "Analytics",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Analytics" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/activity-logs": {
      title: "Activity Logs",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Activity Logs" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/admin/blog": {
      title: "Blog Articles",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Blog Articles" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/admin/seo": {
      title: "SEO Content",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "SEO Content" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/profile": {
      title: "Profile Settings",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Profile" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
    "/settings": {
      title: "Settings",
      breadcrumbs: [
        { label: "Dashboard", href: "/" },
        { label: "Settings" },
      ],
      backHref: "/",
      backLabel: "Dashboard",
    },
  };

  // Handle dynamic routes
  if (pathname.startsWith("/team/")) {
    return routes["/team"] || routes[pathname];
  }

  return routes[pathname] || {
    title: "Page",
    breadcrumbs: [{ label: "Dashboard", href: "/" }, { label: "Page" }],
    backHref: "/",
    backLabel: "Dashboard",
  };
}

function Dashboard() {
  const { user, isSupervisor, isAdmin } = useAuth();

  if (!user) return null;

  // Admin role always gets admin dashboard
  if (isAdmin) {
    return <DashboardAdmin />;
  }
  
  // ICs with direct reports get supervisor dashboard
  if (isSupervisor) {
    return <DashboardSupervisor />;
  }
  
  // Regular ICs get IC dashboard
  return <DashboardIC />;
}

function DynamicPageHeader() {
  const [location] = useLocation();
  const { user, isSupervisor } = useAuth();
  const { startTour, startTourAfterNavigation } = useTourContext();
  const config = getRouteConfig(location, user?.role, isSupervisor);

  return (
    <PageHeader
      title={config.title}
      breadcrumbs={config.breadcrumbs}
      backHref={config.backHref}
      backLabel={config.backLabel}
      onStartTour={startTour}
      onStartTourAfterNavigation={startTourAfterNavigation}
      showSupervisorTour={isSupervisor}
    />
  );
}

function AdminOnlyRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <AccessDenied />;
  }
  return <Component />;
}

function PortalTourWrapper() {
  const { user } = useAuth();
  const { activeTour, completeTour } = useTourContext();
  const [showPortalTour, setShowPortalTour] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Don't show tour while user needs to change password
  const isPasswordChangeRequired = user?.mustChangePassword === true;

  const isOwner = user?.role === UserRole.OWNER;
  const tourId = isOwner ? "owner" : "portal";
  const tourConfig = isOwner ? ownerTourConfig : portalTourConfig;

  useEffect(() => {
    if (!user || hasCheckedOnboarding || isPasswordChangeRequired) return;
    
    const completedOnboarding = (user.completedOnboarding as Record<string, boolean>) || {};
    const tourCompleted = completedOnboarding[tourId] === true;
    
    if (!tourCompleted) {
      const timer = setTimeout(() => setShowPortalTour(true), 500);
      return () => clearTimeout(timer);
    }
    setHasCheckedOnboarding(true);
  }, [user, hasCheckedOnboarding, isPasswordChangeRequired, tourId]);

  useEffect(() => {
    if ((activeTour === "portal" || activeTour === "owner") && !isPasswordChangeRequired) {
      setShowPortalTour(true);
    }
  }, [activeTour, isPasswordChangeRequired]);

  const handleComplete = () => {
    setShowPortalTour(false);
    setHasCheckedOnboarding(true);
    completeTour();
  };

  if (!showPortalTour) return null;

  return (
    <OnboardingTour
      tourId={tourId}
      steps={tourConfig.steps}
      onComplete={handleComplete}
      onSkip={handleComplete}
    />
  );
}

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/competitive-analysis" component={CompetitiveAnalysisPage} />
      <Route component={LandingPage} />
    </Switch>
  );
}

// Internal console for the Axle team (owner/engineers/support) to manage
// tenants — mocked data only, gated the same way as other admin-only areas.
function BackOfficeRoutes() {
  return (
    <Switch>
      <Route path="/back-office" component={BackofficeOverviewPage} />
      <Route path="/back-office/tenants" component={BackofficeTenantDetailPage} />
      <Route path="/back-office/logs" component={BackofficeLogsPage} />
      <Route path="/back-office/flags" component={BackofficeFlagsPage} />
      <Route path="/back-office/tickets" component={BackofficeTicketsPage} />
      <Route path="/back-office/support" component={BackofficeSupportPage} />
      <Route component={BackofficeOverviewPage} />
    </Switch>
  );
}

function ProtectedRoutes() {
  const { user, isLoading, isAdmin, isPlatformAdmin } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const publicPaths = ["/login", "/signup", "/", "/competitive-analysis"];
    const isPublicPath = publicPaths.includes(location) || location === "";
    if (!isPublicPath) {
      window.location.replace(`/login?redirect=${encodeURIComponent(location)}`);
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
    return <PublicRoutes />;
  }

  // Standalone strategy report — render outside the app shell to avoid
  // a double header/sidebar for authenticated users.
  if (location === "/competitive-analysis") {
    return <CompetitiveAnalysisPage />;
  }

  // Internal back-office console — platform admins only, not org admins.
  if (location.startsWith("/back-office")) {
    return isPlatformAdmin ? <BackOfficeRoutes /> : <AccessDenied />;
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <TourProvider>
      <SidebarProvider style={sidebarStyle}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <DynamicPageHeader />
            <main className="flex-1 overflow-auto bg-background pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-0" data-testid="tour-target-dashboard">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/ooo-requests" component={OOORequestsPage} />
                <Route path="/ooo-requests/new" component={OOORequestsPage} />
                <Route path="/timesheets" component={TimesheetsPage} />
                <Route path="/timesheets/current" component={TimesheetsPage} />
                <Route path="/invoices" component={InvoicesPage} />
                <Route path="/invoices/upload" component={InvoicesPage} />
                <Route path="/expenses" component={ExpensesPage} />
                <Route path="/leave-requests" component={LeaveRequestsPage} />
                <Route path="/overtime-approvals" component={OvertimeApprovalsPage} />
                <Route path="/team-timesheets" component={TeamTimesheetsPage} />
                <Route path="/team-invoices" component={TeamInvoicesPage} />
                <Route path="/all-timesheets" component={AllTimesheetsPage} />
                <Route path="/analytics">{() => <AdminOnlyRoute component={AnalyticsPage} />}</Route>
                <Route path="/evaluations" component={EvaluationsPage} />
                <Route path="/my-team" component={MyTeamPage} />
                <Route path="/team/:userId" component={ICDetailPage} />
                <Route path="/users">{() => <AdminOnlyRoute component={UsersPage} />}</Route>
                <Route path="/users/new">{() => <AdminOnlyRoute component={UsersPage} />}</Route>
                <Route path="/roles">{() => <AdminOnlyRoute component={UsersPage} />}</Route>
                <Route path="/billing">{() => <AdminOnlyRoute component={BillingPage} />}</Route>
                <Route path="/activity-logs">{() => <AdminOnlyRoute component={ActivityLogsPage} />}</Route>
                <Route path="/admin/migrate-files">{() => <AdminOnlyRoute component={MigrateFilesPage} />}</Route>
                <Route path="/admin/blog">{() => <AdminOnlyRoute component={AdminBlogPage} />}</Route>
                <Route path="/admin/seo">{() => <AdminOnlyRoute component={AdminSeoPage} />}</Route>
                <Route path="/profile" component={ProfilePage} />
                <Route path="/timesheets-overview" component={TimesheetsOverviewPage} />
                <Route path="/approved-timesheets" component={ApprovedTimesheetsPage} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
        <PortalTourWrapper />
        {user.role === UserRole.IC && <MobileBottomTabs />}
        <InstallPwaHint />
      </SidebarProvider>
    </TourProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ProtectedRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
