import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        className="p-4 rounded-md bg-muted/50 space-y-3"
        data-testid={`overtime-request-${request.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {showActions && (
              <Checkbox
                className="mt-1 h-5 w-5"
                checked={bulk.isSelected(request.id)}
                onCheckedChange={(c) => bulk.setSelected(request.id, c === true)}
                data-testid={`select-overtime-${request.id}`}
                aria-label="Select overtime request"
              />
            )}
            <Avatar className="h-10 w-10">
              <AvatarFallback className={`${isWeekend ? "bg-orange-500/10 text-orange-600" : "bg-primary/10 text-primary"} text-sm`}>
                {usersLoading ? (
                  <span className="inline-block w-4 h-4 rounded-full bg-muted animate-pulse" />
                ) : initials}
              </AvatarFallback>
            </Avatar>
            <div>
              {usersLoading ? (
                <Skeleton className="h-4 w-28 mb-1" />
              ) : (
                <p className="font-medium">{userName}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {format(new Date(request.date), "EEEE, MMMM d, yyyy")}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {isWeekend && (
                  <Badge variant="outline" className="text-orange-600 border-orange-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    Weekend Work
                  </Badge>
                )}
                <Badge variant="outline" className="text-blue-600 border-blue-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {request.requestedHours} hours total
                </Badge>
                {overtimeHours > 0 && (
                  <Badge variant="secondary">
                    +{overtimeHours}h overtime
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>
        {request.activityLog && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Work performed:</span> {request.activityLog}
            </p>
          </div>
        )}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => handleAction(request, "approve")}
              data-testid={`button-approve-overtime-${request.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(request, "reject")}
              data-testid={`button-reject-overtime-${request.id}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
        {request.status === "approved" && request.approvedHours && (
          <div className="pt-2 border-t">
            <p className="text-sm text-emerald-600">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Approved: {request.approvedHours} hours
            </p>
          </div>
        )}
        {request.reviewNote && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Note:</span> {request.reviewNote}
            </p>
          </div>
        )}
      </div>
    );
  };

  const selectedRequestWithLog = overtimeRequests?.find((r) => r.id === selectedRequest?.id) as EnrichedOvertimeRequest | undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Overtime & Weekend Work Approvals</h1>
          <p className="text-muted-foreground mt-1">
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

      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <AlertCircle className="w-4 h-4" />
            <p>
              Contractors can log more than 8 hours per day or work on weekends, but both require your approval.
            </p>
          </div>
        </CardContent>
      </Card>

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

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : pendingRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Overtime Requests</CardTitle>
                <CardDescription>
                  Hours above 8 per day that need your approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 pb-3 mb-3 border-b">
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
                  <span className="text-sm text-muted-foreground">Select all on page</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingRequests.map((request) => renderRequestCard(request, true))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No pending overtime requests</p>
                  <p className="mt-1">All overtime requests have been reviewed</p>
                </div>
              </CardContent>
            </Card>
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

        <TabsContent value="approved" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : approvedRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approved Overtime</CardTitle>
                <CardDescription>
                  Overtime requests that have been approved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {approvedRequests.map((request) => renderRequestCard(request))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No approved overtime</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : rejectedRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rejected Overtime</CardTitle>
                <CardDescription>
                  Overtime requests that were not approved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rejectedRequests.map((request) => renderRequestCard(request))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No rejected overtime</p>
                </div>
              </CardContent>
            </Card>
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
