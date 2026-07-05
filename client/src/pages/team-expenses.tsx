import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatMoney } from "@/lib/currency";
import { CheckCircle, XCircle, DollarSign, RefreshCw, AlertCircle } from "lucide-react";
import type { Expense } from "@shared/schema";

const NOTE_MAX = 500;

const TINTED_BTN =
  "bg-[#ECFDF5] dark:bg-[#059669]/15 text-[#059669] dark:text-[#34D399] border-[1.5px] border-[#A7F3D0] dark:border-[#059669]/30 hover:bg-[#D1FAE5] dark:hover:bg-[#059669]/25 font-semibold";
const DANGER_BTN =
  "bg-[#FEF2F2] dark:bg-[#DC2626]/15 text-[#DC2626] dark:text-[#F87171] border-[1.5px] border-[#FECACA] dark:border-[#DC2626]/30 hover:bg-[#FEE2E2] dark:hover:bg-[#DC2626]/25";

const CATEGORY_LABELS: Record<string, string> = {
  software: "Software",
  travel: "Travel",
  equipment: "Equipment",
  meals: "Meals",
  other: "Other",
};

function getUserInitials(expense: Expense & { userName?: string }): string {
  if (!expense.userName) return "?";
  const parts = expense.userName.split(" ");
  return parts.map(p => p[0] || "").join("").toUpperCase().slice(0, 2);
}

