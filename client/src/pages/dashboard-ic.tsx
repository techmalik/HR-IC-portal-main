import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { Calendar, Clock, FileText, Plus, ArrowRight, Timer } from "lucide-react";
import type { OOORequest, Timesheet, Invoice, OvertimeRequest } from "@shared/schema";
import { format, getDaysInMonth } from "date-fns";

export default function DashboardIC() {
  const { user } = useAuth();

  const { data: oooRequests, isLoading: oooLoading } = useQuery<OOORequest[]>({
    queryKey: ["/api/ooo-requests", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/ooo-requests?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch OOO requests");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: timesheets, isLoading: timesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch timesheets");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: overtimeRequests, isLoading: overtimeLoading } = useQuery<OvertimeRequest[]>({
    queryKey: ["/api/overtime-requests/my"],
    queryFn: async () => {
      const res = await fetch(`/api/overtime-requests?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch overtime requests");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const now = new Date();
  const currentMonth = now.toLocaleString("default", { month: "long", year: "numeric" });
  const currentTimesheet = timesheets?.find(
    (t) => t.month === now.getMonth() + 1 && t.year === now.getFullYear()
  );

  const totalExpectedHours = 160;
  const loggedHours = currentTimesheet?.totalHours || 0;
  const progressPercent = Math.min((loggedHours / totalExpectedHours) * 100, 100);

  // Expected hours paced to today's date within the month
  const daysInMonth = getDaysInMonth(now);
  const dayOfMonth = now.getDate();
  const workdaysPassedRatio = dayOfMonth / daysInMonth;
  const expectedByNow = totalExpectedHours * workdaysPassedRatio;
  const behindBy = expectedByNow - loggedHours;

  const progressColor =
    behindBy <= 0
      ? "bg-emerald-500"
      : behindBy <= 16
      ? "bg-amber-500"
      : "bg-red-500";

  const upcomingOOO = oooRequests
    ?.filter((r) => new Date(r.startDate) >= new Date())
    .slice(0, 3);

  const recentInvoices = invoices?.slice(0, 3);

  const pendingOvertimeRequests = overtimeRequests?.filter((r) => r.status === "pending") || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-testid="tour-target-welcome">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {user?.firstName}</h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your HR activities
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Leave Requests
            </CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {oooLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-500" data-testid="text-pending-ooo-count">
                {oooRequests?.filter((r) => r.status === "pending").length || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {currentMonth} Hours
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {timesheetsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-current-hours">
                {currentTimesheet?.totalHours || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Invoices Uploaded
            </CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-invoices-count">
                {invoices?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Overtime
            </CardTitle>
            <Timer className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overtimeLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-500" data-testid="text-pending-overtime-count">
                {pendingOvertimeRequests.length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Out of Office Requests</CardTitle>
              <CardDescription>Your upcoming time off</CardDescription>
            </div>
            <Button asChild size="sm" data-testid="button-new-ooo">
              <Link href="/ooo-requests/new">
                <Plus className="w-4 h-4 mr-1" />
                New Request
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {oooLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : upcomingOOO && upcomingOOO.length > 0 ? (
              <div className="space-y-3">
                {upcomingOOO.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`ooo-request-${request.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(request.startDate), "MMM d")} -{" "}
                        {format(new Date(request.endDate), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {request.reason}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                  <Link href="/ooo-requests" data-testid="link-view-all-ooo">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming time off scheduled</p>
                <Button asChild size="sm" className="mt-4" data-testid="button-request-time-off">
                  <Link href="/ooo-requests/new">Request Time Off</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Current Timesheet</CardTitle>
              <CardDescription>{currentMonth}</CardDescription>
            </div>
            <Button asChild size="sm" data-testid="button-edit-timesheet">
              <Link href="/timesheets/current">
                {currentTimesheet ? "Edit" : "Start"}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {timesheetsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : currentTimesheet ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={currentTimesheet.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Hours</span>
                  <span className="font-semibold" data-testid="text-timesheet-hours">
                    {currentTimesheet.totalHours}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${progressColor}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {currentTimesheet.totalHours} of {totalExpectedHours} expected hours
                  {behindBy > 0 && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      ({Math.round(behindBy)}h behind pace)
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No timesheet started for this month</p>
                <Button asChild size="sm" className="mt-4" data-testid="button-start-timesheet">
                  <Link href="/timesheets/current">Start Timesheet</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <CardDescription>Your uploaded invoices</CardDescription>
            </div>
            <Button asChild size="sm" data-testid="button-upload-invoice">
              <Link href="/invoices/upload">
                <Plus className="w-4 h-4 mr-1" />
                Upload Invoice
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentInvoices && recentInvoices.length > 0 ? (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`invoice-${invoice.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{invoice.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.uploadedAt!), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    {invoice.amount && (
                      <span className="font-medium">${(invoice.amount / 100).toFixed(2)}</span>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                  <Link href="/invoices" data-testid="link-view-all-invoices">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No invoices uploaded yet</p>
                <Button asChild size="sm" className="mt-4" data-testid="button-first-invoice">
                  <Link href="/invoices/upload">Upload Your First Invoice</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
