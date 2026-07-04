import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatMoney, normalizeCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { trackFirst } from "@/lib/analytics";
import type { Expense, User } from "@shared/schema";
import { ExpenseCategory } from "@shared/schema";
import {
  Plus,
  Receipt,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  AlertCircle,
} from "lucide-react";

type ExpenseWithUser = Expense & { userName?: string; userEmail?: string };

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: ExpenseCategory.SOFTWARE, label: "Software" },
  { value: ExpenseCategory.TRAVEL, label: "Travel" },
  { value: ExpenseCategory.EQUIPMENT, label: "Equipment" },
  { value: ExpenseCategory.OTHER, label: "Other" },
];

const MAX_RECEIPT_BYTES = 7 * 1024 * 1024;

function categoryLabel(category: string): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userCurrency = normalizeCurrency(user?.currency);

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isSupervisor = isAdmin || !!user?.hasDirectReports;

  const [tab, setTab] = useState<string>(isSupervisor ? "team" : "mine");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(ExpenseCategory.SOFTWARE);
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reviewExpense, setReviewExpense] = useState<ExpenseWithUser | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);

  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Mine
  const { data: myExpenses, isLoading: myLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?userId=${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Approval queue. Admins see org-wide expenses; managers see only the
  // expenses for which they are the reviewing manager.
  const teamScopeKey = isAdmin ? "all" : "team";
  const { data: teamExpenses, isLoading: teamLoading } = useQuery<ExpenseWithUser[]>({
    queryKey: ["/api/expenses", { scope: teamScopeKey }],
    queryFn: async () => {
      const url = isAdmin ? `/api/expenses` : `/api/expenses?scope=team`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses queue");
      return res.json();
    },
    enabled: !!user?.id && isSupervisor,
  });

  // For decorating team list with names. Admins use /api/users; non-admin
  // supervisors fall back to their direct team members endpoint.
  const { data: orgUsers } = useQuery<User[]>({
    queryKey: [isAdmin ? "/api/users" : "/api/team/members"],
    queryFn: async () => {
      const url = isAdmin ? "/api/users" : "/api/team/members";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id && isSupervisor,
  });

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    (orgUsers || []).forEach((u) => m.set(u.id, u));
    return m;
  }, [orgUsers]);

  const teamPending = useMemo(
    () => (teamExpenses || []).filter((e) => e.status === "pending"),
    [teamExpenses]
  );
  const expenseBulk = useBulkSelection(teamPending);
  const teamReviewed = useMemo(
    () => (teamExpenses || []).filter((e) => e.status !== "pending"),
    [teamExpenses]
  );

  const resetForm = () => {
    setAmount("");
    setCategory(ExpenseCategory.SOFTWARE);
    setDescription("");
    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let receiptUrl: string | null = null;
      let receiptFileName: string | null = null;
      if (receiptFile) {
        if (receiptFile.size > MAX_RECEIPT_BYTES) {
          throw new Error("Receipt file is too large (max 7MB).");
        }
        receiptFileName = receiptFile.name;
        receiptUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(receiptFile);
        });
      }
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new Error("Amount must be a positive number.");
      }
      if (!description.trim()) throw new Error("Description is required.");

      const res = await apiRequest("POST", "/api/expenses", {
        amount: amountCents,
        currency: userCurrency,
        category,
        description: description.trim(),
        expenseDate,
        receiptUrl,
        receiptFileName,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/pending-count"] });
      trackFirst("first_expense_submitted");
      toast({
        title: "Expense submitted",
        description: "Your expense was sent to your manager for review.",
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to submit",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (params: { id: string; status: "approved" | "rejected"; reviewNote?: string }) => {
      const res = await apiRequest("PATCH", `/api/expenses/${params.id}/review`, {
        status: params.status,
        reviewNote: params.reviewNote,
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/pending-count"] });
      toast({
        title: variables.status === "approved" ? "Expense approved" : "Expense rejected",
      });
      setReviewExpense(null);
      setReviewNote("");
      setPendingAction(null);
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "Could not update the expense.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted" });
      setExpenseToDelete(null);
    },
    onError: () => {
      toast({
        title: "Failed to delete",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = () => {
    if (!reviewExpense || !pendingAction) return;
    reviewMutation.mutate({
      id: reviewExpense.id,
      status: pendingAction === "approve" ? "approved" : "rejected",
      reviewNote: reviewNote.trim() || undefined,
    });
  };

  const renderMyExpenseRow = (e: Expense, index: number) => (
    <div
      key={e.id}
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border last:border-b-0",
        index % 2 === 1 && "bg-[#FAFAFA]"
      )}
      data-testid={`my-expense-${e.id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-[13px] text-foreground truncate">{e.description}</p>
          <StatusBadge status={e.status} />
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          {categoryLabel(e.category)} &middot; {format(new Date(e.expenseDate), "MMM d, yyyy")}
          {e.reviewNote && (
            <span className="ml-2 italic">Note. {e.reviewNote}</span>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-[13px] text-foreground">{formatMoney(e.amount, e.currency)}</p>
        <div className="flex gap-1 justify-end mt-1">
          {e.receiptUrl && (
            <Button asChild variant="ghost" size="sm" data-testid={`view-receipt-${e.id}`}>
              <a href={e.receiptUrl} target="_blank" rel="noreferrer">
                <Eye className="w-4 h-4" />
              </a>
            </Button>
          )}
          {e.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpenseToDelete(e)}
              data-testid={`delete-expense-${e.id}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderTeamExpenseRow = (e: ExpenseWithUser) => {
    const submitter = userMap.get(e.userId);
    const submitterName = submitter
      ? `${submitter.firstName} ${submitter.lastName}`
      : e.userName || "Contractor";
    const initials = submitterName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    const isPending = e.status === "pending";
    return (
      <div
        key={e.id}
        className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border last:border-b-0"
        data-testid={`team-expense-${e.id}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isPending && (
            <Checkbox
              className="h-5 w-5"
              checked={expenseBulk.isSelected(e.id)}
              onCheckedChange={(c) => expenseBulk.setSelected(e.id, c === true)}
              data-testid={`select-expense-${e.id}`}
              aria-label="Select expense"
            />
          )}
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[#111827] text-white text-sm">{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-[13px] text-foreground truncate">
              {submitterName} <span className="text-muted-foreground font-normal">, {e.description}</span>
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              {categoryLabel(e.category)} &middot; {format(new Date(e.expenseDate), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[13px] text-foreground">{formatMoney(e.amount, e.currency)}</p>
          {e.status === "pending" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReviewExpense(e);
                  setPendingAction("approve");
                  setReviewNote("");
                }}
                data-testid={`approve-expense-${e.id}`}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReviewExpense(e);
                  setPendingAction("reject");
                  setReviewNote("");
                }}
                data-testid={`reject-expense-${e.id}`}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          ) : (
            <StatusBadge status={e.status} />
          )}
          {e.receiptUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={e.receiptUrl} target="_blank" rel="noreferrer" data-testid={`team-receipt-${e.id}`}>
                <Eye className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-[22px] font-normal text-foreground mb-1">Expenses</h1>
          <p className="text-[13px] text-muted-foreground">
            Submit reimbursable expenses and review your team's requests.
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-new-expense">
              <Plus className="w-4 h-4 mr-1" /> Submit Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit Expense</DialogTitle>
              <DialogDescription>
                Send a reimbursable expense to your manager for approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="exp-amount">Amount ({userCurrency})</Label>
                  <Input
                    id="exp-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-11 text-base"
                    data-testid="input-expense-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="exp-date">Date</Label>
                  <Input
                    id="exp-date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    data-testid="input-expense-date"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="exp-cat">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="exp-cat" data-testid="select-expense-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="exp-desc">Description</Label>
                <Textarea
                  id="exp-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this expense for?"
                  rows={3}
                  data-testid="input-expense-description"
                />
              </div>
              <div>
                <Label htmlFor="exp-receipt">Receipt (optional, max 7MB)</Label>
                <Input
                  id="exp-receipt"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="h-11 text-base file:mr-2"
                  data-testid="input-expense-receipt"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tap to take a photo of your receipt or pick one from your library.
                </p>
                {receiptFile && receiptFile.type.startsWith("image/") && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(receiptFile)}
                      alt="Receipt preview"
                      className="max-h-48 w-auto rounded border object-contain"
                      onLoad={(e) =>
                        URL.revokeObjectURL((e.target as HTMLImageElement).src)
                      }
                      data-testid="img-receipt-preview"
                    />
                  </div>
                )}
                {receiptFile && !receiptFile.type.startsWith("image/") && (
                  <p className="mt-2 text-xs text-muted-foreground break-all">
                    Selected: {receiptFile.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                data-testid="button-submit-expense"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {isSupervisor && (
            <TabsTrigger value="team" data-testid="tab-team-expenses">
              Approval Queue
              {teamPending.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold rounded-full bg-[#FFFBEB] text-[#D97706]">
                  {teamPending.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="mine" data-testid="tab-my-expenses">My Expenses</TabsTrigger>
        </TabsList>

        {isSupervisor && (
          <TabsContent value="team" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Approvals</CardTitle>
                <CardDescription>
                  {teamPending.length} expense{teamPending.length === 1 ? "" : "s"} waiting for review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : teamPending.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b">
                      <Checkbox
                        checked={
                          expenseBulk.allVisibleSelected
                            ? true
                            : expenseBulk.someVisibleSelected
                            ? "indeterminate"
                            : false
                        }
                        onCheckedChange={(c) => expenseBulk.toggleAll(c === true)}
                        data-testid="select-all-expenses"
                        aria-label="Select all"
                      />
                      <span className="text-sm text-muted-foreground">Select all on page</span>
                    </div>
                    <div className="space-y-2">{teamPending.map(renderTeamExpenseRow)}</div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No expenses pending your review.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {teamReviewed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recently Reviewed</CardTitle>
                  <CardDescription>Decisions you've made on team expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {teamReviewed.slice(0, 25).map(renderTeamExpenseRow)}
                  </div>
                </CardContent>
              </Card>
            )}
            <BulkActionBar
              selectedIds={expenseBulk.selectedArray}
              resourceLabel="expense"
              endpoint="/api/expenses/bulk-review"
              onAfterSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
                queryClient.invalidateQueries({ queryKey: ["/api/expenses/pending-count"] });
              }}
              onClear={expenseBulk.clear}
            />
          </TabsContent>
        )}

        <TabsContent value="mine" className="mt-4 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
              <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Total submitted</div>
              <div className="text-[26px] font-bold text-foreground leading-none">
                {formatMoney((myExpenses || []).reduce((s, e) => s + e.amount, 0), userCurrency)}
              </div>
              <div className="text-xs mt-1.5 font-medium text-muted-foreground">{(myExpenses || []).length} expenses</div>
            </div>
            <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
              <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Pending review</div>
              <div className="text-[26px] font-bold text-foreground leading-none">
                {(myExpenses || []).filter((e) => e.status === "pending").length}
              </div>
              <div className="text-xs mt-1.5 font-medium text-[#D97706]">awaiting manager</div>
            </div>
            <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
              <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Approved</div>
              <div className="text-[26px] font-bold text-foreground leading-none">
                {formatMoney(
                  (myExpenses || []).filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0),
                  userCurrency
                )}
              </div>
              <div className="text-xs mt-1.5 font-medium text-[#059669]">ready to invoice</div>
            </div>
          </div>

          <div className="bg-card border-[1.5px] border-card-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <span className="text-[13.5px] font-semibold text-foreground">My submitted expenses</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Approved expenses can be auto-added as line items when generating an invoice for the same month.
              </p>
            </div>
            {myLoading ? (
              <div className="p-5 space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (myExpenses || []).length > 0 ? (
              <div>{(myExpenses || []).map(renderMyExpenseRow)}</div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>You haven't submitted any expenses yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!reviewExpense}
        onOpenChange={(open) => {
          if (!open) {
            setReviewExpense(null);
            setReviewNote("");
            setPendingAction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "approve" ? "Approve" : "Reject"} expense
            </DialogTitle>
            <DialogDescription>
              {reviewExpense && (
                <>
                  {formatMoney(reviewExpense.amount, reviewExpense.currency)},{" "}
                  {categoryLabel(reviewExpense.category)} on{" "}
                  {format(new Date(reviewExpense.expenseDate), "MMM d, yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {reviewExpense?.description && (
              <div className="text-sm bg-muted/50 rounded-md p-3">{reviewExpense.description}</div>
            )}
            <div>
              <Label htmlFor="review-note">
                {pendingAction === "approve" ? "Note (optional)" : "Reason (optional)"}
              </Label>
              <Textarea
                id="review-note"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                data-testid="input-review-note"
              />
            </div>
            {pendingAction === "reject" && (
              <div className="flex items-start gap-2 text-xs text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] rounded-md p-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>The contractor will be notified about the rejection.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewExpense(null);
                setPendingAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewMutation.isPending}
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirm {pendingAction === "approve" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!expenseToDelete}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The expense will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => expenseToDelete && deleteMutation.mutate(expenseToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
