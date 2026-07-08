import { useState, useEffect, createContext, useContext, lazy, Suspense, type ReactNode } from "react";
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
import { BackofficeLayout } from "@/components/backoffice-layout";
import { UserRole } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { isMarketingHost, getMarketingOrigin } from "@/lib/subdomain";
import { SupportBubble } from "@/components/SupportBubble";

// Small shared pages loaded eagerly (no heavy deps, needed for error states)
import NotFound from "@/pages/not-found";
import AccessDenied from "@/pages/access-denied";

// Public pages — lazy-loaded per route so each page ships only its own code.
// competitive-analysis pulls jsPDF (~200 kB) and must not land on login/landing.
const LandingPage = lazy(() => import("@/pages/landing"));
const LoginPage = lazy(() => import("@/pages/login"));
const SignupPage = lazy(() => import("@/pages/signup"));
const CompetitiveAnalysisPage = lazy(() => import("@/pages/competitive-analysis"));

// Authenticated pages — lazy-loaded so the public routes don't pay their cost
const DashboardIC = lazy(() => import("@/pages/dashboard-ic"));
const DashboardSupervisor = lazy(() => import("@/pages/dashboard-supervisor"));
const DashboardAdmin = lazy(() => import("@/pages/dashboard-admin"));
const OOORequestsPage = lazy(() => import("@/pages/ooo-requests"));
const TimesheetsPage = lazy(() => import("@/pages/timesheets"));
const InvoicesPage = lazy(() => import("@/pages/invoices"));
const LeaveRequestsPage = lazy(() => import("@/pages/leave-requests"));
const EvaluationsPage = lazy(() => import("@/pages/evaluations"));
const UsersPage = lazy(() => import("@/pages/users"));
const MyTeamPage = lazy(() => import("@/pages/my-team"));
const ActivityLogsPage = lazy(() => import("@/pages/activity-logs"));
const OvertimeApprovalsPage = lazy(() => import("@/pages/overtime-approvals"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const TimesheetsOverviewPage = lazy(() => import("@/pages/timesheets-overview"));
const ApprovedTimesheetsPage = lazy(() => import("@/pages/approved-timesheets"));
const TeamTimesheetsPage = lazy(() => import("@/pages/team-timesheets"));
const ICDetailPage = lazy(() => import("@/pages/ic-detail"));
const TeamInvoicesPage = lazy(() => import("@/pages/team-invoices"));
const AllTimesheetsPage = lazy(() => import("@/pages/all-timesheets"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const ExpensesPage = lazy(() => import("@/pages/expenses"));
const TeamExpensesPage = lazy(() => import("@/pages/team-expenses"));
const BillingPage = lazy(() => import("@/pages/billing"));
const AdminBlogPage = lazy(() => import("@/pages/admin-blog"));
const AdminSeoPage = lazy(() => import("@/pages/admin-seo"));
const MigrateFilesPage = lazy(() => import("@/pages/migrate-files"));

// Back-office pages — lazy-loaded (only platform admins ever reach these)
const BackofficeLoginPage = lazy(() => import("@/pages/backoffice-login"));
const BackofficeOverviewPage = lazy(() => import("@/pages/backoffice-overview"));
const BackofficeTenantDetailPage = lazy(() => import("@/pages/backoffice-tenant-detail"));
const BackofficeDiscountsPage = lazy(() => import("@/pages/backoffice-discounts"));
const BackofficeLogsPage = lazy(() => import("@/pages/backoffice-logs"));
const BackofficeFlagsPage = lazy(() => import("@/pages/backoffice-flags"));
const BackofficeTicketsPage = lazy(() => import("@/pages/backoffice-tickets"));
const BackofficeSupportPage = lazy(() => import("@/pages/backoffice-support"));
const BackofficeAuditLogPage = lazy(() => import("@/pages/backoffice-audit-log"));

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

const pageFallback = (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

function PublicRoutes() {
  return (
    <Suspense fallback={pageFallback}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/competitive-analysis" component={CompetitiveAnalysisPage} />
        <Route component={LandingPage} />
      </Switch>
    </Suspense>
  );
}

// Internal console for the Axle team (owner/engineers/support) to manage
// tenants — mocked data only, gated the same way as other admin-only areas.
function BackOfficeRoutes() {
  return (
    <Suspense fallback={pageFallback}>
      <Switch>
        <Route path="/back-office" component={BackofficeOverviewPage} />
        <Route path="/back-office/tenants" component={BackofficeTenantDetailPage} />
        <Route path="/back-office/discounts" component={BackofficeDiscountsPage} />
        <Route path="/back-office/logs" component={BackofficeLogsPage} />
        <Route path="/back-office/flags" component={BackofficeFlagsPage} />
        <Route path="/back-office/tickets" component={BackofficeTicketsPage} />
        <Route path="/back-office/support" component={BackofficeSupportPage} />
        <Route path="/back-office/blog">{() => <BackofficeLayout title="Blog articles"><AdminBlogPage /></BackofficeLayout>}</Route>
        <Route path="/back-office/seo">{() => <BackofficeLayout title="SEO pages"><AdminSeoPage /></BackofficeLayout>}</Route>
        <Route path="/back-office/migrate">{() => <BackofficeLayout title="File migration"><MigrateFilesPage /></BackofficeLayout>}</Route>
        <Route path="/back-office/audit-log" component={BackofficeAuditLogPage} />
        <Route component={BackofficeOverviewPage} />
      </Switch>
    </Suspense>
  );
}

function ProtectedRoutes() {
  const { user, isLoading, isAdmin, isPlatformAdmin } = useAuth();
  const [location] = useLocation();

  // On the marketing domain (axlehq.app / www.axlehq.app) always render public
  // routes — even when the user has a valid session. The product app lives on
  // app.axlehq.app; authenticated state must never hijack the landing page.
  if (isMarketingHost()) {
    return <PublicRoutes />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Back-office login page — always accessible without auth.
  // If already logged in as platform admin, skip login and go straight to the console.
  if (location === "/back-office/login") {
    if (user && isPlatformAdmin) {
      window.location.replace("/back-office");
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      );
    }
    return <Suspense fallback={pageFallback}><BackofficeLoginPage /></Suspense>;
  }

  // Other back-office routes — redirect to /back-office/login when unauthenticated
  // or when logged in as a regular user (not a platform admin).
  if (location.startsWith("/back-office")) {
    if (!user) {
      window.location.replace("/back-office/login");
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      );
    }
    return isPlatformAdmin ? <BackOfficeRoutes /> : (
      // Logged in as a regular org user — send them to the back-office login
      // so they get a clear "platform admins only" error rather than a generic denied page.
      (() => {
        window.location.replace("/back-office/login");
        return (
          <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        );
      })()
    );
  }

  if (!user) {
    const publicPaths = ["/login", "/signup", "/", "/competitive-analysis"];
    const isPublicPath = publicPaths.includes(location) || location === "";
    if (!isPublicPath) {
      window.location.replace(`${getMarketingOrigin()}/login?redirect=${encodeURIComponent(location)}`);
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
    return <Suspense fallback={pageFallback}><CompetitiveAnalysisPage /></Suspense>;
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
              <Suspense fallback={pageFallback}>
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/ooo-requests" component={OOORequestsPage} />
                  <Route path="/ooo-requests/new" component={OOORequestsPage} />
                  <Route path="/timesheets" component={TimesheetsPage} />
                  <Route path="/timesheets/current" component={TimesheetsPage} />
                  <Route path="/invoices" component={InvoicesPage} />
                  <Route path="/invoices/upload" component={InvoicesPage} />
                  <Route path="/expenses" component={ExpensesPage} />
                  <Route path="/team-expenses" component={TeamExpensesPage} />
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
                  <Route path="/profile" component={ProfilePage} />
                  <Route path="/timesheets-overview" component={TimesheetsOverviewPage} />
                  <Route path="/approved-timesheets" component={ApprovedTimesheetsPage} />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
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
            <SupportBubble />
            <ProtectedRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
