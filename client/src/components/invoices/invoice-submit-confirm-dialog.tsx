import { Loader2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TimesheetSummary {
  exists: boolean;
  status: string;
  totalHours: number;
  daysLogged: number;
  workingDays: number;
  isDraft: boolean;
  incompleteDays: number;
}

interface PendingApprovals {
  hasPending: boolean;
  pendingOvertime: number;
  pendingWeekend: number;
  totalPending: number;
}

interface InvoiceSubmitConfirmDialogProps {
  open: boolean;
  selectedMonth: string;
  selectedYear: string;
  timesheetSummary: TimesheetSummary;
  pendingApprovals: PendingApprovals;
  isLoadingOvertime: boolean;
  selectedTimesheetId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InvoiceSubmitConfirmDialog({
  open,
  selectedMonth,
  selectedYear,
  timesheetSummary,
  pendingApprovals,
  isLoadingOvertime,
  selectedTimesheetId,
  onConfirm,
  onCancel,
}: InvoiceSubmitConfirmDialogProps) {
  const monthName = selectedMonth
    ? new Date(2000, parseInt(selectedMonth) - 1).toLocaleString("default", { month: "long" })
    : "";

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Invoice Submission</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-md p-4 space-y-2">
                <p className="font-medium text-foreground">
                  Timesheet Summary for {monthName} {selectedYear}
                </p>
                {timesheetSummary.exists ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">
                        {timesheetSummary.status === "draft" ? "Draft" : timesheetSummary.status}
                      </span>
                      <span className="text-muted-foreground">Total Hours:</span>
                      <span className="font-medium">{timesheetSummary.totalHours} hours</span>
                      <span className="text-muted-foreground">Days Logged:</span>
                      <span className="font-medium">
                        {timesheetSummary.daysLogged} of {timesheetSummary.workingDays} working days
                      </span>
                    </div>
                    {timesheetSummary.incompleteDays > 0 && (
                      <div className="flex items-start gap-2 mt-3 p-2 bg-yellow-500/10 rounded text-yellow-600 dark:text-yellow-400 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          {timesheetSummary.incompleteDays} working day(s) have no hours logged
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded text-yellow-600 dark:text-yellow-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      No timesheet found for this period. A new timesheet will be created upon
                      submission.
                    </span>
                  </div>
                )}
              </div>

              {timesheetSummary.isDraft && timesheetSummary.exists && (
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded text-blue-600 dark:text-blue-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Your draft timesheet will be automatically submitted along with this invoice.
                  </span>
                </div>
              )}

              {isLoadingOvertime && selectedTimesheetId ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Checking for pending approvals...</span>
                </div>
              ) : pendingApprovals.hasPending ? (
                <div className="flex items-start gap-2 p-3 bg-orange-500/10 rounded text-orange-600 dark:text-orange-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Pending Approvals: </span>
                    <span>
                      You have{" "}
                      {[
                        pendingApprovals.pendingOvertime > 0
                          ? `${pendingApprovals.pendingOvertime} overtime request(s)`
                          : null,
                        pendingApprovals.pendingWeekend > 0
                          ? `${pendingApprovals.pendingWeekend} weekend work request(s)`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" and ")}{" "}
                      awaiting supervisor approval. These may affect your invoice total once
                      approved.
                    </span>
                  </div>
                </div>
              ) : null}

              <p className="text-sm text-muted-foreground">
                Are you sure you want to submit this invoice? This will also finalize your timesheet
                for review.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid="button-cancel-submit">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid="button-confirm-submit">
            Submit Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
