import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import type { OvertimeRequest } from "@shared/schema";

type EnrichedOvertimeRequest = OvertimeRequest & { activityLog?: string | null };
import { useState } from "react";

const NOTE_MAX = 500;

const TINTED_BTN =
  "bg-[#ECFDF5] dark:bg-[#059669]/15 text-[#059669] dark:text-[#34D399] border-[1.5px] border-[#A7F3D0] dark:border-[#059669]/30 hover:bg-[#D1FAE5] dark:hover:bg-[#059669]/25 font-semibold";
const DANGER_BTN =
  "bg-[#FEF2F2] dark:bg-[#DC2626]/15 text-[#DC2626] dark:text-[#F87171] border-[1.5px] border-[#FECACA] dark:border-[#DC2626]/30 hover:bg-[#FEE2E2] dark:hover:bg-[#DC2626]/25";

function getRequestTypeLabel(request: OvertimeRequest): string {
  if (request.isWeekendWork) {
    return request.requestedHours > 8 ? "Weekend Overtime" : "Weekend Work";
  }
  return "Overtime";
}

export default function OvertimeApprovalsPage() {
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [approvedHours, setApprovedHours] = useState<number>(0);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: overtimeRequests, isLoading, isFetching, refetch } = useQuery<EnrichedOvertimeRequest[]>({
    queryKey: ["/api/overtime-requests"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<{ id: string; firstName: string; lastName: string; jobTitle: string | null; role: string }[]>({
    queryKey: ["/api/users/basic"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, approvedHours, isWeekendWork }: { id: string; status: string; approvedHours?: number; isWeekendWork?: boolean }) => {
      return apiRequest("PATCH", `/api/overtime-requests/${id}`, {
        status,
        reviewedBy: user?.id,
        reviewNote: reviewNote || null,
        approvedHours: status === "approved" ? approvedHours : null,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests/pending-count"] });
      const typeLabel = variables.isWeekendWork ? "Weekend work" : "Overtime";
      toast({
        title: variables.status === "approved" ? `${typeLabel} approved` : `${typeLabel} rejected`,
        description: `The ${typeLabel.toLowerCase()} request has been ${variables.status}.`,
      });
      setSelectedRequest(null);
      setReviewNote("");
      setApprovedHours(0);
      setActionType(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getUserName = (userId: string) => {
    if (usersLoading) return null;
    const foundUser = users?.find((u) => u.id === userId);
    return foundUser ? `${foundUser.firstName} ${foundUser.lastName}` : "Unknown User";
  };

  const getUserInitials = (userId: string) => {
    if (usersLoading) return "...";
    const foundUser = users?.find((u) => u.id === userId);
    if (!foundUser) return "?";
    return `${foundUser.firstName?.[0] || ""}${foundUser.lastName?.[0] || ""}`.toUpperCase();
  };

  const handleAction = (request: OvertimeRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    if (action === "approve") {
      setApprovedHours(request.requestedHours);
    }
  };

  const confirmAction = () => {
    if (selectedRequest && actionType) {
      reviewMutation.mutate({
        id: selectedRequest.id,
        status: actionType === "approve" ? "approved" : "rejected",
        approvedHours: actionType === "approve" ? approvedHours : undefined,
        isWeekendWork: selectedRequest.isWeekendWork,
      });
    }
  };

  const sortRequests = (requests: EnrichedOvertimeRequest[]) => {
    return [...requests].sort((a, b) => {
      const createdAtDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (createdAtDiff !== 0) return createdAtDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  };

  const pendingRequests = sortRequests(overtimeRequests?.filter((r) => r.status === "pending") || []);
  const approvedRequests = sortRequests(overtimeRequests?.filter((r) => r.status === "approved") || []);
  const rejectedRequests = sortRequests(overtimeRequests?.filter((r) => r.status === "rejected") || []);

  const bulk = useBulkSelection(pendingRequests);

  const renderRequestCard = (request: EnrichedOvertimeRequest, showActions: boolean = false) => {
    const overtimeHours = request.requestedHours - 8;
    const isWeekend = request.isWeekendWork;
    const userName = getUserName(request.userId);
    const initials = getUserInitials(request.userId);

    return (
      <div
        key={request.id}
        className="px-[18px] py-3.5 border-b border-neutral-50 dark:border-white/5 last:border-b-0"
        data-testid={`overtime-request-${request.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {showActions && (
              <Checkbox
                className="mt-1 h-4 w-4"
                checked={bulk.isSelected(request.id)}
                onCheckedChange={(c) => bulk.setSelected(request.id, c === true)}
                data-testid={`select-overtime-${request.id}`}
                aria-label="Select overtime request"
              />
            )}
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#1C2230] border border-[#2A3545] text-[#8DAFC8] text-[10px] font-bold">
                {usersLoading ? "..." : initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              {usersLoading ? (
                <Skeleton className="h-4 w-28 mb-1" />
              ) : (
                <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">{userName}</p>
              )}
              <p className="text-[11.5px] text-neutral-400">
                {format(new Date(request.date), "EEEE, MMMM d, yyyy")}
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {isWeekend && (
                  <Badge variant="outline" className="text-[10.5px] text-neutral-500 border-neutral-200 dark:text-neutral-400 dark:border-white/15">
                    <Calendar className="w-3 h-3 mr-1" />
                    Weekend work
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10.5px] text-neutral-500 border-neutral-200 dark:text-neutral-400 dark:border-white/15">
                  <Clock className="w-3 h-3 mr-1" />
                  {request.requestedHours} hours total
                </Badge>
                {overtimeHours > 0 && (
                  <Badge variant="secondary" className="text-[10.5px]">
                    +{overtimeHours}h overtime
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={request.status} />
            {showActions && (
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className={TINTED_BTN}
                  onClick={() => handleAction(request, "approve")}
                  data-testid={`button-approve-overtime-${request.id}`}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={DANGER_BTN}
                  onClick={() => handleAction(request, "reject")}
                  data-testid={`button-reject-overtime-${request.id}`}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
        {request.activityLog && (
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-2 pl-11">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Work performed:</span> {request.activityLog}
          </p>
        )}
        {request.status === "approved" && request.approvedHours && (
          <p className="text-[12px] text-[#059669] dark:text-[#34D399] mt-2 pl-11">
            Approved: {request.approvedHours} hours
          </p>
        )}
        {request.reviewNote && (
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-1 pl-11">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Note:</span> {request.reviewNote}
          </p>
        )}
      </div>
    );
  };

  const selectedRequestWithLog = overtimeRequests?.find((r) => r.id === selectedRequest?.id) as EnrichedOvertimeRequest | undefined;

  return (
    <div className="p-6 flex flex-col gap-[18px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-normal text-neutral-900 dark:text-neutral-50 font-serif mb-0.5">Overtime &amp; weekend approvals</h1>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            Review and approve overtime and weekend work requests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-overtime"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border-[1.5px] border-neutral-200 dark:border-white/10 bg-white dark:bg-card text-[12.5px] text-neutral-500 dark:text-neutral-400">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400" />
        <p>
          Contractors can log more than 8 hours per day or work on weekends, but both require your approval.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-overtime-pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-overtime-approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-overtime-rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Pending overtime requests</div>
                  <div className="text-[11.5px] text-neutral-400">Hours above 8 per day that need your approval</div>
                </div>
                <span className="text-[11px] font-semibold bg-[#FFFBEB] dark:bg-[#D97706]/15 text-[#D97706] dark:text-[#FBBF24] px-2.5 py-1 rounded-full">
                  {pendingRequests.length} items
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
                  data-testid="select-all-overtime"
                  aria-label="Select all"
                />
                <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">Select all on page</span>
              </div>
              <div>{pendingRequests.map((request) => renderRequestCard(request, true))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <Clock className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No pending overtime requests</p>
              <p className="text-[12px] text-neutral-400 mt-1">All overtime requests have been reviewed</p>
            </div>
          )}
          <BulkActionBar
            selectedIds={bulk.selectedArray}
            resourceLabel="overtime request"
            resourcePlural="overtime requests"
            endpoint="/api/overtime-requests/bulk-review"
            onAfterSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
              queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests/pending-count"] });
              queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
            }}
            onClear={bulk.clear}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : approvedRequests.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Approved overtime</div>
                <div className="text-[11.5px] text-neutral-400">Overtime requests that have been approved</div>
              </div>
              <div>{approvedRequests.map((request) => renderRequestCard(request))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No approved overtime</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : rejectedRequests.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Rejected overtime</div>
                <div className="text-[11.5px] text-neutral-400">Overtime requests that were not approved</div>
              </div>
              <div>{rejectedRequests.map((request) => renderRequestCard(request))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <XCircle className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No rejected overtime</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setReviewNote(""); setApprovedHours(0); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" 
                ? `Approve ${selectedRequest?.isWeekendWork ? "Weekend Work" : "Overtime"}` 
                : `Reject ${selectedRequest?.isWeekendWork ? "Weekend Work" : "Overtime"}`}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Confirm the ${selectedRequest?.isWeekendWork ? "weekend work" : "overtime"} hours to approve.`
                : `Please provide a reason for rejecting this ${selectedRequest?.isWeekendWork ? "weekend work" : "overtime"} request.`}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-md bg-muted/50 space-y-2">
                <p className="font-medium">{getUserName(selectedRequest.userId)}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.date), "EEEE, MMMM d, yyyy")}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {selectedRequest.isWeekendWork && (
                    <Badge variant="outline" className="text-orange-600 border-orange-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      Weekend Work
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-blue-600 border-blue-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {selectedRequest.requestedHours} hours requested
                  </Badge>
                </div>
                {selectedRequestWithLog?.activityLog && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Work performed:</span>{" "}
                      {selectedRequestWithLog.activityLog}
                    </p>
                  </div>
                )}
              </div>

              {actionType === "approve" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Approved Hours</label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedRequest.requestedHours}
                    value={approvedHours}
                    onChange={(e) => setApprovedHours(parseInt(e.target.value) || 1)}
                    data-testid="input-approved-hours"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can approve fewer hours than requested (minimum 1).
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {actionType === "approve" ? "Note (optional)" : "Reason for rejection"}
                </label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value.slice(0, NOTE_MAX))}
                  placeholder={
                    actionType === "approve"
                      ? "Add a note..."
                      : `Please explain why this ${selectedRequest.isWeekendWork ? "weekend work" : "overtime"} is being rejected...`
                  }
                  rows={3}
                  className="resize-none"
                  data-testid="input-overtime-note"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reviewNote.length} / {NOTE_MAX}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setReviewNote("");
                setApprovedHours(0);
                setActionType(null);
              }}
              data-testid="button-cancel-overtime-review"
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={reviewMutation.isPending || (actionType === "reject" && !reviewNote)}
              data-testid="button-confirm-overtime-action"
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                `Approve ${selectedRequest?.isWeekendWork ? "Weekend Work" : "Overtime"}`
              ) : (
                `Reject ${selectedRequest?.isWeekendWork ? "Weekend Work" : "Overtime"}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
