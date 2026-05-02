import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from "date-fns";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Lock, Clock, Check, CloudOff, RefreshCw } from "lucide-react";
import type { Timesheet, DailyEntry, OvertimeRequest } from "@shared/schema";

interface DayEntry {
  date: string;
  hours: number;
  activityLog: string;
}

interface OOODate {
  date: string;
  oooType: string;
}

const MAX_HOURS_PER_DAY = 24;
const STANDARD_HOURS = 8;
const HALF_DAY_HOURS = 4;

export default function TimesheetsPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const urlMonth = searchParams.get("month");
  const urlYear = searchParams.get("year");
  
  const getInitialDate = () => {
    if (urlMonth && urlYear) {
      const monthNum = parseInt(urlMonth, 10);
      const yearNum = parseInt(urlYear, 10);
      if (!isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
        return new Date(yearNum, monthNum - 1, 1);
      }
    }
    return new Date();
  };
  
  const [currentDate, setCurrentDate] = useState(getInitialDate);
  const [selectedDay, setSelectedDay] = useState<DayEntry | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [entries, setEntries] = useState<Map<string, DayEntry>>(new Map());
  const { user } = useAuth();
  const { toast } = useToast();

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: timesheet, isLoading, isFetching, refetch: refetchTimesheet } = useQuery<Timesheet | null>({
    queryKey: ["/api/timesheets", { userId: user?.id, month, year }],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?userId=${user?.id}&month=${month}&year=${year}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch timesheet");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: dailyEntries } = useQuery<DailyEntry[]>({
    queryKey: ["/api/timesheets", timesheet?.id, "entries"],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets/${timesheet?.id}/entries`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch entries");
      return res.json();
    },
    enabled: !!timesheet?.id,
  });

  const { data: oooDates } = useQuery<OOODate[]>({
    queryKey: ["/api/ooo-requests/approved-dates", { userId: user?.id, month, year }],
    queryFn: async () => {
      const res = await fetch(`/api/ooo-requests/approved-dates?userId=${user?.id}&month=${month}&year=${year}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch OOO dates");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: overtimeRequests } = useQuery<OvertimeRequest[]>({
    queryKey: ["/api/overtime-requests", { timesheetId: timesheet?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/overtime-requests?timesheetId=${timesheet?.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch overtime requests");
      return res.json();
    },
    enabled: !!timesheet?.id,
  });

  useEffect(() => {
    if (dailyEntries) {
      const newEntries = new Map<string, DayEntry>();
      dailyEntries.forEach((entry) => {
        newEntries.set(entry.date, {
          date: entry.date,
          hours: entry.hours,
          activityLog: entry.activityLog || "",
        });
      });
      setEntries(newEntries);
    } else {
      setEntries(new Map());
    }
  }, [dailyEntries, month, year]);

  const saveMutation = useMutation({
    mutationFn: async (entriesToSave?: DayEntry[]) => {
      const entriesArray = entriesToSave || Array.from(entries.values());
      const response = await apiRequest("POST", "/api/timesheets/save", {
        userId: user?.id,
        month,
        year,
        entries: entriesArray,
      });
      const data = await response.json() as { id: string };
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-entries"] });
      return data;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save timesheet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isEditable = !timesheet || timesheet.status === "draft" || timesheet.status === "rejected";
  const isApproved = timesheet?.status === "approved";
  const isSubmitted = timesheet?.status === "submitted";

  const entriesArray = useMemo(() => Array.from(entries.values()), [entries]);

  const handleAutosave = useCallback(async (data: DayEntry[]) => {
    if (data.length === 0) return;
    await saveMutation.mutateAsync(data);
  }, [saveMutation]);

  // Convert dailyEntries to the same format as entriesArray for initial comparison
  const initialEntriesArray = useMemo(() => {
    if (!dailyEntries) return [];
    return dailyEntries.map(entry => ({
      date: entry.date,
      hours: entry.hours,
      activityLog: entry.activityLog || "",
    }));
  }, [dailyEntries]);

  const { status: autosaveStatus, triggerSave, isUnsaved } = useAutosave({
    data: entriesArray,
    onSave: handleAutosave,
    debounceMs: 1500,
    enabled: isEditable && entriesArray.length > 0,
    initialData: initialEntriesArray,
  });

  // Use refs to track latest values for unmount save
  const entriesRef = useRef(entriesArray);
  const isUnsavedRef = useRef(isUnsaved);
  const isEditableRef = useRef(isEditable);
  
  useEffect(() => {
    entriesRef.current = entriesArray;
    isUnsavedRef.current = isUnsaved;
    isEditableRef.current = isEditable;
  }, [entriesArray, isUnsaved, isEditable]);

  // Save unsaved changes when unmounting or navigating away
  useEffect(() => {
    return () => {
      // Trigger immediate save if there are unsaved changes when leaving
      if (isUnsavedRef.current && entriesRef.current.length > 0 && isEditableRef.current) {
        handleAutosave(entriesRef.current).catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createOvertimeMutation = useMutation({
    mutationFn: async (data: { date: string; requestedHours: number; timesheetId?: string }) => {
      return apiRequest("POST", "/api/overtime-requests", {
        userId: user?.id,
        timesheetId: data.timesheetId || timesheet?.id,
        date: data.date,
        requestedHours: data.requestedHours,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      toast({
        title: "Overtime request sent",
        description: "Your manager has been notified to approve the extra hours.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create overtime request.",
        variant: "destructive",
      });
    },
  });

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getDay(startOfMonth(currentDate));
  const totalHours = Array.from(entries.values()).reduce((sum, e) => sum + e.hours, 0);

  const getOOOForDate = (dateStr: string): OOODate | undefined => {
    return oooDates?.find((o) => o.date === dateStr);
  };

  const getOvertimeForDate = (dateStr: string): OvertimeRequest | undefined => {
    // Find all requests for this date and return the most recently created one
    const requests = overtimeRequests?.filter((o) => o.date === dateStr) || [];
    if (requests.length === 0) return undefined;
    // Sort by createdAt descending to get the latest request
    return requests.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
  };

  const handleDayClick = (day: number, isViewMode: boolean = false) => {
    const dateStr = format(new Date(year, month - 1, day), "yyyy-MM-dd");
    const ooo = getOOOForDate(dateStr);

    if (ooo?.oooType === "full_day") {
      toast({
        title: "Day blocked",
        description: "This day is blocked due to approved full-day leave.",
        variant: "destructive",
      });
      return;
    }

    const existing = entries.get(dateStr);
    
    // For view mode (locked timesheets), only show if there's an entry
    if (isViewMode && !existing) {
      return;
    }
    
    setViewOnly(isViewMode);
    setSelectedDay(
      existing || {
        date: dateStr,
        hours: 0,
        activityLog: "",
      }
    );
  };

  const handleSaveDay = async () => {
    if (!selectedDay) return;

    if (selectedDay.hours > 0 && !selectedDay.activityLog?.trim()) {
      toast({
        title: "Activity log required",
        description: "Please describe what you worked on today.",
        variant: "destructive",
      });
      return;
    }

    const ooo = getOOOForDate(selectedDay.date);

    if (selectedDay.hours > MAX_HOURS_PER_DAY) {
      toast({
        title: "Invalid hours",
        description: `You cannot log more than ${MAX_HOURS_PER_DAY} hours in a day.`,
        variant: "destructive",
      });
      return;
    }

    if (ooo?.oooType === "half_day" && selectedDay.hours > HALF_DAY_HOURS) {
      toast({
        title: "Hours limited",
        description: `You can only log up to ${HALF_DAY_HOURS} hours on a half-day leave.`,
        variant: "destructive",
      });
      return;
    }

    // Build new entries with the current day
    const newEntries = new Map(entries);
    newEntries.set(selectedDay.date, selectedDay);
    const entriesArray = Array.from(newEntries.values());

    // Save entries to server first (before updating local state)
    try {
      const response = await saveMutation.mutateAsync(entriesArray);
      
      // Only update local state after successful save
      setEntries(newEntries);
      
      // Handle overtime request creation
      // The save response returns the timesheet, so we can use it even if it was just created
      const savedTimesheet = response as { id: string } | undefined;
      const timesheetIdToUse = savedTimesheet?.id || timesheet?.id;
      
      const isWeekendDay = (date: string) => {
        const d = new Date(date);
        const day = d.getDay();
        return day === 0 || day === 6;
      };

      // Overtime requests are now handled by the backend during timesheet save/submit
      // Just invalidate the queries to ensure UI updates with any new overtime requests
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests", { timesheetId: timesheetIdToUse }] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });

      setSelectedDay(null);
      toast({
        title: "Entry saved",
        description: "Your time entry has been saved.",
      });
    } catch (error) {
      // Don't update local state on failure - keep previous entries
      toast({
        title: "Error",
        description: "Failed to save entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDayEntry = (day: number): DayEntry | undefined => {
    const dateStr = format(new Date(year, month - 1, day), "yyyy-MM-dd");
    return entries.get(dateStr);
  };

  const getMaxHoursForSelectedDay = (): number => {
    if (!selectedDay) return MAX_HOURS_PER_DAY;
    const ooo = getOOOForDate(selectedDay.date);
    if (ooo?.oooType === "half_day") return HALF_DAY_HOURS;
    return MAX_HOURS_PER_DAY;
  };

  const getAutosaveStatusDisplay = () => {
    switch (autosaveStatus) {
      case "saving":
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground" data-testid="status-saving">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Saving...</span>
          </div>
        );
      case "saved":
        return (
          <div className="flex items-center gap-1.5 text-emerald-600" data-testid="status-saved">
            <Check className="w-3.5 h-3.5" />
            <span className="text-xs">Saved</span>
          </div>
        );
      case "unsaved":
        return (
          <div className="flex items-center gap-1.5 text-amber-600" data-testid="status-unsaved">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">Draft</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-1.5 text-destructive" data-testid="status-error">
            <CloudOff className="w-3.5 h-3.5" />
            <span className="text-xs">Save failed</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Timesheets</h1>
          <p className="text-muted-foreground mt-1">
            Log your daily hours and activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditable && entriesArray.length > 0 && getAutosaveStatusDisplay()}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchTimesheet();
              queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
            }}
            disabled={isFetching}
            data-testid="button-refresh-timesheets"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <CardTitle className="text-lg">
                  {format(currentDate, "MMMM yyyy")}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {timesheet && <StatusBadge status={timesheet.status} />}
                {isApproved && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-500">
                    <Lock className="w-3 h-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <>
                  <div className="flex gap-4 mb-4 text-xs flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
                      <span className="text-muted-foreground">Full-day leave</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/50" />
                      <span className="text-muted-foreground">Half-day leave (4h max)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/50" />
                      <span className="text-muted-foreground">Overtime pending</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = format(new Date(year, month - 1, day), "yyyy-MM-dd");
                      const entry = getDayEntry(day);
                      const hasEntry = entry && entry.hours > 0;
                      const isWeekend = (firstDayOfMonth + i) % 7 === 0 || (firstDayOfMonth + i) % 7 === 6;
                      const ooo = getOOOForDate(dateStr);
                      const overtime = getOvertimeForDate(dateStr);
                      const isFullDayOOO = ooo?.oooType === "full_day";
                      const isHalfDayOOO = ooo?.oooType === "half_day";
                      const hasOvertimePending = overtime?.status === "pending";
                      const hasOvertimeApproved = overtime?.status === "approved";

                      return (
                        <button
                          key={day}
                          onClick={() => {
                            if (isEditable && !isFullDayOOO) {
                              handleDayClick(day, false);
                            } else if (!isEditable && hasEntry) {
                              handleDayClick(day, true);
                            }
                          }}
                          disabled={isFullDayOOO || (!isEditable && !hasEntry)}
                          className={cn(
                            "aspect-square rounded-md border text-sm font-medium transition-colors relative",
                            "flex flex-col items-center justify-center gap-1",
                            isWeekend && "bg-muted/30",
                            isFullDayOOO && "bg-red-500/20 border-red-500/50 cursor-not-allowed",
                            isHalfDayOOO && "bg-amber-500/20 border-amber-500/50",
                            hasOvertimePending && "bg-amber-500/20 border-amber-500/50",
                            hasOvertimeApproved && "bg-emerald-500/10 border-emerald-500/50",
                            hasEntry && !isFullDayOOO && !isHalfDayOOO && !hasOvertimePending && "border-primary bg-primary/5",
                            (isEditable && !isFullDayOOO) && "hover:bg-muted cursor-pointer",
                            (!isEditable && hasEntry) && "hover:bg-muted cursor-pointer",
                            (!isEditable && !hasEntry) && "cursor-default opacity-75"
                          )}
                          data-testid={`day-${day}`}
                        >
                          <span className={cn(isFullDayOOO && "line-through text-muted-foreground")}>
                            {day}
                          </span>
                          {hasEntry && (
                            <span className={cn(
                              "text-xs font-semibold",
                              hasOvertimePending && "text-amber-600",
                              hasOvertimeApproved && "text-emerald-600",
                              !hasOvertimePending && !hasOvertimeApproved && "text-primary"
                            )}>
                              {entry.hours}h
                            </span>
                          )}
                          {isFullDayOOO && (
                            <span className="text-[10px] text-red-600">OOO</span>
                          )}
                          {isHalfDayOOO && !hasEntry && (
                            <span className="text-[10px] text-amber-600">4h</span>
                          )}
                          {hasOvertimePending && (
                            <Clock className="absolute top-1 right-1 w-3 h-3 text-amber-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Hours</span>
                <span className="text-2xl font-bold" data-testid="text-total-hours">
                  {totalHours}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min((totalHours / 160) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {totalHours} of 160 expected hours
              </p>
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Days Logged</span>
                  <span className="font-medium" data-testid="text-days-logged">
                    {entries.size}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Hours/Day</span>
                  <span className="font-medium" data-testid="text-avg-hours">
                    {entries.size > 0 ? (totalHours / entries.size).toFixed(1) : 0}
                  </span>
                </div>
                {overtimeRequests && overtimeRequests.filter(r => r.status === "pending").length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending Overtime</span>
                    <Badge variant="outline" className="text-amber-600 border-amber-500">
                      {overtimeRequests.filter(r => r.status === "pending").length}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isApproved && (
            <Card className="border-emerald-500/50 bg-emerald-500/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <Lock className="w-4 h-4" />
                  <p>
                    This timesheet has been approved and is now locked. No changes can be made.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isSubmitted && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <p>
                    This timesheet is awaiting manager approval.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isEditable && !isApproved && !isSubmitted && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="py-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  This timesheet has been {timesheet?.status}. You cannot make changes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!selectedDay} onOpenChange={() => { setSelectedDay(null); setViewOnly(false); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(new Date(selectedDay.date), "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {viewOnly ? "View entry details (read-only)" : "Log your hours and activities for this day"}
            </DialogDescription>
          </DialogHeader>

          {selectedDay && getOOOForDate(selectedDay.date)?.oooType === "half_day" && !viewOnly && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-amber-600">
                Half-day leave: You can only log up to {HALF_DAY_HOURS} hours.
              </p>
            </div>
          )}

          {viewOnly ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Hours Worked</label>
                <div className="p-3 rounded-md bg-muted/50">
                  <span className="text-lg font-semibold">{selectedDay?.hours || 0}h</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Activity Log</label>
                <div className="p-3 rounded-md bg-muted/50 min-h-[80px]">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedDay?.activityLog || "No activity log recorded"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hours Worked</label>
                <Input
                  type="number"
                  min="0"
                  max={getMaxHoursForSelectedDay()}
                  step="0.5"
                  value={selectedDay?.hours || ""}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const maxHours = getMaxHoursForSelectedDay();
                    const clampedValue = Math.min(Math.max(0, value), maxHours);
                    setSelectedDay((prev) =>
                      prev ? { ...prev, hours: clampedValue } : null
                    );
                  }}
                  placeholder="0"
                  data-testid="input-hours"
                />
                {selectedDay && selectedDay.hours > STANDARD_HOURS && (
                  <p className="text-xs text-amber-600">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Hours over {STANDARD_HOURS} will require manager approval.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Activity Log <span className="text-red-500">*</span></label>
                <Textarea
                  value={selectedDay?.activityLog || ""}
                  onChange={(e) =>
                    setSelectedDay((prev) =>
                      prev ? { ...prev, activityLog: e.target.value } : null
                    )
                  }
                  placeholder="What did you work on today? (Required)"
                  rows={4}
                  className="resize-none"
                  data-testid="input-activity-log"
                />
                <p className="text-xs text-muted-foreground">Required when logging hours</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => { setSelectedDay(null); setViewOnly(false); }}
              data-testid="button-cancel-day"
            >
              {viewOnly ? "Close" : "Cancel"}
            </Button>
            {!viewOnly && (
              <Button
                onClick={handleSaveDay}
                disabled={createOvertimeMutation.isPending}
                data-testid="button-save-day"
              >
                {createOvertimeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Entry"
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