export default function TeamExpensesPage() {
  const [selectedExpense, setSelectedExpense] = useState<Expense & { userName?: string } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();

  const { data: rawExpenses, isLoading, isFetching, refetch } = useQuery<(Expense & { userName?: string })[]>({
    queryKey: ["/api/expenses?scope=team"],
    queryFn: async () => {
      const res = await fetch("/api/expenses?scope=team", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch team expenses");
      const list: Expense[] = await res.json();
      return list;
    },
  });

  const { data: usersData } = useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ["/api/users/basic"],
  });

  const getUserName = (userId: string) => {
    const u = usersData?.find(u => u.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : "Unknown";
  };

  const expenses = (rawExpenses || []).map(e => ({
    ...e,
    userName: getUserName(e.userId),
  }));

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/expenses/${id}/review`, {
        status,
        reviewNote: reviewNote || null,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses?scope=team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/pending-count"] });
      toast({
        title: variables.status === "approved" ? "Expense approved" : "Expense rejected",
        description: `The expense has been ${variables.status}.`,
      });
      setSelectedExpense(null);
      setReviewNote("");
      setActionType(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAction = (expense: Expense & { userName?: string }, action: "approve" | "reject") => {
    setSelectedExpense(expense);
    setActionType(action);
    setReviewNote("");
  };

  const confirmAction = () => {
    if (selectedExpense && actionType) {
      reviewMutation.mutate({
        id: selectedExpense.id,
        status: actionType === "approve" ? "approved" : "rejected",
      });
    }
  };

  const sort = (list: typeof expenses) =>
    [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const pending = sort(expenses.filter(e => e.status === "pending"));
  const approved = sort(expenses.filter(e => e.status === "approved"));
  const rejected = sort(expenses.filter(e => e.status === "rejected"));

  const bulk = useBulkSelection(pending);

  const renderCard = (expense: Expense & { userName?: string }, showActions = false) => (
    <div
      key={expense.id}
      className="px-[18px] py-3.5 border-b border-neutral-50 dark:border-white/5 last:border-b-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {showActions && (
            <Checkbox
              className="mt-1 h-4 w-4"
              checked={bulk.isSelected(expense.id)}
              onCheckedChange={c => bulk.setSelected(expense.id, c === true)}
              aria-label="Select expense"
            />
          )}
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#1C2230] border border-[#2A3545] text-[#8DAFC8] text-[10px] font-bold">
              {getUserInitials(expense)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">
              {expense.userName || "Unknown"}
            </p>
            <p className="text-[11.5px] text-neutral-400">
              {expense.expenseDate
                ? format(new Date(expense.expenseDate), "MMMM d, yyyy")
                : "No date"}
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="outline" className="text-[10.5px] text-neutral-500 border-neutral-200 dark:text-neutral-400 dark:border-white/15">
                {CATEGORY_LABELS[expense.category || "other"] || expense.category}
              </Badge>
              <Badge variant="outline" className="text-[10.5px] text-neutral-500 border-neutral-200 dark:text-neutral-400 dark:border-white/15">
                <DollarSign className="w-3 h-3 mr-0.5" />
                {formatMoney(expense.amount, expense.currency || "USD")}
              </Badge>
            </div>
            {expense.description && (
              <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-1.5 line-clamp-2">
                {expense.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={expense.status} />
          {showActions && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className={TINTED_BTN}
                onClick={() => handleAction(expense, "approve")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={DANGER_BTN}
                onClick={() => handleAction(expense, "reject")}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
      {expense.reviewNote && (
        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-2 pl-11">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">Note:</span>{" "}
          {expense.reviewNote}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6 flex flex-col gap-[18px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-normal text-neutral-900 dark:text-neutral-50 font-serif mb-0.5">
            Team expense reviews
          </h1>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            Approve or reject expense claims from your direct reports
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border-[1.5px] border-neutral-200 dark:border-white/10 bg-white dark:bg-card text-[12.5px] text-neutral-500 dark:text-neutral-400">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400" />
        <p>
          Approved expenses can be included as line items when contractors generate their monthly invoice.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejected.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : pending.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                    Pending expense claims
                  </div>
                  <div className="text-[11.5px] text-neutral-400">
                    Expenses from your team awaiting review
                  </div>
                </div>
                <span className="text-[11px] font-semibold bg-[#FFFBEB] dark:bg-[#D97706]/15 text-[#D97706] dark:text-[#FBBF24] px-2.5 py-1 rounded-full">
                  {pending.length} items
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
                  onCheckedChange={c => bulk.toggleAll(c === true)}
                  aria-label="Select all"
                />
                <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                  Select all on page
                </span>
              </div>
              <div>{pending.map(e => renderCard(e, true))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <DollarSign className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">
                No pending expenses
              </p>
              <p className="text-[12px] text-neutral-400 mt-1">
                All expense claims have been reviewed
              </p>
            </div>
          )}
          <BulkActionBar
            selectedIds={bulk.selectedArray}
            resourceLabel="expense"
            resourcePlural="expenses"
            endpoint="/api/expenses/bulk-review"
            onAfterSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/expenses?scope=team"] });
              queryClient.invalidateQueries({ queryKey: ["/api/expenses/pending-count"] });
            }}
            onClear={bulk.clear}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : approved.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                  Approved expenses
                </div>
                <div className="text-[11.5px] text-neutral-400">
                  Expense claims that have been approved
                </div>
              </div>
              <div>{approved.map(e => renderCard(e))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">
                No approved expenses
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : rejected.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                  Rejected expenses
                </div>
                <div className="text-[11.5px] text-neutral-400">
                  Expense claims that were not approved
                </div>
              </div>
              <div>{rejected.map(e => renderCard(e))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <XCircle className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">
                No rejected expenses
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedExpense}
        onOpenChange={() => {
          setSelectedExpense(null);
          setReviewNote("");
          setActionType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve expense" : "Reject expense"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Confirm approval of this expense claim."
                : "Please provide a reason for rejecting this expense."}
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-md bg-muted/50 space-y-2">
                <p className="font-medium">{selectedExpense.userName}</p>
                <p className="text-sm text-muted-foreground">
                  {CATEGORY_LABELS[selectedExpense.category || "other"] || selectedExpense.category}
                  {" · "}
                  {formatMoney(selectedExpense.amount, selectedExpense.currency || "USD")}
                </p>
                {selectedExpense.description && (
                  <p className="text-sm text-muted-foreground">{selectedExpense.description}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {actionType === "approve" ? "Note (optional)" : "Reason for rejection"}
                </label>
                <Textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value.slice(0, NOTE_MAX))}
                  placeholder={
                    actionType === "approve"
                      ? "Add a note..."
                      : "Please explain why this expense is being rejected..."
                  }
                  rows={3}
                  className="resize-none"
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
                setSelectedExpense(null);
                setReviewNote("");
                setActionType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={
                reviewMutation.isPending ||
                (actionType === "reject" && !reviewNote)
              }
            >
              {reviewMutation.isPending
                ? "Processing..."
                : actionType === "approve"
                ? "Approve expense"
                : "Reject expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
