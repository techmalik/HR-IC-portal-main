import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { Plus, ArrowRight } from "lucide-react";
import type { OOORequest, Timesheet, Invoice, OvertimeRequest } from "@shared/schema";
import { formatMoney } from "@/lib/currency";
import { format, getDaysInMonth, getDay } from "date-fns";
import { cn } from "@/lib/utils";

// Count Mon-Fri days in [start, end] inclusive.
function countWeekdaysBetween(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d <= last) {
    const dow = getDay(d);
    if (dow !== 0 && dow !== 6) count += 1;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function StatCard({
  label,
  value,
  hint,
  hintClassName,
  loading,
  testId,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintClassName?: string;
  loading?: boolean;
  testId?: string;
}) {
  return (
    <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
      <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="text-[28px] font-bold text-foreground leading-none" data-testid={testId}>
          {value}
        </div>
      )}
      {hint && !loading && (
        <div className={cn("text-xs mt-1.5 font-medium", hintClassName || "text-muted-foreground")}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function DashboardIC() {
  const { user } = useAuth();

  const { data: oooRequests, isLoading: oooLoading } = useQuery<OOORequest[]>({
    queryKey: ["/api/ooo-requests", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/ooo-requests?userId=${user?.id}`, {
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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

  // Use the IC's configured monthly cap when set; otherwise estimate from the
  // number of weekdays in the current month (8 hours/weekday).
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), getDaysInMonth(now));
  const totalWeekdaysInMonth = countWeekdaysBetween(monthStart, monthEnd);
  const totalExpectedHours = user?.monthlyCap ?? totalWeekdaysInMonth * 8;
  const loggedHours = currentTimesheet?.totalHours || 0;
  const progressPercent = totalExpectedHours > 0
    ? Math.min((loggedHours / totalExpectedHours) * 100, 100)
    : 0;

  // Pace expectations by elapsed weekdays (today counts as elapsed).
  const weekdaysElapsed = countWeekdaysBetween(monthStart, now);
  const elapsedRatio = totalWeekdaysInMonth > 0 ? weekdaysElapsed / totalWeekdaysInMonth : 0;
  const expectedByNow = totalExpectedHours * elapsedRatio;
  const behindBy = expectedByNow - loggedHours;

  const progressColor =
    behindBy <= 0
      ? "bg-[#059669]"
      : behindBy <= 16
      ? "bg-[#D97706]"
      : "bg-[#DC2626]";

  const upcomingOOO = oooRequests
    ?.filter((r) => new Date(r.startDate) >= new Date())
    .slice(0, 3);

  const recentInvoices = invoices?.slice(0, 3);

  const pendingOvertimeRequests = overtimeRequests?.filter((r) => r.status === "pending") || [];
  const pendingInvoicesCount = invoices?.filter((i) => i.status === "pending_review").length || 0;

  // Purely presentational feed built from data already fetched above (no
  // additional queries) - recent OOO requests and invoices, newest first.
  const activityItems = [
    ...(upcomingOOO || []).map((r) => ({
      id: `ooo-${r.id}`,
      label: `OOO ${format(new Date(r.startDate), "MMM d")} to ${format(new Date(r.endDate), "MMM d")}`,
      date: format(new Date(r.startDate), "MMM d, yyyy"),
      status: r.status,
    })),
    ...(recentInvoices || []).map((inv) => ({
      id: `inv-${inv.id}`,
      label: `Invoice ${inv.invoiceNumber || inv.fileName}`,
      date: inv.uploadedAt
        ? `${format(new Date(inv.uploadedAt), "MMM d")}${inv.amount ? `, ${formatMoney(inv.amount, inv.currency)}` : ""}`
        : "",
      status: inv.status === "pending_review" ? "pending" : inv.status,
    })),
  ].slice(0, 5);

  const isLoadingActivity = oooLoading || invoicesLoading;

  return (
    <div className="p-6 space-y-6">
      <div data-testid="tour-target-welcome">
        <h1 className="font-serif text-[22px] font-normal text-foreground mb-1">
          Good morning, {user?.firstName}.
        </h1>
        <p className="text-[13px] text-muted-foreground">
          {currentMonth} &middot; Independent Contractor
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <StatCard
          label="Hours logged"
          value={currentTimesheet?.totalHours ?? 0}
          hint={
            behindBy <= 0
              ? "On pace for the month"
              : `${Math.round(behindBy)}h behind pace`
          }
          hintClassName={behindBy <= 0 ? "text-[#059669]" : "text-[#D97706]"}
          loading={timesheetsLoading}
          testId="text-current-hours"
        />
        <StatCard
          label="Invoices"
          value={invoices?.length ?? 0}
          hint={pendingInvoicesCount > 0 ? `${pendingInvoicesCount} pending review` : "All reviewed"}
          hintClassName={pendingInvoicesCount > 0 ? "text-[#D97706]" : "text-muted-foreground"}
          loading={invoicesLoading}
          testId="text-invoices-count"
        />
        <StatCard
          label="Upcoming OOO"
          value={upcomingOOO?.length ?? 0}
          hint="days scheduled"
          loading={oooLoading}
          testId="text-pending-ooo-count"
        />
        <StatCard
          label="Pending overtime"
          value={pendingOvertimeRequests.length}
          hint={pendingOvertimeRequests.length > 0 ? "awaiting approval" : "nothing pending"}
          hintClassName={pendingOvertimeRequests.length > 0 ? "text-[#D97706]" : "text-muted-foreground"}
          loading={overtimeLoading}
          testId="text-pending-overtime-count"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-card border-[1.5px] border-card-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-[18px] gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-foreground">{currentMonth} Timesheet</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {timesheetsLoading
                  ? "Loading..."
                  : `${loggedHours}h logged, ${Math.max(totalExpectedHours - loggedHours, 0)}h remaining`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentTimesheet && <StatusBadge status={currentTimesheet.status} />}
              <Button asChild size="sm" data-testid="button-edit-timesheet">
                <Link href="/timesheets/current">{currentTimesheet ? "Edit" : "Start"}</Link>
              </Button>
            </div>
          </div>

          {timesheetsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all rounded-full", progressColor)}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {loggedHours} of {totalExpectedHours} expected hours this month
                {behindBy > 0 && (
                  <span className="ml-1 font-medium text-[#D97706]">
                    ({Math.round(behindBy)}h behind pace)
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-1">
                Upcoming time off
              </div>
              <div className="text-sm text-foreground">
                {oooLoading
                  ? "Loading..."
                  : upcomingOOO && upcomingOOO.length > 0
                  ? `${format(new Date(upcomingOOO[0].startDate), "MMM d")} to ${format(new Date(upcomingOOO[0].endDate), "MMM d")}`
                  : "Nothing scheduled"}
              </div>
            </div>
            <Button asChild variant="outline" size="sm" data-testid="button-new-ooo">
              <Link href="/ooo-requests/new">
                <Plus className="w-4 h-4 mr-1" />
                New request
              </Link>
            </Button>
          </div>
        </div>

        <div className="bg-card border-[1.5px] border-card-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-[18px] py-3.5 border-b border-border flex justify-between items-center">
            <span className="text-[13.5px] font-semibold text-foreground">Recent activity</span>
            <Link href="/invoices" className="text-xs text-[#059669] font-medium no-underline" data-testid="link-view-all-invoices">
              View all
            </Link>
          </div>
          {isLoadingActivity ? (
            <div className="p-[18px] space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : activityItems.length > 0 ? (
            activityItems.map((item) => (
              <div
                key={item.id}
                className="px-[18px] py-3 flex justify-between items-center border-b border-border last:border-b-0 gap-3"
                data-testid={`activity-${item.id}`}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.date}</div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))
          ) : (
            <div className="px-[18px] py-8 text-center text-sm text-muted-foreground">
              No recent activity yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
