import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, addMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { Calendar, ChevronRight } from "lucide-react";
import type { Timesheet } from "@shared/schema";
import { OnboardingTour, timesheetsTourConfig } from "@/components/onboarding-tour";
import { cn } from "@/lib/utils";

export default function TimesheetsOverviewPage() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!user) return;
    const completedOnboarding = (user.completedOnboarding as Record<string, boolean>) || {};
    if (completedOnboarding.timesheets !== true) {
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const { data: timesheets, isLoading } = useQuery<Timesheet[]>({
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

  const getMonthsToShow = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: format(date, "MMMM yyyy"),
      });
    }
    return months;
  };

  const getTimesheetForMonth = (month: number, year: number): Timesheet | undefined => {
    return timesheets?.find(t => t.month === month && t.year === year);
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthsToShow = isLoading
    ? getMonthsToShow()
    : getMonthsToShow().filter(({ month, year }) => {
        if (month === currentMonth && year === currentYear) return true;
        return !!getTimesheetForMonth(month, year);
      });

  const currentTimesheet = getTimesheetForMonth(currentMonth, currentYear);
  const currentHours = currentTimesheet?.totalHours || 0;
  const submittedCount = (timesheets || []).filter((t) => t.status === "submitted").length;
  const approvedThisYear = (timesheets || []).filter((t) => t.status === "approved" && t.year === currentYear);
  const approvedHoursThisYear = approvedThisYear.reduce((sum, t) => sum + (t.totalHours || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-[22px] font-normal text-foreground mb-1">Timesheets</h1>
          <p className="text-[13px] text-muted-foreground">
            View your monthly timesheets and their status
          </p>
        </div>
        <Link href="/timesheets">
          <Button data-testid="tour-target-timesheet-calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Go to Current Month
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
          <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">This month</div>
          <div className="text-[26px] font-bold text-foreground leading-none">{currentHours}h</div>
          <div className="text-xs mt-1.5 font-medium text-muted-foreground">
            {currentTimesheet ? "logged so far" : "not started yet"}
          </div>
        </div>
        <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
          <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Awaiting approval</div>
          <div className="text-[26px] font-bold text-foreground leading-none">{submittedCount}</div>
          <div className="text-xs mt-1.5 font-medium text-[#D97706]">{submittedCount > 0 ? "pending review" : "all clear"}</div>
        </div>
        <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
          <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Approved this year</div>
          <div className="text-[26px] font-bold text-foreground leading-none">{approvedHoursThisYear}h</div>
          <div className="text-xs mt-1.5 font-medium text-[#059669]">{approvedThisYear.length} month{approvedThisYear.length === 1 ? "" : "s"}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <div className="bg-card border-[1.5px] border-card-border rounded-xl overflow-hidden" data-testid="tour-target-timesheet-submit">
          <div className="px-5 py-3.5 border-b border-border">
            <span className="text-[13.5px] font-semibold text-foreground">Past timesheets</span>
          </div>
          {monthsToShow.map(({ month, year, label }, index) => {
            const timesheet = getTimesheetForMonth(month, year);
            const totalHours = timesheet?.totalHours || 0;

            return (
              <Link
                key={`${month}-${year}`}
                href={`/timesheets?month=${month}&year=${year}`}
                className={cn(
                  "flex justify-between items-center px-5 py-3.5 border-b border-border last:border-b-0 hover-elevate",
                  index % 2 === 1 && "bg-[#FAFAFA]"
                )}
                data-testid={`card-month-${month}-${year}`}
              >
                <div>
                  <div className="text-[13px] font-medium text-foreground">{label}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {totalHours > 0 ? `${totalHours}h logged` : "No hours logged"}
                    {timesheet?.submittedAt && ` · submitted ${format(new Date(timesheet.submittedAt), "MMM d")}`}
                  </div>
                </div>
                <div className="flex items-center gap-3" data-testid={index === 0 ? "tour-target-timesheet-status" : undefined}>
                  {timesheet ? (
                    <StatusBadge status={timesheet.status} />
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not started
                    </Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {showTour && (
        <OnboardingTour
          tourId="timesheets"
          steps={timesheetsTourConfig.steps}
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}
    </div>
  );
}
