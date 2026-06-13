import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { Calendar, Clock, Star, Users, CheckCircle, XCircle, FileText, Briefcase, ClipboardList, Palmtree, Receipt } from "lucide-react";
import type { OOORequest, Timesheet, User, Invoice } from "@shared/schema";
import { format, differenceInDays, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { OnboardingTour, supervisorApprovalsTourConfig, useTour } from "@/components/onboarding-tour";
import { Badge } from "@/components/ui/badge";

interface OOORequestWithUser extends OOORequest {
  userName: string;
  userEmail: string;
}

interface TimesheetWithUser extends Timesheet {
  userName: string;
  userEmail: string;
}

interface InvoiceWithUser extends Invoice {
  userName: string;
  userEmail: string;
}

export default function DashboardSupervisor() {
  const { user } = useAuth();
  const { shouldShowTour, completeTour } = useTour("supervisor");
  const [showTour, setShowTour] = useState(true);

  const { data: pendingRequests, isLoading: requestsLoading } = useQuery<OOORequestWithUser[]>({
    queryKey: ["/api/leave-requests/pending", { managerId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/leave-requests/pending?managerId=${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pending requests");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: teamTimesheets, isLoading: timesheetsLoading } = useQuery<TimesheetWithUser[]>({
    queryKey: ["/api/team/timesheets"],
  });

  const { data: teamInvoices, isLoading: teamInvoicesLoading } = useQuery<InvoiceWithUser[]>({
    queryKey: ["/api/team/invoices"],
  });

  const { data: directReports, isLoading: reportsLoading } = useQuery<User[]>({
    queryKey: ["/api/team/members"],
  });

  const { data: pendingExpensesData, isLoading: expensesLoading } = useQuery<{ count: number }>({
    queryKey: ["/api/expenses/pending-count"],
  });

  const { data: myOooRequests, isLoading: myOooLoading } = useQuery<OOORequest[]>({
    queryKey: ["/api/ooo-requests", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/ooo-requests?userId=${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch OOO requests");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: myTimesheets, isLoading: myTimesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?userId=${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch timesheets");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: myInvoices, isLoading: myInvoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?userId=${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: allLeaveRequests } = useQuery<OOORequestWithUser[]>({
    queryKey: ["/api/leave-requests"],
  });

  const { data: evaluationsDueData, isLoading: evaluationsLoading } = useQuery<{ count: number }>({
    queryKey: ["/api/evaluations/pending-count"],
  });
  const evaluationsDueCount = evaluationsDueData?.count ?? 0;

  const pendingTimesheets = teamTimesheets?.filter((t) => t.status === "submitted");
  const pendingInvoices = teamInvoices?.filter((i) => i.status === "pending_review");
  const pendingOoo = myOooRequests?.filter((r) => r.status === "pending") || [];
  const currentMonthTimesheet = myTimesheets?.find(
    (t) => t.month === new Date().getMonth() + 1 && t.year === new Date().getFullYear()
  );

  const today = startOfDay(new Date());
  const teamOooToday = (allLeaveRequests || []).filter((r) => {
    if (r.status !== "approved") return false;
    try {
      return isWithinInterval(today, {
        start: startOfDay(parseISO(r.startDate)),
        end: startOfDay(parseISO(r.endDate)),
      });
    } catch {
      return false;
    }
  });

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-testid="tour-target-supervisor-welcome">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your personal work and team management overview
          </p>
        </div>
      </div>

      {/* MY WORK SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">My Work</h2>
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 rounded-md bg-background">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">My OOO Requests</p>
                    <p className="text-xs text-muted-foreground">
                      {myOooLoading ? "..." : `${pendingOoo.length} pending`}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/ooo-requests" data-testid="link-my-ooo">View</Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-md bg-background">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">My Timesheets</p>
                    <p className="text-xs text-muted-foreground">
                      {myTimesheetsLoading ? "..." : currentMonthTimesheet ? 
                        `${format(new Date(), "MMMM")}: ${currentMonthTimesheet.status}` : 
                        `${format(new Date(), "MMMM")}: Not started`}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/timesheets-overview" data-testid="link-my-timesheets">View</Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-md bg-background">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">My Invoices</p>
                    <p className="text-xs text-muted-foreground">
                      {myInvoicesLoading ? "..." : `${myInvoices?.length || 0} uploaded`}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/invoices" data-testid="link-my-invoices">View</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* TEAM APPROVALS SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-4" data-testid="tour-target-team-approvals">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Team Approvals</h2>
          <span className="text-sm text-muted-foreground ml-2">Items requiring your review</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leave Requests
              </CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500" data-testid="text-pending-leaves">
                  {pendingRequests?.length || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Timesheets to Review
              </CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {timesheetsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500" data-testid="text-pending-timesheets">
                  {pendingTimesheets?.length || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Invoices to Review
              </CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {teamInvoicesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500" data-testid="text-pending-invoices">
                  {pendingInvoices?.length || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Link href="/expenses" data-testid="card-pending-expenses">
            <Card className="cursor-pointer hover-elevate active-elevate-2">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Expenses to Review
                </CardTitle>
                <Receipt className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-500" data-testid="text-pending-expenses">
                    {pendingExpensesData?.count || 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Direct Reports
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold" data-testid="text-direct-reports">
                  {directReports?.length || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Evaluations Due
              </CardTitle>
              <Star className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {evaluationsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500" data-testid="text-evaluations-due">
                  {evaluationsDueCount}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OOO Today Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Out of Office Today</CardTitle>
                <CardDescription>{format(today, "MMMM d, yyyy")}</CardDescription>
              </div>
              <Palmtree className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {teamOooToday.length > 0 ? (
                <div className="space-y-2">
                  {teamOooToday.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                      data-testid={`ooo-today-${req.id}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {req.userName?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{req.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          Back {format(parseISO(req.endDate), "MMM d")}
                          {req.oooType === "half_day" && (
                            <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1">Half Day</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Everyone is in today</p>
                </div>
              )}
            </CardContent>
          </Card>

        <Card data-testid="tour-target-pending-leaves-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Pending Leave Requests</CardTitle>
              <CardDescription>Requires your approval</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/leave-requests" data-testid="link-all-leave-requests">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : pendingRequests && pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {pendingRequests.slice(0, 3).map((request) => {
                  const durationDays = request.oooType === "half_day" ? 0.5 : 
                    differenceInDays(new Date(request.endDate), new Date(request.startDate)) + 1;
                  return (
                    <div
                      key={request.id}
                      className="p-4 rounded-md bg-muted/50 space-y-3"
                      data-testid={`leave-request-${request.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {request.userName?.split(" ").map((n) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{request.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(request.startDate), "MMM d")} -{" "}
                              {format(new Date(request.endDate), "MMM d, yyyy")}
                              <span className="ml-2 text-foreground">({durationDays} {durationDays === 1 ? "day" : "days"})</span>
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>
                      {request.reason && (
                        <p className="text-xs text-muted-foreground line-clamp-2 pl-12">
                          {request.reason}
                        </p>
                      )}
                      <div className="flex gap-2 pl-12" data-testid="tour-target-approval-actions">
                        <Button
                          size="sm"
                          className="flex-1"
                          data-testid={`button-approve-${request.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          data-testid={`button-reject-${request.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending leave requests</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="tour-target-pending-timesheets-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Timesheets to Review</CardTitle>
              <CardDescription>Submitted by your team</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/team-timesheets" data-testid="link-all-timesheets">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {timesheetsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : pendingTimesheets && pendingTimesheets.length > 0 ? (
              <div className="space-y-3">
                {pendingTimesheets.slice(0, 4).map((timesheet) => (
                  <div
                    key={timesheet.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`timesheet-${timesheet.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {timesheet.userName?.split(" ").map((n) => n[0]).join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{timesheet.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(timesheet.year, timesheet.month - 1), "MMMM yyyy")} - {timesheet.totalHours} hrs
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" data-testid={`button-review-${timesheet.id}`}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No timesheets pending review</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Your Team</CardTitle>
              <CardDescription>Direct reports under your supervision</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/my-team" data-testid="link-my-team">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : directReports && directReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {directReports.slice(0, 6).map((member) => {
                  const isOooToday = teamOooToday.some((r) => r.userId === member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-4 rounded-md bg-muted/50"
                      data-testid={`team-member-${member.id}`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.firstName?.[0]}
                            {member.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {isOooToday && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-background" title="OOO today" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {isOooToday ? (
                            <span className="text-amber-600 dark:text-amber-400">Out of office</span>
                          ) : (
                            member.email
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No direct reports assigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </section>

      {/* Supervisor Onboarding Tour */}
      {shouldShowTour && showTour && (
        <OnboardingTour
          tourId="supervisor"
          steps={supervisorApprovalsTourConfig.steps}
          onComplete={() => {
            completeTour();
            setShowTour(false);
          }}
          onSkip={() => {
            completeTour();
            setShowTour(false);
          }}
        />
      )}
    </div>
  );
}
