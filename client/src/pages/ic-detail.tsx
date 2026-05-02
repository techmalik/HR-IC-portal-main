import { useState, useMemo, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const VALID_TABS = ["timesheets", "evaluations", "invoices", "time-offs"];

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
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
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
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
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
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
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
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch OOO requests");
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch IC evaluations
  const { data: evaluations, isLoading: evaluationsLoading } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations", { targetUserId: userId }],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations?targetUserId=${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
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
        headers: { Authorization: `Bearer ${localStorage.getItem("teamflow_session_token")}` },
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/my-team" data-testid="button-back-to-team">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {icUser.firstName?.[0]}
              {icUser.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-ic-name">
              {icUser.firstName} {icUser.lastName}
            </h1>
            <p className="text-muted-foreground">
              {icUser.jobTitle || icUser.email}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
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
        </TabsList>

        {/* TIMESHEETS TAB */}
        <TabsContent value="timesheets" className="mt-6 space-y-6">
          {/* Year at a Glance */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{selectedDate.getFullYear()} Overview</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDate(subMonths(selectedDate, 12))}
                    data-testid="button-prev-year"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium w-16 text-center">
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
              <CardDescription>Total hours per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 lg:grid-cols-12 gap-2">
                {yearSummary.map((m) => (
                  <Button
                    key={m.month}
                    variant={selectedDate.getMonth() + 1 === m.month ? "default" : "outline"}
                    className="flex flex-col h-auto py-2 px-1"
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), m.month - 1))}
                    data-testid={`button-month-${m.month}`}
                  >
                    <span className="text-xs">{m.monthName}</span>
                    <span className="text-lg font-bold">{m.totalHours}</span>
                    <span className="text-[10px] opacity-70">hrs</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Timesheet Details */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {format(selectedDate, "MMMM yyyy")} Timesheet
                  </CardTitle>
                  <CardDescription>
                    {selectedTimesheet ? (
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={selectedTimesheet.status} />
                        <span className="text-sm">
                          {selectedTimesheet.totalHours} total hours
                        </span>
                      </div>
                    ) : (
                      "No timesheet for this month"
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
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
                  className="mt-2"
                  onClick={() => handleUnlockClick(selectedTimesheet)}
                  data-testid="button-unlock-timesheet"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock for Revision
                </Button>
              )}
            </CardHeader>
            <CardContent className="overflow-hidden">
              {timesheetsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-4 w-full overflow-hidden">
                  {/* Calendar Grid */}
                  <div className="flex justify-end mb-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">View Only</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2 w-full">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="py-1 min-w-0">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 w-full">
                    {calendarDays.map((day, idx) => {
                      const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                      const hasContent = day.hours > 0 || day.activities.length > 0;
                      return (
                        <div
                          key={day.date}
                          className={`min-h-[60px] min-w-0 overflow-hidden rounded border ${
                            day.isCurrentMonth
                              ? isWeekend
                                ? "bg-muted/30 border-muted"
                                : "bg-background border-border"
                              : "bg-muted/10 border-muted/30 opacity-40"
                          }`}
                        >
                          {hasContent && day.isCurrentMonth ? (
                            <Button
                              variant="ghost"
                              onClick={() => handleDayClick(day)}
                              className="w-full h-full flex flex-col items-start justify-start text-left p-1 min-w-0 overflow-hidden"
                              data-testid={`day-${day.date}`}
                            >
                              <div className="font-medium text-xs">{day.day}</div>
                              {day.hours > 0 && (
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    {day.hours}h
                                  </Badge>
                                </div>
                              )}
                              {day.activities.length > 0 && (
                                <div className="mt-1 text-[10px] text-muted-foreground truncate max-w-full overflow-hidden">
                                  {day.activities[0]}
                                </div>
                              )}
                            </Button>
                          ) : (
                            <div className="p-1 text-xs min-w-0" data-testid={`day-${day.date}`}>
                              <div className="font-medium">{day.day}</div>
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
                      <h4 className="font-medium mb-3">Daily Activity Breakdown</h4>
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {Object.entries(monthEntries)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([date, entries]) => {
                              const dayTotal = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
                              if (dayTotal === 0) return null;
                              return (
                                <div
                                  key={date}
                                  className="flex items-start gap-4 p-2 rounded bg-muted/30"
                                  data-testid={`entry-${date}`}
                                >
                                  <div className="w-24 shrink-0 font-medium text-sm">
                                    {format(new Date(date), "MMM d, EEE")}
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    {entries.map((entry, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm">
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {entry.hours}h
                                        </Badge>
                                        <span className="text-muted-foreground truncate">
                                          {entry.activityLog || "No activity recorded"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="w-16 text-right font-medium text-sm">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVALUATIONS TAB */}
        <TabsContent value="evaluations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Evaluations</CardTitle>
              <CardDescription>
                {evaluations?.length || 0} evaluations on record
              </CardDescription>
            </CardHeader>
            <CardContent>
              {evaluationsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : evaluations && evaluations.length > 0 ? (
                <div className="space-y-4">
                  {evaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="p-4 rounded-md bg-muted/50"
                      data-testid={`evaluation-${evaluation.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">
                            {format(new Date(evaluation.periodStart), "MMMM yyyy")}
                          </span>
                        </div>
                        <StatusBadge status={evaluation.status} />
                      </div>
                      {evaluation.managerSummary && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {evaluation.managerSummary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No evaluations on record</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submitted Invoices</CardTitle>
              <CardDescription>
                {invoices?.length || 0} invoices on record
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 rounded-md bg-muted/50"
                      data-testid={`invoice-${invoice.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{invoice.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(invoice.year, invoice.month - 1), "MMMM yyyy")}
                            {invoice.amount && ` - $${(invoice.amount / 100).toFixed(2)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={invoice.status || "pending_review"} />
                        {invoice.fileUrl && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              data-testid={`button-view-invoice-${invoice.id}`}
                            >
                              <a href={invoice.fileUrl} target="_blank" rel="noopener noreferrer" title="View invoice">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              data-testid={`button-download-invoice-${invoice.id}`}
                            >
                              <a href={invoice.fileUrl} download={invoice.fileName} title="Download invoice">
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No invoices on record</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIME-OFFS TAB */}
        <TabsContent value="time-offs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time-Off Requests</CardTitle>
              <CardDescription>
                {oooRequests?.length || 0} requests on record
              </CardDescription>
            </CardHeader>
            <CardContent>
              {oooLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : oooRequests && oooRequests.length > 0 ? (
                <div className="space-y-3">
                  {oooRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-md bg-muted/50"
                      data-testid={`ooo-${request.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">
                            {format(new Date(request.startDate), "MMM d")} -{" "}
                            {format(new Date(request.endDate), "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {request.oooType.replace("_", " ")}
                            {request.reason && ` - ${request.reason}`}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No time-off requests on record</p>
                </div>
              )}
            </CardContent>
          </Card>
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
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded text-yellow-600 dark:text-yellow-400 text-sm">
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
