import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, addMonths } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { Calendar, ChevronRight, Clock, CheckCircle, AlertCircle, FileText } from "lucide-react";
import type { Timesheet } from "@shared/schema";
import { OnboardingTour, timesheetsTourConfig } from "@/components/onboarding-tour";

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
        headers: { Authorization: `Bearer ${localStorage.getItem("mentalyc_session_token")}` },
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

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "submitted":
        return <Clock className="w-5 h-5 text-amber-500" />;
      case "rejected":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "approved":
        return "border-emerald-500/30 bg-emerald-500/5";
      case "submitted":
        return "border-amber-500/30 bg-amber-500/5";
      case "rejected":
        return "border-red-500/30 bg-red-500/5";
      default:
        return "border-border";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Timesheets Overview</h1>
          <p className="text-muted-foreground mt-1">
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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="tour-target-timesheet-submit">
          {monthsToShow.map(({ month, year, label }, index) => {
            const timesheet = getTimesheetForMonth(month, year);
            const status = timesheet?.status || "not_started";
            const totalHours = timesheet?.totalHours || 0;

            return (
              <Link
                key={`${month}-${year}`}
                href={`/timesheets?month=${month}&year=${year}`}
              >
                <Card
                  className={`cursor-pointer hover-elevate transition-all ${getStatusColor(timesheet?.status)}`}
                  data-testid={`card-month-${month}-${year}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(timesheet?.status)}
                        <div>
                          <p className="font-semibold">{label}</p>
                          <p className="text-sm text-muted-foreground">
                            {totalHours > 0 ? `${totalHours} hours logged` : "No hours logged"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="mt-4 flex items-center justify-between" data-testid={index === 0 ? "tour-target-timesheet-status" : undefined}>
                      <div className="flex items-center gap-2">
                        {timesheet ? (
                          <StatusBadge status={timesheet.status} />
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Not Started
                          </Badge>
                        )}
                      </div>
                      {timesheet?.submittedAt && (
                        <span className="text-xs text-muted-foreground">
                          Submitted {format(new Date(timesheet.submittedAt), "MMM d")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
