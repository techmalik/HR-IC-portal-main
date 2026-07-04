import { useState, useMemo, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Clock,
  FileText,
  Calendar,
  Star,
  ChevronLeft,
  ChevronRight,
  Unlock,
  AlertCircle,
  Loader2,
  Download,
  ExternalLink,
} from "lucide-react";
import type { User, Timesheet, Invoice, OOORequest, Evaluation, DailyEntry } from "@shared/schema";
import { formatMoney } from "@/lib/currency";
import { openInvoiceFile, downloadInvoiceFile } from "@/lib/invoice-file";
import { ContractsSection, type Contract } from "@/components/contracts-section";
import { FileSignature, AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";

const VALID_TABS = ["timesheets", "evaluations", "invoices", "time-offs", "contracts"];

export default function ICDetailPage() {
  const [, params] = useRoute("/team/:userId");
  const userId = params?.userId;
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  
  const [activeTab, setActiveTab] = useState("timesheets");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockNote, setUnlockNote] = useState("");
  const [timesheetToUnlock, setTimesheetToUnlock] = useState<Timesheet | null>(null);
  const [viewDayDialogOpen, setViewDayDialogOpen] = useState(false);
  const [selectedDayForView, setSelectedDayForView] = useState<{ date: string; hours: number; activities: string[] } | null>(null);

  // Sync tab with URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [location]);

  // Fetch IC user details
  const { data: icUser, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch IC timesheets
  const { data: timesheets, isLoading: timesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?userId=${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch timesheets");
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch IC invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?userId=${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch IC OOO requests
  const { data: oooRequests, isLoading: oooLoading } = useQuery<OOORequest[]>({
    queryKey: ["/api/ooo-requests", { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/ooo-requests?userId=${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch OOO requests");
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch IC contracts (used for header-level renewal warning)
  const { data: icContracts } = useQuery<Contract[]>({
    queryKey: ["/api/contracts", { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/contracts?userId=${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch contracts");
      return res.json();
    },
    enabled: !!userId,
  });

  const expiringContracts = useMemo(() => {
    if (!icContracts) return [] as Contract[];
    const now = new Date();
    return icContracts.filter((c) => {
      const days = differenceInDays(new Date(c.endDate), now);
      return days >= 0 && days <= (c.noticePeriodDays || 30);
    });
  }, [icContracts]);

  // Fetch IC evaluations
  const { data: evaluations, isLoading: evaluationsLoading } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations", { targetUserId: userId }],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations?targetUserId=${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      return res.json();
    },
    enabled: !!userId,
  });

  // Unlock timesheet mutation
  const unlockMutation = useMutation({
    mutationFn: async ({ timesheetId, note }: { timesheetId: string; note: string }) => {
      return apiRequest("POST", `/api/timesheets/${timesheetId}/unlock`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Timesheet unlocked",
        description: "The timesheet has been unlocked for revision. The IC has been notified.",
      });
      setUnlockDialogOpen(false);
      setUnlockNote("");
      setTimesheetToUnlock(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unlock timesheet.",
        variant: "destructive",
      });
    },
  });

  // Get timesheet for selected month
  const selectedTimesheet = useMemo(() => {
    if (!timesheets) return null;
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    return timesheets.find(ts => ts.month === month && ts.year === year) || null;
  }, [timesheets, selectedDate]);

  // Fetch daily entries for the selected timesheet
  const { data: dailyEntries } = useQuery<DailyEntry[]>({
    queryKey: ["/api/timesheets", selectedTimesheet?.id, "entries"],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets/${selectedTimesheet?.id}/entries`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch daily entries");
      return res.json();
    },
    enabled: !!selectedTimesheet?.id,
  });

  // Calculate year-at-a-glance summary
  const yearSummary = useMemo(() => {
    if (!timesheets) return [];
    const year = selectedDate.getFullYear();
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const ts = timesheets.find(t => t.month === m && t.year === year);
      months.push({
        month: m,
        monthName: format(new Date(year, m - 1), "MMM"),
        totalHours: ts?.totalHours || 0,
        status: ts?.status || "none",
      });
    }
    return months;
  }, [timesheets, selectedDate]);

  // Convert daily entries array to a map by date
  const monthEntries = useMemo(() => {
    if (!dailyEntries) return {} as Record<string, DailyEntry[]>;
    const entriesByDate: Record<string, DailyEntry[]> = {};
    for (const entry of dailyEntries) {
      const dateKey = entry.date;
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = [];
      }
      entriesByDate[dateKey].push(entry);
    }
    return entriesByDate;
  }, [dailyEntries]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    const daysInCurrentMonth = getDaysInMonth(selectedDate);
    const firstDayOfMonth = getDay(startOfMonth(selectedDate));
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean; hours: number; activities: string[] }> = [];

    // Add days from previous month
    const prevMonth = subMonths(selectedDate, 1);
    const daysInPrevMonth = getDaysInMonth(prevMonth);
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        date: format(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day), "yyyy-MM-dd"),
        day,
        isCurrentMonth: false,
        hours: 0,
        activities: [],
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");
      const dayEntries = monthEntries[dateStr] || [];
      const totalHours = dayEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
      const activities = dayEntries.map(e => e.activityLog).filter(Boolean) as string[];
      days.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        hours: totalHours,
        activities,
      });
    }

    // Fill remaining cells
    const remainingCells = 42 - days.length;
    const nextMonth = addMonths(selectedDate, 1);
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        date: format(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day), "yyyy-MM-dd"),
        day,
        isCurrentMonth: false,
        hours: 0,
        activities: [],
      });
    }

    return days;
  }, [selectedDate, monthEntries]);

  const handleUnlockClick = (timesheet: Timesheet) => {
    setTimesheetToUnlock(timesheet);
    setUnlockDialogOpen(true);
  };

  const handleConfirmUnlock = () => {
    if (!timesheetToUnlock || !unlockNote.trim()) return;
    unlockMutation.mutate({ timesheetId: timesheetToUnlock.id, note: unlockNote });
  };

  const handleDayClick = (day: { date: string; hours: number; activities: string[] }) => {
    if (day.hours > 0 || day.activities.length > 0) {
      setSelectedDayForView(day);
      setViewDayDialogOpen(true);
    }
  };

  if (userLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!icUser) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">User not found</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/my-team">Back to Team</Link>
          </Button>
        </div>
      </div>
    );
  }

  const yearTotalHours = yearSummary.reduce((sum, m) => sum + m.totalHours, 0);

  return (
    <div className="p-6 flex flex-col gap-[18px]">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/my-team" data-testid="button-back-to-team">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3.5">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-[#111827] text-white text-[13px] font-bold">
              {icUser.firstName?.[0]}
              {icUser.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-normal text-neutral-900 dark:text-neutral-50 font-serif" data-testid="text-ic-name">
              {icUser.firstName} {icUser.lastName}
            </h1>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              {icUser.jobTitle || icUser.email}
            </p>
          </div>
        </div>
      </div>

      {expiringContracts.length > 0 && (
        <div
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl border-[1.5px] border-[#FDE68A] bg-[#FFFBEB] dark:bg-[#D97706]/10 dark:border-[#D97706]/30 text-[#92400E] dark:text-[#FBBF24]"
          data-testid="banner-ic-contract-expiring"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 text-[12.5px]">
            <p className="font-semibold">
              {expiringContracts.length} contract{expiringContracts.length === 1 ? "" : "s"} approaching renewal
            </p>
            <ul className="mt-1 text-[11.5px] space-y-0.5">
              {expiringContracts.map((c) => {
                const days = differenceInDays(new Date(c.endDate), new Date());
                return (
                  <li key={c.id}>
                    <span className="font-medium">{c.title}</span>, expires in {days} day{days === 1 ? "" : "s"}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl px-4 py-3.5 border-[1.5px] bg-white dark:bg-card border-neutral-200 dark:border-white/10">
          <div className="text-[9.5px] font-semibold tracking-[0.1em] uppercase mb-2 text-neutral-400">Hours this year</div>
          <div className="text-2xl font-bold mb-0.5 text-neutral-900 dark:text-neutral-50">{yearTotalHours}</div>
          <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400">{selectedDate.getFullYear()}</div>
        </div>
        <div className="rounded-xl px-4 py-3.5 border-[1.5px] bg-white dark:bg-card border-neutral-200 dark:border-white/10">
          <div className="text-[9.5px] font-semibold tracking-[0.1em] uppercase mb-2 text-neutral-400">Timesheets</div>
          <div className="text-2xl font-bold mb-0.5 text-neutral-900 dark:text-neutral-50">{timesheetsLoading ? "..." : timesheets?.length ?? 0}</div>
          <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400">on record</div>
        </div>
        <div className="rounded-xl px-4 py-3.5 border-[1.5px] bg-white dark:bg-card border-neutral-200 dark:border-white/10">
          <div className="text-[9.5px] font-semibold tracking-[0.1em] uppercase mb-2 text-neutral-400">Invoices</div>
          <div className="text-2xl font-bold mb-0.5 text-neutral-900 dark:text-neutral-50">{invoicesLoading ? "..." : invoices?.length ?? 0}</div>
          <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400">submitted</div>
        </div>
        <div className="rounded-xl px-4 py-3.5 border-[1.5px] bg-white dark:bg-card border-neutral-200 dark:border-white/10">
          <div className="text-[9.5px] font-semibold tracking-[0.1em] uppercase mb-2 text-neutral-400">Evaluations</div>
          <div className="text-2xl font-bold mb-0.5 text-neutral-900 dark:text-neutral-50">{evaluationsLoading ? "..." : evaluations?.length ?? 0}</div>
          <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400">on record</div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="timesheets" data-testid="tab-timesheets">
            <Clock className="w-4 h-4 mr-2" />
            Timesheets
          </TabsTrigger>
          <TabsTrigger value="evaluations" data-testid="tab-evaluations">
            <Star className="w-4 h-4 mr-2" />
            Evaluations
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="time-offs" data-testid="tab-time-offs">
            <Calendar className="w-4 h-4 mr-2" />
            Time-offs
          </TabsTrigger>
          <TabsTrigger value="contracts" data-testid="tab-contracts">
            <FileSignature className="w-4 h-4 mr-2" />
            Contracts
          </TabsTrigger>
        </TabsList>

        {/* TIMESHEETS TAB */}
        <TabsContent value="timesheets" className="mt-4 flex flex-col gap-4">
          {/* Year at a Glance */}
          <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
            <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">{selectedDate.getFullYear()} overview</div>
                <div className="text-[11.5px] text-neutral-400">Total hours per month</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(subMonths(selectedDate, 12))}
                  data-testid="button-prev-year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-[12.5px] font-medium w-14 text-center text-neutral-700 dark:text-neutral-300">
                  {selectedDate.getFullYear()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(addMonths(selectedDate, 12))}
                  data-testid="button-next-year"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-[18px]">
              <div className="grid grid-cols-6 lg:grid-cols-12 gap-2">
                {yearSummary.map((m) => {
                  const isSelected = selectedDate.getMonth() + 1 === m.month;
                  return (
                    <button
                      key={m.month}
                      type="button"
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), m.month - 1))}
                      className={`flex flex-col items-center rounded-lg py-2 px-1 border-[1.5px] transition-colors ${
                        isSelected
                          ? "bg-[#059669] border-[#059669] text-white"
                          : "bg-white dark:bg-transparent border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover-elevate"
                      }`}
                      data-testid={`button-month-${m.month}`}
                    >
                      <span className="text-[10.5px]">{m.monthName}</span>
                      <span className="text-[15px] font-bold">{m.totalHours}</span>
                      <span className={`text-[9px] ${isSelected ? "text-white/80" : "text-neutral-400"}`}>hrs</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Monthly Timesheet Details */}
          <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
            <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                    {format(selectedDate, "MMMM yyyy")} timesheet
                  </div>
                  {selectedTimesheet ? (
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={selectedTimesheet.status} />
                      <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                        {selectedTimesheet.totalHours} total hours
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11.5px] text-neutral-400 mt-0.5">No timesheet for this month</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {selectedTimesheet?.status === "approved" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2.5"
                  onClick={() => handleUnlockClick(selectedTimesheet)}
                  data-testid="button-unlock-timesheet"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock for revision
                </Button>
              )}
            </div>
            <div className="p-[18px] overflow-hidden">
              {timesheetsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-4 w-full overflow-hidden">
                  {/* Calendar Grid */}
                  <div className="flex justify-end mb-2">
                    <span className="text-[10.5px] text-neutral-400 bg-[#F9FAFB] dark:bg-white/5 px-2 py-0.5 rounded">View only</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-400 mb-2 w-full">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="py-1 min-w-0">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 w-full">
                    {calendarDays.map((day, idx) => {
                      const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                      const hasContent = day.hours > 0 || day.activities.length > 0;
                      const isToday = day.isCurrentMonth && day.date === format(new Date(), "yyyy-MM-dd");
                      const cellClass = !day.isCurrentMonth
                        ? "bg-[#F9FAFB] dark:bg-white/[0.02] border-transparent opacity-40"
                        : isToday
                        ? "bg-[#059669] border-[#059669]"
                        : hasContent
                        ? "bg-[#F0FDF4] dark:bg-[#059669]/10 border-[#D1FAE5] dark:border-[#059669]/30"
                        : isWeekend
                        ? "bg-[#F9FAFB] dark:bg-white/[0.02] border-transparent"
                        : "bg-white dark:bg-transparent border-dashed border-neutral-200 dark:border-white/10";
                      return (
                        <div
                          key={day.date}
                          className={`min-h-[60px] min-w-0 overflow-hidden rounded-md border ${cellClass}`}
                        >
                          {hasContent && day.isCurrentMonth ? (
                            <Button
                              variant="ghost"
                              onClick={() => handleDayClick(day)}
                              className="w-full h-full flex flex-col items-start justify-start text-left p-1 min-w-0 overflow-hidden hover:bg-transparent"
                              data-testid={`day-${day.date}`}
                            >
                              <div className={`font-medium text-[11px] ${isToday ? "text-white" : "text-[#065F46] dark:text-[#34D399]"}`}>{day.day}</div>
                              {day.hours > 0 && (
                                <div className={`mt-1 text-[10px] font-semibold ${isToday ? "text-white" : "text-[#34D399]"}`}>
                                  {day.hours}h
                                </div>
                              )}
                              {day.activities.length > 0 && (
                                <div className={`mt-1 text-[9.5px] truncate max-w-full overflow-hidden ${isToday ? "text-white/80" : "text-neutral-400"}`}>
                                  {day.activities[0]}
                                </div>
                              )}
                            </Button>
                          ) : (
                            <div className="p-1 text-[11px] min-w-0" data-testid={`day-${day.date}`}>
                              <div className={`font-medium ${isToday ? "text-white" : day.isCurrentMonth ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-300 dark:text-neutral-600"}`}>
                                {day.day}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Daily Breakdown Table */}
                  {selectedTimesheet && Object.keys(monthEntries).length > 0 && (
                    <div className="mt-6">
                      <Separator className="mb-4" />
                      <h4 className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50 mb-3">Daily activity breakdown</h4>
                      <ScrollArea className="h-64">
                        <div className="space-y-1.5">
                          {Object.entries(monthEntries)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([date, entries]) => {
                              const dayTotal = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
                              if (dayTotal === 0) return null;
                              return (
                                <div
                                  key={date}
                                  className="flex items-start gap-4 px-3 py-2.5 rounded-md bg-[#F9FAFB] dark:bg-white/[0.02]"
                                  data-testid={`entry-${date}`}
                                >
                                  <div className="w-24 shrink-0 text-[12px] font-medium text-neutral-900 dark:text-neutral-50">
                                    {format(new Date(date), "MMM d, EEE")}
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    {entries.map((entry, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-[12px]">
                                        <Badge variant="outline" className="text-[10.5px] shrink-0">
                                          {entry.hours}h
                                        </Badge>
                                        <span className="text-neutral-500 dark:text-neutral-400 truncate">
                                          {entry.activityLog || "No activity recorded"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="w-20 text-right text-[12px] font-medium text-neutral-900 dark:text-neutral-50 shrink-0">
                                    {dayTotal}h total
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* EVALUATIONS TAB */}
        <TabsContent value="evaluations" className="mt-4">
          <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
            <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
              <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Performance evaluations</div>
              <div className="text-[11.5px] text-neutral-400">{evaluations?.length || 0} evaluations on record</div>
            </div>
            {evaluationsLoading ? (
              <div className="p-[18px] space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : evaluations && evaluations.length > 0 ? (
              <div>
                {evaluations.map((evaluation, i) => (
                  <div
                    key={evaluation.id}
                    className={`px-[18px] py-3.5 border-b border-neutral-50 dark:border-white/5 last:border-b-0 ${i % 2 ? "bg-neutral-50/50 dark:bg-white/[0.02]" : ""}`}
                    data-testid={`evaluation-${evaluation.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-[#D97706]" />
                        <span className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">
                          {format(new Date(evaluation.periodStart), "MMMM yyyy")}
                        </span>
                      </div>
                      <StatusBadge status={evaluation.status} />
                    </div>
                    {evaluation.managerSummary && (
                      <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-1.5 pl-6">
                        {evaluation.managerSummary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-[18px] py-14 text-center">
                <Star className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No evaluations on record</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="mt-4">
          <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
            <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
              <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Submitted invoices</div>
              <div className="text-[11.5px] text-neutral-400">{invoices?.length || 0} invoices on record</div>
            </div>
            {invoicesLoading ? (
              <div className="p-[18px] space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div>
                {invoices.map((invoice, i) => (
                  <div
                    key={invoice.id}
                    className={`flex items-center justify-between gap-3 px-[18px] py-3 border-b border-neutral-50 dark:border-white/5 last:border-b-0 ${i % 2 ? "bg-neutral-50/50 dark:bg-white/[0.02]" : ""}`}
                    data-testid={`invoice-${invoice.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50 truncate">{invoice.fileName}</p>
                        <p className="text-[11.5px] text-neutral-400">
                          {format(new Date(invoice.year, invoice.month - 1), "MMMM yyyy")}
                          {invoice.amount && `, ${formatMoney(invoice.amount, invoice.currency)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={invoice.status || "pending_review"} />
                      {invoice.fileUrl && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View invoice"
                            onClick={() => openInvoiceFile(invoice.fileUrl, invoice.fileName)}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download invoice"
                            onClick={() => downloadInvoiceFile(invoice.fileUrl, invoice.fileName)}
                            data-testid={`button-download-invoice-${invoice.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-[18px] py-14 text-center">
                <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No invoices on record</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TIME-OFFS TAB */}
        <TabsContent value="time-offs" className="mt-4">
          <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
            <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
              <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Time-off requests</div>
              <div className="text-[11.5px] text-neutral-400">{oooRequests?.length || 0} requests on record</div>
            </div>
            {oooLoading ? (
              <div className="p-[18px] space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : oooRequests && oooRequests.length > 0 ? (
              <div>
                {oooRequests.map((request, i) => (
                  <div
                    key={request.id}
                    className={`flex items-center justify-between gap-3 px-[18px] py-3 border-b border-neutral-50 dark:border-white/5 last:border-b-0 ${i % 2 ? "bg-neutral-50/50 dark:bg-white/[0.02]" : ""}`}
                    data-testid={`ooo-${request.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">
                          {format(new Date(request.startDate), "MMM d")}, {format(new Date(request.endDate), "MMM d, yyyy")}
                        </p>
                        <p className="text-[11.5px] text-neutral-400 capitalize">
                          {request.oooType.replace("_", " ")}
                          {request.reason && `, ${request.reason}`}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-[18px] py-14 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No time-off requests on record</p>
              </div>
            )}
          </div>
        </TabsContent>
        {/* CONTRACTS TAB */}
        <TabsContent value="contracts" className="mt-4">
          <ContractsSection userId={icUser.id} canManage={currentUser?.role === "admin" || currentUser?.role === "owner"} />
        </TabsContent>
      </Tabs>

      {/* Unlock Timesheet Dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Timesheet for Revision</DialogTitle>
            <DialogDescription>
              This will allow {icUser.firstName} to edit their timesheet. They will be notified
              of this change and will need to resubmit both the timesheet and associated invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-note">Reason for unlocking (required)</Label>
              <Textarea
                id="unlock-note"
                placeholder="Please explain why the timesheet needs revision..."
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                rows={3}
                data-testid="input-unlock-note"
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-[#D97706]/10 dark:bg-[#D97706]/15 rounded text-[#D97706] dark:text-[#FBBF24] text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                The associated invoice will also require resubmission once the timesheet is revised.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlockDialogOpen(false)}
              data-testid="button-cancel-unlock"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUnlock}
              disabled={!unlockNote.trim() || unlockMutation.isPending}
              data-testid="button-confirm-unlock"
            >
              {unlockMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unlocking...
                </>
              ) : (
                "Unlock Timesheet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Day Activity Dialog */}
      <Dialog open={viewDayDialogOpen} onOpenChange={(open) => {
        setViewDayDialogOpen(open);
        if (!open) setSelectedDayForView(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDayForView && format(new Date(selectedDayForView.date), "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              Activity details for this day
            </DialogDescription>
          </DialogHeader>
          {selectedDayForView && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{selectedDayForView.hours} hours logged</span>
              </div>
              {selectedDayForView.activities.length > 0 && (
                <div className="space-y-2">
                  <Label>Activities</Label>
                  <div className="space-y-2">
                    {selectedDayForView.activities.map((activity, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap"
                        data-testid={`activity-${idx}`}
                      >
                        {activity}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDayDialogOpen(false)}
              data-testid="button-close-day-dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
