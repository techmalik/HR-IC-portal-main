import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { ReviewDialog, ReviewNoteField } from "@/components/review-dialog";
import { useReviewAction } from "@/hooks/use-review-action";
import { WeeklyEntriesViewer } from "@/components/weekly-entries-viewer";
import { useWeeklyEntries } from "@/hooks/use-weekly-entries";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, Calendar, TrendingUp } from "lucide-react";
import type { Timesheet, DailyEntry } from "@shared/schema";
import { APPROVE_BUTTON_CLASS as TINTED_BTN, REJECT_BUTTON_CLASS as DANGER_BTN } from "@/lib/utils";
import { getInitialsFromName } from "@/lib/initials";

interface TimesheetWithUser extends Timesheet {
  userName: string;
  userEmail: string;
}

export default function TeamTimesheetsPage() {
  const [viewingEntries, setViewingEntries] = useState<TimesheetWithUser | null>(null);
  const { user } = useAuth();

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

  const review = useReviewAction<TimesheetWithUser>({
    mutationFn: ({ item, action, note }) =>
      apiRequest("PATCH", `/api/timesheets/${item.id}`, {
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: user?.id,
        reviewNote: note || null,
      }),
    invalidateKeys: ["/api/team/timesheets", "/api/timesheets", "/api/timesheets/pending-count"],
    noteRequiredForActions: ["reject"],
    getToast: (action) => ({
      title: action === "approve" ? "Timesheet approved" : "Timesheet rejected",
      description: `The timesheet has been ${action === "approve" ? "approved" : "rejected"}.`,
    }),
    errorMessage: "Failed to process timesheet. Please try again.",
    onSuccess: () => setViewingEntries(null),
  });

  const { weeklyGroups, summaryStats, collapsedWeeks, setCollapsedWeeks, toggleWeekCollapse } =
    useWeeklyEntries(entries);

  const submittedTimesheets = pendingTimesheets?.filter((t) => t.status === "submitted") || [];
  const approvedTimesheets = allTimesheets?.filter((t) => t.status === "approved") || [];
  const rejectedTimesheets = allTimesheets?.filter((t) => t.status === "rejected") || [];

  const bulk = useBulkSelection(submittedTimesheets);

  const renderTimesheetCard = (timesheet: TimesheetWithUser, showActions: boolean = false) => {
    const showCheckbox = showActions;
    return (
      <div
        key={timesheet.id}
        className="px-[18px] py-3.5 border-b border-neutral-50 dark:border-white/5 last:border-b-0"
        data-testid={`timesheet-card-${timesheet.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {showCheckbox && (
              <Checkbox
                className="mt-1 h-4 w-4"
                checked={bulk.isSelected(timesheet.id)}
                onCheckedChange={(c) => bulk.setSelected(timesheet.id, c === true)}
                data-testid={`select-timesheet-${timesheet.id}`}
                aria-label="Select timesheet"
              />
            )}
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#1C2230] border border-[#2A3545] text-[#8DAFC8] text-[10px] font-bold">
                {getInitialsFromName(timesheet.userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">{timesheet.userName || "Unknown"}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <p className="text-[11.5px] text-neutral-400">
                  {format(new Date(timesheet.year, timesheet.month - 1), "MMMM yyyy")}
                </p>
                <span className="text-neutral-300">·</span>
                <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {timesheet.totalHours} hours
                </p>
              </div>
              {timesheet.submittedAt && (
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Submitted {format(new Date(timesheet.submittedAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={timesheet.status} />
        </div>
        <div className="flex gap-1.5 pt-2.5 pl-11">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewingEntries(timesheet)}
            data-testid={`button-view-entries-${timesheet.id}`}
          >
            View entries
          </Button>
          {showActions && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className={TINTED_BTN}
                onClick={() => review.start(timesheet, "approve")}
                data-testid={`button-approve-${timesheet.id}`}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={DANGER_BTN}
                onClick={() => review.start(timesheet, "reject")}
                data-testid={`button-reject-${timesheet.id}`}
              >
                Reject
              </Button>
            </>
          )}
        </div>
        {timesheet.reviewNote && (
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-2 pl-11">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Review note:</span> {timesheet.reviewNote}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 flex flex-col gap-[18px]">
      <div>
        <h1 className="text-xl font-normal text-neutral-900 dark:text-neutral-50 font-serif mb-0.5">Team timesheets</h1>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
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

        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : submittedTimesheets.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Pending approval</div>
                  <div className="text-[11.5px] text-neutral-400">Timesheets awaiting your review</div>
                </div>
                <span className="text-[11px] font-semibold bg-[#FFFBEB] dark:bg-[#D97706]/15 text-[#D97706] dark:text-[#FBBF24] px-2.5 py-1 rounded-full">
                  {submittedTimesheets.length} items
                </span>
              </div>
              <div className="flex items-center gap-2 px-[18px] py-2.5 border-b border-neutral-100 dark:border-white/10 bg-[#F9FAFB] dark:bg-white/5">
                <Checkbox
                  checked={
                    bulk.allVisibleSelected
                      ? true
                      : bulk.someVisibleSelected
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={(c) => bulk.toggleAll(c === true)}
                  data-testid="select-all-timesheets"
                  aria-label="Select all"
                />
                <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                  Select all on page
                </span>
              </div>
              <div>{submittedTimesheets.map((timesheet) => renderTimesheetCard(timesheet, true))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <Clock className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No pending timesheets</p>
              <p className="text-[12px] text-neutral-400 mt-1">All timesheets have been reviewed</p>
            </div>
          )}
          <BulkActionBar
            selectedIds={bulk.selectedArray}
            resourceLabel="timesheet"
            endpoint="/api/timesheets/bulk-review"
            onAfterSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/team/timesheets"] });
              queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
              queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending-count"] });
            }}
            onClear={bulk.clear}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {allLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : approvedTimesheets.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Approved timesheets</div>
                <div className="text-[11.5px] text-neutral-400">Timesheets that have been approved</div>
              </div>
              <div>{approvedTimesheets.map((timesheet) => renderTimesheetCard(timesheet))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No approved timesheets</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {allLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : rejectedTimesheets.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Rejected timesheets</div>
                <div className="text-[11.5px] text-neutral-400">Timesheets that were not approved</div>
              </div>
              <div>{rejectedTimesheets.map((timesheet) => renderTimesheetCard(timesheet))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <XCircle className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No rejected timesheets</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ReviewDialog
        open={review.isOpen}
        onOpenChange={() => review.close()}
        title={review.action === "approve" ? "Approve Timesheet" : "Reject Timesheet"}
        description={
          review.action === "approve"
            ? "Confirm that you want to approve this timesheet."
            : "Please provide a reason for rejecting this timesheet."
        }
        confirmLabel={review.action === "approve" ? "Approve Timesheet" : "Reject Timesheet"}
        confirmVariant={review.action === "approve" ? "default" : "destructive"}
        isPending={review.isPending}
        confirmDisabled={!review.canConfirm}
        onConfirm={review.confirm}
        onCancel={review.close}
      >
        {review.item && (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-md bg-muted/50">
              <p className="font-medium">
                {review.item.userName} - {format(new Date(review.item.year, review.item.month - 1), "MMMM yyyy")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Total Hours: {review.item.totalHours}
              </p>
            </div>
            <ReviewNoteField
              label={review.action === "approve" ? "Note (optional)" : "Reason for rejection"}
              required={review.noteRequired}
              value={review.note}
              onChange={review.setNote}
              placeholder={
                review.action === "approve"
                  ? "Add a note for the contractor..."
                  : "Please explain why this timesheet is being rejected..."
              }
            />
          </div>
        )}
      </ReviewDialog>

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
          
          <div className="max-h-80 overflow-y-auto">
            <WeeklyEntriesViewer
              isLoading={entriesLoading}
              weeklyGroups={weeklyGroups}
              collapsedWeeks={collapsedWeeks}
              onToggleWeek={toggleWeekCollapse}
            />
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
                    review.start(viewingEntries, "reject");
                  }}
                  data-testid="button-reject-from-view"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setViewingEntries(null);
                    review.start(viewingEntries, "approve");
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
