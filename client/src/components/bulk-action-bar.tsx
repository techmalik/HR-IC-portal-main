import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

export interface BulkResultItem {
  id: string;
  success: boolean;
  error?: string;
}

export interface BulkResponse {
  results: BulkResultItem[];
  successCount: number;
  failureCount: number;
}

interface BulkActionBarProps {
  selectedIds: string[];
  resourceLabel: string; // e.g. "timesheet"
  resourcePlural?: string; // e.g. "timesheets"
  endpoint: string; // e.g. "/api/timesheets/bulk-review"
  /**
   * Caller-controlled cache invalidation. Invoked after a successful bulk
   * response so the parent page decides exactly which queries to refresh.
   */
  onAfterSuccess: (response: BulkResponse, decision: "approved" | "rejected") => void;
  onClear: () => void;
  rejectRequiresNote?: boolean;
  confirmThreshold?: number; // default 10
}

export function BulkActionBar({
  selectedIds,
  resourceLabel,
  resourcePlural,
  endpoint,
  onAfterSuccess,
  onClear,
  rejectRequiresNote = false,
  confirmThreshold = 10,
}: BulkActionBarProps) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | null>(null);
  const [resultDialog, setResultDialog] = useState<BulkResponse | null>(null);

  const plural = resourcePlural || `${resourceLabel}s`;
  const count = selectedIds.length;

  const bulkMutation = useMutation({
    mutationFn: async (decision: "approved" | "rejected"): Promise<BulkResponse> => {
      const res = await apiRequest("POST", endpoint, {
        ids: selectedIds,
        status: decision,
        reviewNote: note.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data, decision) => {
      try {
        onAfterSuccess(data, decision);
      } catch (e) {
        console.error("onAfterSuccess handler threw:", e);
      }
      setPendingDecision(null);
      setNote("");
      onClear();

      if (data.failureCount === 0) {
        toast({
          title: `${data.successCount} ${data.successCount === 1 ? resourceLabel : plural} ${decision}`,
        });
      } else {
        // Some failed — show a result dialog so the user sees per-item errors.
        setResultDialog(data);
      }
    },
    onError: (err: any) => {
      let message = err?.message || `Failed to ${pendingDecision === "approved" ? "approve" : "reject"} ${plural}.`;
      try {
        const raw = err?.message || "";
        const jsonPart = raw.includes("{") ? raw.slice(raw.indexOf("{")) : "";
        if (jsonPart) {
          const parsed = JSON.parse(jsonPart);
          if (parsed.error) message = parsed.error;
        }
      } catch {}
      toast({ title: "Bulk action failed", description: message, variant: "destructive" });
    },
  });

  const requestDecision = (decision: "approved" | "rejected") => {
    if (count === 0) return;
    const needsNote = decision === "rejected" && rejectRequiresNote && !note.trim();
    if (count >= confirmThreshold || needsNote) {
      // Confirmation (or required-note) dialog path.
      setPendingDecision(decision);
    } else {
      // Sub-threshold: skip dialog, submit immediately using the inline note.
      setPendingDecision(decision);
      bulkMutation.mutate(decision);
    }
  };

  const confirmAction = () => {
    if (!pendingDecision) return;
    bulkMutation.mutate(pendingDecision);
  };

  if (count === 0 && !resultDialog) return null;

  return (
    <>
      {count > 0 && (
        <div
          className="sticky bottom-4 z-30 mx-auto mt-4 w-full max-w-3xl rounded-lg border bg-background shadow-lg p-3 sm:p-4"
          data-testid="bulk-action-bar"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="text-sm font-medium whitespace-nowrap">
              <span data-testid="bulk-selected-count">{count}</span>{" "}
              {count === 1 ? resourceLabel : plural} selected
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 1000))}
              placeholder="Optional comment for these decisions..."
              rows={1}
              className="resize-none min-h-9 sm:flex-1"
              data-testid="bulk-note"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => requestDecision("approved")}
                disabled={bulkMutation.isPending}
                data-testid="bulk-approve"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve {count}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => requestDecision("rejected")}
                disabled={bulkMutation.isPending}
                data-testid="bulk-reject"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject {count}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                disabled={bulkMutation.isPending}
                data-testid="bulk-clear"
              >
                Clear selection
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={pendingDecision !== null && !bulkMutation.isPending && (count >= confirmThreshold || (pendingDecision === "rejected" && rejectRequiresNote))}
        onOpenChange={(open) => {
          if (!open && !bulkMutation.isPending) setPendingDecision(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDecision === "approved" ? "Approve" : "Reject"} {count}{" "}
              {count === 1 ? resourceLabel : plural}?
            </DialogTitle>
            <DialogDescription>
              {count >= confirmThreshold ? (
                <>
                  You are about to {pendingDecision === "approved" ? "approve" : "reject"} {count}{" "}
                  {plural} at once. This action will notify each affected person and cannot be
                  undone in bulk.
                </>
              ) : (
                <>
                  Each affected person will be notified individually. Successful items will be
                  committed; any failures will be shown.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {pendingDecision === "approved" ? "Note (optional)" : "Reason"}
              {pendingDecision === "rejected" && rejectRequiresNote && (
                <span className="text-red-500" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder={
                pendingDecision === "approved"
                  ? "Add a shared note..."
                  : `Why are you rejecting these ${plural}?`
              }
              data-testid="bulk-confirm-note"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDecision(null)}
              disabled={bulkMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={pendingDecision === "approved" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={
                bulkMutation.isPending ||
                (pendingDecision === "rejected" && rejectRequiresNote && !note.trim())
              }
              data-testid="bulk-confirm"
            >
              {bulkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : pendingDecision === "approved" ? (
                `Approve ${count}`
              ) : (
                `Reject ${count}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resultDialog} onOpenChange={(open) => !open && setResultDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk action partially completed</DialogTitle>
            <DialogDescription>
              {resultDialog?.successCount ?? 0} {plural} updated successfully,{" "}
              {resultDialog?.failureCount ?? 0} could not be processed.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-72">
            <div className="space-y-2 pr-2">
              {(resultDialog?.results || [])
                .filter((r) => !r.success)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</div>
                      <div>{r.error || "Unknown error"}</div>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setResultDialog(null)} data-testid="bulk-result-close">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
