import { useQuery } from "@tanstack/react-query";
import { format, isWithinInterval, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { ReviewDialog, ReviewNoteField } from "@/components/review-dialog";
import { useReviewAction } from "@/hooks/use-review-action";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Calendar, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OOORequest } from "@shared/schema";
import { differenceInDays } from "date-fns";
import { getInitialsFromName } from "@/lib/initials";

interface OOORequestWithUser extends OOORequest {
  userName: string;
  userEmail: string;
}

const NOTE_MAX = 500;

function parseReviewErrorMessage(error: unknown): string {
  const raw = (error as any)?.message || "";
  try {
    const jsonPart = raw.includes("{") ? raw.slice(raw.indexOf("{")) : "";
    if (jsonPart) {
      const parsed = JSON.parse(jsonPart);
      if (parsed.error) return parsed.error;
    }
  } catch {}
  return "Failed to process request. Please try again.";
}

export default function LeaveRequestsPage() {
  const { user } = useAuth();

  const { data: pendingRequests, isLoading: pendingLoading, isFetching: pendingFetching, refetch: refetchPending } = useQuery<OOORequestWithUser[]>({
    queryKey: [`/api/leave-requests/pending?managerId=${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: allRequests, isLoading: allLoading, isFetching: allFetching, refetch: refetchAll } = useQuery<OOORequestWithUser[]>({
    queryKey: ["/api/leave-requests"],
    enabled: !!user?.id,
  });

  const review = useReviewAction<OOORequestWithUser>({
    mutationFn: ({ item, action, note }) =>
      apiRequest("PATCH", `/api/ooo-requests/${item.id}`, {
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: user?.id,
        reviewNote: note || null,
      }),
    invalidateKeys: ["/api/leave-requests", "/api/ooo-requests"],
    invalidatePredicate: (query) =>
      typeof query.queryKey[0] === "string" && (query.queryKey[0] as string).startsWith("/api/leave-requests/pending"),
    noteRequiredForActions: ["reject"],
    getToast: (action) => ({
      title: action === "approve" ? "Request approved" : "Request rejected",
      description: `The leave request has been ${action === "approve" ? "approved" : "rejected"}.`,
    }),
    getErrorMessage: parseReviewErrorMessage,
  });

  const getDurationDays = (start: string, end: string, isHalfDay: boolean) => {
    const days = differenceInDays(new Date(end), new Date(start)) + 1;
    return isHalfDay ? days * 0.5 : days;
  };

  const getConflictingTeammates = (request: OOORequestWithUser): OOORequestWithUser[] => {
    if (!allRequests) return [];
    const reqStart = parseISO(request.startDate);
    const reqEnd = parseISO(request.endDate);
    return allRequests.filter((r) => {
      if (r.id === request.id) return false;
      if (r.userId === request.userId) return false;
      if (r.status === "rejected") return false;
      const rStart = parseISO(r.startDate);
      const rEnd = parseISO(r.endDate);
      return (
        isWithinInterval(rStart, { start: reqStart, end: reqEnd }) ||
        isWithinInterval(rEnd, { start: reqStart, end: reqEnd }) ||
        isWithinInterval(reqStart, { start: rStart, end: rEnd })
      );
    });
  };

  const approvedRequests = allRequests?.filter((r) => r.status === "approved") || [];
  const rejectedRequests = allRequests?.filter((r) => r.status === "rejected") || [];

  const bulk = useBulkSelection(pendingRequests);

  const renderRequestCard = (request: OOORequestWithUser, showActions: boolean = false) => {
    const durationDays = getDurationDays(request.startDate, request.endDate, request.oooType === "half_day");
    const conflicts = showActions ? getConflictingTeammates(request) : [];
    
    return (
      <div
        key={request.id}
        className="p-4 rounded-md bg-muted/50 space-y-3"
        data-testid={`request-${request.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {showActions && (
              <Checkbox
                className="mt-1 h-5 w-5"
                checked={bulk.isSelected(request.id)}
                onCheckedChange={(c) => bulk.setSelected(request.id, c === true)}
                data-testid={`select-leave-${request.id}`}
                aria-label="Select leave request"
              />
            )}
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitialsFromName(request.userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{request.userName || "Unknown"}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <p className="text-sm text-muted-foreground">
                  {format(new Date(request.startDate), "MMM d")} -{" "}
                  {format(new Date(request.endDate), "MMM d, yyyy")}
                </p>
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {durationDays} {durationDays === 1 ? "day" : "days"}
                </Badge>
                {request.oooType === "half_day" && (
                  <Badge variant="outline" className="text-xs">Half Day</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {request.reason}
              </p>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {conflicts.length === 1
                ? `${conflicts[0].userName} is also off during this period`
                : `${conflicts.length} teammates are also off during this period`}
            </span>
          </div>
        )}

        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => review.start(request, "approve")}
              data-testid={`button-approve-${request.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => review.start(request, "reject")}
              data-testid={`button-reject-${request.id}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
        {request.reviewNote && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Review Note:</span> {request.reviewNote}
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleRefresh = () => {
    refetchPending();
    refetchAll();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-[22px] font-normal text-foreground mb-1">Leave Requests</h1>
          <p className="text-[13px] text-muted-foreground">
            Review and manage time off requests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={pendingFetching || allFetching}
          data-testid="button-refresh-leave"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${(pendingFetching || allFetching) ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : pendingRequests && pendingRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Approval</CardTitle>
                <CardDescription>
                  Requests awaiting your review
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
                    data-testid="select-all-leave"
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
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No pending requests</p>
                  <p className="mt-1">All leave requests have been reviewed</p>
                </div>
              </CardContent>
            </Card>
          )}
          <BulkActionBar
            selectedIds={bulk.selectedArray}
            resourceLabel="leave request"
            resourcePlural="leave requests"
            endpoint="/api/ooo-requests/bulk-review"
            onAfterSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
              queryClient.invalidateQueries({
                predicate: (query) =>
                  typeof query.queryKey[0] === "string" &&
                  query.queryKey[0].startsWith("/api/leave-requests/pending"),
              });
              queryClient.invalidateQueries({ queryKey: ["/api/ooo-requests"] });
            }}
            onClear={bulk.clear}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {allLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : approvedRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approved Requests</CardTitle>
                <CardDescription>
                  Requests that have been approved
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
                  <p className="text-lg font-medium">No approved requests</p>
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
          ) : rejectedRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rejected Requests</CardTitle>
                <CardDescription>
                  Requests that were not approved
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
                  <p className="text-lg font-medium">No rejected requests</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ReviewDialog
        open={review.isOpen}
        onOpenChange={() => review.close()}
        title={review.action === "approve" ? "Approve Request" : "Reject Request"}
        description={
          review.action === "approve"
            ? "Confirm that you want to approve this leave request."
            : "Please provide a reason for rejecting this request."
        }
        confirmLabel={review.action === "approve" ? "Approve Request" : "Reject Request"}
        confirmVariant={review.action === "approve" ? "default" : "destructive"}
        isPending={review.isPending}
        confirmDisabled={!review.canConfirm}
        onConfirm={review.confirm}
        onCancel={review.close}
      >
        {review.item && (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-md bg-muted/50">
              <p className="font-medium">{review.item.userName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(new Date(review.item.startDate), "MMM d")} -{" "}
                {format(new Date(review.item.endDate), "MMM d, yyyy")}
              </p>
              {review.item.reason && (
                <p className="text-sm text-muted-foreground mt-2">{review.item.reason}</p>
              )}
            </div>
            <ReviewNoteField
              label={review.action === "approve" ? "Note (optional)" : "Reason for rejection"}
              required={review.noteRequired}
              value={review.note}
              onChange={review.setNote}
              maxLength={NOTE_MAX}
              placeholder={
                review.action === "approve"
                  ? "Add a note for the employee..."
                  : "Please explain why this request is being rejected..."
              }
            />
          </div>
        )}
      </ReviewDialog>
    </div>
  );
}
