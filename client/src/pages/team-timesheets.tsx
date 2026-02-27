import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, getWeek } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, Loader2, Calendar, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Timesheet, DailyEntry } from "@shared/schema";

interface TimesheetWithUser extends Timesheet {
  userName: string;
  userEmail: string;
}

interface WeeklyGroup {
  weekNum: number;
  weekStart: Date;
  entries: DailyEntry[];
  totalHours: number;
}

export default function TeamTimesheetsPage() {
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithUser | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [viewingEntries, setViewingEntries] = useState<TimesheetWithUser | null>(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: pendingTimesheets, isLoading: pendingLoading } = useQuery<TimesheetWithUser[]>({
    queryKey: ["/api/team/timesheets"],
  });

  const { data: allTimesheets, isLoading: allLoading } = useQuery<TimesheetWithUser[]>({
    queryKey: ["/api/timesheets"],
  });

  const { data: entries, isLoading: entriesLoading } = useQuery<DailyEntry[]>({
    queryKey: [`/api/timesheets/${viewingEntries?.id}/entries`],
    enabled: !!viewingEntries?.id,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/timesheets/${id}`, {
        status,
        reviewedBy: user?.id,
        reviewNote: reviewNote || null,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending-count"] });
      toast({
        title: variables.status === "approved" ? "Timesheet approved" : "Timesheet rejected",
        description: `The timesheet has been ${variables.status}.`,
      });
      setSelectedTimesheet(null);
      setReviewNote("");
      setActionType(null);
      setViewingEntries(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process timesheet. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Group entries by week for better visualization
  const weeklyGroups = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    
    const groups: Map<number, WeeklyGroup> = new Map();
    
    entries.forEach((entry) => {
      const date = new Date(entry.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekNum = getWeek(date, { weekStartsOn: 1 });
      
      if (!groups.has(weekNum)) {
        groups.set(weekNum, {
          weekNum,
          weekStart,
          entries: [],
          totalHours: 0,
        });
      }
      
      const group = groups.get(weekNum)!;
      group.entries.push(entry);
      group.totalHours += entry.hours || 0;
    });
    
    // Sort groups by week number and entries within each group by date
    return Array.from(groups.values())
      .sort((a, b) => a.weekNum - b.weekNum)
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      }));
  }, [entries]);

  const toggleWeekCollapse = (weekNum: number) => {
    setCollapsedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNum)) {
        newSet.delete(weekNum);
      } else {
        newSet.add(weekNum);
      }
      return newSet;
    });
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!entries || entries.length === 0) return null;
    const daysWorked = entries.length;
    const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const avgHoursPerDay = daysWorked > 0 ? (totalHours / daysWorked).toFixed(1) : "0";
    const maxHoursEntry = entries.reduce((max, e) => (e.hours || 0) > (max?.hours || 0) ? e : max, entries[0]);
    return { daysWorked, totalHours, avgHoursPerDay, maxHoursEntry };
  }, [entries]);

  const handleAction = (timesheet: TimesheetWithUser, action: "approve" | "reject") => {
    setSelectedTimesheet(timesheet);
    setActionType(action);
  };

  const confirmAction = () => {
    if (selectedTimesheet && actionType) {
      reviewMutation.mutate({
        id: selectedTimesheet.id,
        status: actionType === "approve" ? "approved" : "rejected",
      });
    }
  };

  const submittedTimesheets = pendingTimesheets?.filter((t) => t.status === "submitted") || [];
  const approvedTimesheets = allTimesheets?.filter((t) => t.status === "approved") || [];
  const rejectedTimesheets = allTimesheets?.filter((t) => t.status === "rejected") || [];

  const renderTimesheetCard = (timesheet: TimesheetWithUser, showActions: boolean = false) => {
    return (
      <div
        key={timesheet.id}
        className="p-4 rounded-md bg-muted/50 space-y-3"
        data-testid={`timesheet-card-${timesheet.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {timesheet.userName?.split(" ").map((n) => n[0]).join("") || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{timesheet.userName || "Unknown"}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <p className="text-sm text-muted-foreground">
                  {format(new Date(timesheet.year, timesheet.month - 1), "MMMM yyyy")}
                </p>
                <span className="text-muted-foreground">-</span>
                <p className="text-sm font-medium">
                  {timesheet.totalHours} hours
                </p>
              </div>
              {timesheet.submittedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted: {format(new Date(timesheet.submittedAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={timesheet.status} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewingEntries(timesheet)}
            data-testid={`button-view-entries-${timesheet.id}`}
          >
            <Calendar className="w-4 h-4 mr-1" />
            View Entries
          </Button>
          {showActions && (
            <>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleAction(timesheet, "approve")}
                data-testid={`button-approve-${timesheet.id}`}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleAction(timesheet, "reject")}
                data-testid={`button-reject-${timesheet.id}`}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
        {timesheet.reviewNote && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Review Note:</span> {timesheet.reviewNote}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team Timesheets</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve team timesheet submissions
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({submittedTimesheets.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedTimesheets.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected ({rejectedTimesheets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : submittedTimesheets.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Approval</CardTitle>
                <CardDescription>
                  Timesheets awaiting your review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submittedTimesheets.map((timesheet) => renderTimesheetCard(timesheet, true))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No pending timesheets</p>
                  <p className="mt-1">All timesheets have been reviewed</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {allLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : approvedTimesheets.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approved Timesheets</CardTitle>
                <CardDescription>
                  Timesheets that have been approved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvedTimesheets.map((timesheet) => renderTimesheetCard(timesheet))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No approved timesheets</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {allLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : rejectedTimesheets.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rejected Timesheets</CardTitle>
                <CardDescription>
                  Timesheets that were not approved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rejectedTimesheets.map((timesheet) => renderTimesheetCard(timesheet))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No rejected timesheets</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTimesheet} onOpenChange={() => setSelectedTimesheet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Timesheet" : "Reject Timesheet"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Confirm that you want to approve this timesheet."
                : "Please provide a reason for rejecting this timesheet."}
            </DialogDescription>
          </DialogHeader>
          {selectedTimesheet && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-md bg-muted/50">
                <p className="font-medium">
                  {selectedTimesheet.userName} - {format(new Date(selectedTimesheet.year, selectedTimesheet.month - 1), "MMMM yyyy")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total Hours: {selectedTimesheet.totalHours}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {actionType === "approve" ? "Note (optional)" : "Reason for rejection"}
                </label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    actionType === "approve"
                      ? "Add a note for the contractor..."
                      : "Please explain why this timesheet is being rejected..."
                  }
                  rows={3}
                  className="resize-none"
                  data-testid="input-review-note"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTimesheet(null);
                setReviewNote("");
                setActionType(null);
              }}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={reviewMutation.isPending || (actionType === "reject" && !reviewNote)}
              data-testid="button-confirm-action"
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                "Approve Timesheet"
              ) : (
                "Reject Timesheet"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEntries} onOpenChange={() => { setViewingEntries(null); setCollapsedWeeks(new Set()); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Timesheet Entries - {viewingEntries?.userName}
            </DialogTitle>
            <DialogDescription>
              {viewingEntries && format(new Date(viewingEntries.year, viewingEntries.month - 1), "MMMM yyyy")}
              {" - "}Total: {viewingEntries?.totalHours} hours
            </DialogDescription>
          </DialogHeader>
          
          {summaryStats && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-muted/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Days Worked</p>
                <p className="font-semibold">{summaryStats.daysWorked}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
                <p className="font-semibold">{summaryStats.avgHoursPerDay}h</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Busiest Day</p>
                <p className="font-semibold text-xs">
                  {summaryStats.maxHoursEntry && format(new Date(summaryStats.maxHoursEntry.date), "MMM d")} ({summaryStats.maxHoursEntry?.hours}h)
                </p>
              </div>
            </div>
          )}
          
          <div className="max-h-80 overflow-y-auto space-y-2">
            {entriesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : weeklyGroups.length > 0 ? (
              weeklyGroups.map((group) => (
                <Collapsible
                  key={group.weekNum}
                  open={!collapsedWeeks.has(group.weekNum)}
                  onOpenChange={() => toggleWeekCollapse(group.weekNum)}
                >
                  <CollapsibleTrigger asChild>
                    <div
                      className="flex items-center justify-between p-3 rounded-md bg-muted cursor-pointer hover-elevate"
                      data-testid={`week-header-${group.weekNum}`}
                    >
                      <div className="flex items-center gap-2">
                        {collapsedWeeks.has(group.weekNum) ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span className="font-medium text-sm">
                          Week of {format(group.weekStart, "MMM d")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({group.entries.length} {group.entries.length === 1 ? "day" : "days"})
                        </span>
                      </div>
                      <span className="font-semibold text-sm">{group.totalHours}h</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pt-2 space-y-1">
                      {group.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start justify-between p-2 rounded-md bg-muted/30"
                          data-testid={`entry-${entry.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {format(new Date(entry.date), "EEEE, MMM d")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {entry.activityLog || "No activity log"}
                            </p>
                          </div>
                          <div className="text-right ml-2 shrink-0">
                            <p className="font-medium text-sm">{entry.hours}h</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No entries found</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setViewingEntries(null)}>
              Close
            </Button>
            {viewingEntries?.status === "submitted" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingEntries(null);
                    handleAction(viewingEntries, "reject");
                  }}
                  data-testid="button-reject-from-view"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setViewingEntries(null);
                    handleAction(viewingEntries, "approve");
                  }}
                  data-testid="button-approve-from-view"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
