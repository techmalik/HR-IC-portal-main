import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import type { OOORequest, Timesheet, User, Invoice } from "@shared/schema";
import { isWithinInterval, parseISO, startOfDay } from "date-fns";
import { OnboardingTour, supervisorApprovalsTourConfig, useTour } from "@/components/onboarding-tour";
import { getGreeting } from "@/lib/dates";
import { getInitialsFromName } from "@/lib/initials";

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

type ApprovalItem = {
  id: string;
  name: string;
  detail: string;
  href: string;
  kind: "leave" | "timesheet";
};

export default function DashboardSupervisor() {
  const { user } = useAuth();
  const { shouldShowTour, completeTour } = useTour("supervisor");
  const [showTour, setShowTour] = useState(true);

  const { data: pendingRequests, isLoading: requestsLoading } = useQuery<OOORequestWithUser[]>({
    queryKey: [`/api/leave-requests/pending?managerId=${user?.id}`],
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
    queryKey: [`/api/ooo-requests?userId=${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: myTimesheets, isLoading: myTimesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: [`/api/timesheets?userId=${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: myInvoices, isLoading: myInvoicesLoading } = useQuery<Invoice[]>({
    queryKey: [`/api/invoices?userId=${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: allLeaveRequests } = useQuery<OOORequestWithUser[]>({
    queryKey: ["/api/leave-requests"],
  });

  const { data: evaluationsDueData, isLoading: evaluationsLoading } = useQuery<{ count: number }>({
    queryKey: ["/api/evaluations/pending-count"],
  });
  const evaluationsDueCount = evaluationsDueData?.count ?? 0;

  const pendingTimesheets = teamTimesheets?.filter((t) => t.status === "submitted") || [];
  const pendingInvoices = teamInvoices?.filter((i) => i.status === "pending_review") || [];
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

  const activePendingRequests = (pendingRequests || []).filter((r) => r.status === "pending");

  const approvalItems: ApprovalItem[] = [
    ...activePendingRequests.map((r) => ({
      id: `leave-${r.id}`,
      name: r.userName || "Unknown",
      detail: `Leave · ${formatDateRange(r.startDate, r.endDate)}`,
      href: "/leave-requests",
      kind: "leave" as const,
    })),
    ...pendingTimesheets.map((t) => ({
      id: `timesheet-${t.id}`,
      name: t.userName || "Unknown",
      detail: `Timesheet · ${formatMonthYear(t.month, t.year)}`,
      href: "/team-timesheets",
      kind: "timesheet" as const,
    })),
  ];

  const isLoadingApprovals = requestsLoading || timesheetsLoading;
  const totalPendingReview = activePendingRequests.length + pendingTimesheets.length;

  const firstName = user?.firstName || "there";
  const greeting = getGreeting();

  return (
    <div className="p-6 flex flex-col gap-[18px]">
      <div data-testid="tour-target-supervisor-welcome">
        <h1 className="text-xl font-normal text-neutral-900 dark:text-neutral-50 font-serif mb-0.5">
          {greeting}, {firstName}.
        </h1>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          You have {totalPendingReview} item{totalPendingReview === 1 ? "" : "s"} pending your review.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3" data-testid="tour-target-team-approvals">
        <StatCard label="Team size" value={reportsLoading ? "..." : String(directReports?.length ?? 0)} hint="contractors" />
        <StatCard
          label="Pending sheets"
          value={timesheetsLoading ? "..." : String(pendingTimesheets.length)}
          hint="need approval"
          tone="warning"
        />
        <StatCard
          label="Leave requests"
          value={requestsLoading ? "..." : String(activePendingRequests.length)}
          hint="need approval"
          tone="warning"
        />
        <StatCard label="OOO today" value={String(teamOooToday.length)} hint={teamOooToday.length === 1 ? "team member" : "team members"} />
        <StatCard label="Evals due" value={evaluationsLoading ? "..." : String(evaluationsDueCount)} hint="this cycle" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pending approvals */}
        <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col" data-testid="tour-target-pending-leaves-card">
          <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center">
            <span className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Pending approvals</span>
            <span className="text-[11px] font-semibold bg-[#FFFBEB] dark:bg-[#D97706]/15 text-[#D97706] dark:text-[#FBBF24] px-2.5 py-1 rounded-full">
              {approvalItems.length} item{approvalItems.length === 1 ? "" : "s"}
            </span>
          </div>
          <div>
            {isLoadingApprovals ? (
              <div className="px-[18px] py-6 text-[12.5px] text-neutral-400">Loading...</div>
            ) : approvalItems.length > 0 ? (
              approvalItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`px-[18px] py-3 grid grid-cols-[1fr_80px_130px] items-center gap-3 border-b border-neutral-50 dark:border-white/5 last:border-b-0 ${i % 2 ? "bg-neutral-50/50 dark:bg-white/[0.02]" : ""}`}
                  data-testid={i === 0 ? "tour-target-approval-actions" : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-[#1C2230] border border-[#2A3545] text-[#8DAFC8] text-[9px] font-bold">
                        {getInitialsFromName(item.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50 truncate">{item.name}</div>
                      <div className="text-[11.5px] text-neutral-400 truncate">{item.detail}</div>
                    </div>
                  </div>
                  <StatusBadge status="pending" />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="flex-1 text-[11.5px] font-semibold text-[#059669] dark:text-[#34D399] bg-[#ECFDF5] dark:bg-[#059669]/15 border-none py-[5px] rounded-md"
                      data-testid={`button-approve-${item.id}`}
                    >
                      Approve
                    </button>
                    {item.kind === "leave" ? (
                      <button
                        type="button"
                        className="flex-1 text-[11.5px] font-medium text-[#DC2626] dark:text-[#F87171] bg-[#FEF2F2] dark:bg-[#DC2626]/15 border-none py-[5px] rounded-md"
                        data-testid={`button-decline-${item.id}`}
                      >
                        Decline
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className="flex-1 text-center text-[11.5px] font-medium text-neutral-500 dark:text-neutral-300 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 py-[5px] rounded-md"
                        data-testid={`link-view-${item.id}`}
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-[18px] py-10 text-center text-[12.5px] text-neutral-400">
                Nothing pending your review right now.
              </div>
            )}
          </div>
        </div>

        {/* Team status */}
        <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col" data-testid="tour-target-pending-timesheets-card">
          <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center">
            <span className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Team status</span>
            <span className="text-[11.5px] text-[#059669] dark:text-[#34D399] font-medium">
              {reportsLoading ? "..." : `${directReports?.length ?? 0} active`}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_90px_90px_110px] px-[18px] py-2.5 bg-[#F9FAFB] dark:bg-white/5 border-b border-neutral-200 dark:border-white/10 text-[10px] font-bold text-neutral-400 tracking-[0.08em] uppercase">
            <span>Contractor</span>
            <span>Hours</span>
            <span>Invoice</span>
            <span>Status</span>
          </div>
          {reportsLoading ? (
            <div className="px-[18px] py-6 text-[12.5px] text-neutral-400">Loading...</div>
          ) : directReports && directReports.length > 0 ? (
            directReports.map((member, i) => {
              const memberName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email;
              const memberTimesheet = teamTimesheets?.find((t) => t.userId === member.id);
              const memberInvoice = teamInvoices?.find((inv) => inv.userId === member.id);
              const isOooToday = teamOooToday.some((r) => r.userId === member.id);
              return (
                <div
                  key={member.id}
                  className={`grid grid-cols-[1fr_90px_90px_110px] px-[18px] py-3.5 items-center border-b border-neutral-50 dark:border-white/5 last:border-b-0 ${i % 2 ? "bg-neutral-50/50 dark:bg-white/[0.02]" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOooToday ? "bg-[#D97706]" : "bg-[#059669]"}`} />
                    <span className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50 truncate">{memberName}</span>
                  </div>
                  <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {memberTimesheet ? `${memberTimesheet.totalHours}h` : "N/A"}
                  </span>
                  {memberInvoice ? (
                    <StatusBadge status={memberInvoice.status === "pending_review" ? "pending" : memberInvoice.status} />
                  ) : (
                    <span className="text-[11px] text-neutral-300 dark:text-neutral-600">N/A</span>
                  )}
                  <span className={`text-[11.5px] ${isOooToday ? "text-[#D97706] dark:text-[#FBBF24]" : "text-neutral-500 dark:text-neutral-400"}`}>
                    {isOooToday ? "OOO today" : "On track"}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="px-[18px] py-10 text-center text-[12.5px] text-neutral-400">No direct reports assigned</div>
          )}
        </div>
      </div>

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

function formatMonthYear(month: number, year: number) {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateRange(startDate: string, endDate: string) {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (startDate === endDate) return startLabel;
    const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${startLabel}, ${endLabel}`;
  } catch {
    return "";
  }
}
