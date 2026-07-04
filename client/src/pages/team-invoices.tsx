import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  FileText,
  ExternalLink,
  DollarSign,
  Calendar,
  Download,
  Edit,
  BadgeCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Invoice, Timesheet, DailyEntry, OOORequest } from "@shared/schema";
import { formatMoney } from "@/lib/currency";
import { APPROVE_BUTTON_CLASS as TINTED_BTN, REJECT_BUTTON_CLASS as DANGER_BTN } from "@/lib/utils";
import { openInvoiceFile, downloadInvoiceFile } from "@/lib/invoice-file";
import { getInitialsFromParts, getInitialsFromName } from "@/lib/initials";

import { CalendarOff } from "lucide-react";

type BasicUser = { id: string; firstName: string; lastName: string; };

interface InvoiceUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface InvoiceWithDetails extends Invoice {
  user: InvoiceUser | null;
  timesheet: Timesheet | null;
}

export default function TeamInvoicesPage() {
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithDetails | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceWithDetails | null>(null);
  const [paidDate, setPaidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentReference, setPaymentReference] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: pendingInvoices, isLoading: pendingLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/team/invoices"],
  });

  const { data: allInvoices, isLoading: allLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: entries, isLoading: entriesLoading } = useQuery<DailyEntry[]>({
    queryKey: ["/api/timesheets", viewingInvoice?.timesheet?.id, "entries"],
    enabled: !!viewingInvoice?.timesheet?.id,
  });

  // Fetch OOO requests for the contractor viewing
  const { data: oooRequests } = useQuery<OOORequest[]>({
    queryKey: ["/api/ooo-requests", { userId: viewingInvoice?.userId }],
    enabled: !!viewingInvoice?.userId,
  });

  const { data: basicUsers } = useQuery<BasicUser[]>({
    queryKey: ["/api/users/basic"],
  });

  const getUserName = (userId: string | null | undefined) => {
    if (!userId || !basicUsers) return null;
    const u = basicUsers.find(u => u.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : null;
  };

  // Filter approved OOO requests for the invoice month
  const approvedOOOForMonth = useMemo(() => {
    if (!oooRequests || !viewingInvoice) return [];
    
    const invoiceYear = viewingInvoice.year;
    const invoiceMonth = viewingInvoice.month;
    
    return oooRequests.filter((request) => {
      if (request.status !== "approved") return false;
      
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      
      // Check if any part of the OOO request overlaps with the invoice month
      const monthStart = new Date(invoiceYear, invoiceMonth - 1, 1);
      const monthEnd = new Date(invoiceYear, invoiceMonth, 0);
      
      return startDate <= monthEnd && endDate >= monthStart;
    });
  }, [oooRequests, viewingInvoice]);

  const invoiceStatusMap: Record<string, string> = {
    approve: "approved",
    reject: "rejected",
    request_revision: "revision_requested",
  };
  const invoiceToastTitles: Record<string, string> = {
    approved: "Invoice approved",
    rejected: "Invoice rejected",
    revision_requested: "Revision requested",
  };
  const invoiceToastDescriptions: Record<string, string> = {
    approved: "The invoice has been approved.",
    rejected: "The invoice has been rejected.",
    revision_requested: "The contractor has been notified to make changes.",
  };

  const review = useReviewAction<InvoiceWithDetails, "approve" | "reject" | "request_revision">({
    mutationFn: ({ item, action, note }) =>
      apiRequest("PATCH", `/api/invoices/${item.id}`, {
        status: invoiceStatusMap[action],
        reviewedBy: user?.id,
        reviewNote: note || null,
      }),
    invalidateKeys: [
      "/api/team/invoices",
      "/api/invoices",
      "/api/invoices/pending-count",
      "/api/team/timesheets",
      "/api/timesheets",
    ],
    noteRequiredForActions: ["reject", "request_revision"],
    getToast: (action) => {
      const status = invoiceStatusMap[action];
      return {
        title: invoiceToastTitles[status] || "Invoice updated",
        description: invoiceToastDescriptions[status] || `The invoice has been ${status}.`,
      };
    },
    errorMessage: "Failed to process invoice. Please try again.",
    onSuccess: () => setViewingInvoice(null),
  });

  const { weeklyGroups, summaryStats, collapsedWeeks, setCollapsedWeeks, toggleWeekCollapse, collapseAllWeeks } =
    useWeeklyEntries(entries);

  // Collapse all weeks by default when viewing an invoice
  useEffect(() => {
    if (weeklyGroups.length > 0) {
      collapseAllWeeks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyGroups]);

  const toggleEntryExpand = (entryId: string) => {
    setExpandedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const getContractorName = (invoice: InvoiceWithDetails | Invoice) => {
    if ("user" in invoice && invoice.user) {
      return `${invoice.user.firstName} ${invoice.user.lastName}`;
    }
    return invoice.contractorName || "Unknown";
  };

  const getContractorInitials = (invoice: InvoiceWithDetails | Invoice) => {
    if ("user" in invoice && invoice.user) {
      return getInitialsFromParts(invoice.user.firstName, invoice.user.lastName);
    }
    return getInitialsFromName(invoice.contractorName).slice(0, 2);
  };

  const formatAmount = (amount: number | null | undefined, currency?: string | null) => {
    if (amount === null || amount === undefined) return "N/A";
    return formatMoney(amount, currency);
  };

  const getPendingReviewInvoices = () => pendingInvoices?.filter((i) => i.status === "pending_review" || i.status === "revision_requested") || [];
  const bulkEligibleInvoices = pendingInvoices?.filter((i) => i.status === "pending_review" || i.status === "revision_requested") || [];
  const invoiceBulk = useBulkSelection(bulkEligibleInvoices);
  const approvedInvoices = allInvoices?.filter((i) => i.status === "approved") || [];
  const paidInvoices = allInvoices?.filter((i) => i.status === "paid") || [];
  const rejectedInvoices = allInvoices?.filter((i) => i.status === "rejected") || [];
  const revisionRequestedInvoices = allInvoices?.filter((i) => i.status === "revision_requested") || [];

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, paidAt, paymentReference: ref }: { id: string; paidAt: string; paymentReference: string }) => {
      return apiRequest("PATCH", `/api/invoices/${id}/mark-paid`, {
        paidAt,
        paymentReference: ref || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice marked as paid",
        description: "The invoice has been recorded as paid.",
      });
      setPayingInvoice(null);
      setPaymentReference("");
      setPaidDate(format(new Date(), "yyyy-MM-dd"));
    },
    onError: (e: Error) => {
      toast({
        title: "Error",
        description: e.message || "Failed to mark invoice as paid.",
        variant: "destructive",
      });
    },
  });

  const confirmMarkPaid = () => {
    if (!payingInvoice) return;
    markPaidMutation.mutate({
      id: payingInvoice.id,
      paidAt: paidDate,
      paymentReference: paymentReference.trim(),
    });
  };

  const renderInvoiceCard = (invoice: InvoiceWithDetails, showActions: boolean = false) => {
    return (
      <div
        key={invoice.id}
        className="px-[18px] py-3.5 border-b border-neutral-50 dark:border-white/5 last:border-b-0"
        data-testid={`invoice-card-${invoice.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {showActions && (invoice.status === "pending_review" || invoice.status === "revision_requested") && (
              <Checkbox
                className="mt-1 h-4 w-4"
                checked={invoiceBulk.isSelected(invoice.id)}
                onCheckedChange={(c) => invoiceBulk.setSelected(invoice.id, c === true)}
                data-testid={`select-invoice-${invoice.id}`}
                aria-label="Select invoice"
              />
            )}
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#1C2230] border border-[#2A3545] text-[#8DAFC8] text-[10px] font-bold">
                {getContractorInitials(invoice)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">{getContractorName(invoice)}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <p className="text-[11.5px] text-neutral-400">
                  #{invoice.invoiceNumber}
                </p>
                <span className="text-neutral-300">·</span>
                <p className="text-[11.5px] text-neutral-400">
                  {format(new Date(invoice.year, invoice.month - 1), "MMMM yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">
                  {formatAmount(invoice.amount, invoice.currency)}
                </p>
                {invoice.timesheet && (
                  <span className="text-[11px] text-neutral-400">
                    ({invoice.timesheet.totalHours}h linked)
                  </span>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={invoice.status === "pending_review" ? "pending" : invoice.status} />
        </div>
        {showActions && (
          <div className="flex gap-1.5 pt-2.5 pl-11 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewingInvoice(invoice)}
              data-testid={`button-view-invoice-${invoice.id}`}
            >
              Review details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={TINTED_BTN}
              onClick={() => review.start(invoice, "approve")}
              data-testid={`button-approve-${invoice.id}`}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => review.start(invoice, "request_revision")}
              data-testid={`button-revision-${invoice.id}`}
            >
              Request revision
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={DANGER_BTN}
              onClick={() => review.start(invoice, "reject")}
              data-testid={`button-reject-${invoice.id}`}
            >
              Reject
            </Button>
          </div>
        )}
        {invoice.reviewNote && (
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-2 pl-11">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Review note:</span> {invoice.reviewNote}
          </p>
        )}
      </div>
    );
  };

  const renderSimpleInvoiceCard = (invoice: InvoiceWithDetails) => {
    return (
      <div
        key={invoice.id}
        className="px-[18px] py-3.5 border-b border-neutral-50 dark:border-white/5 last:border-b-0"
        data-testid={`invoice-card-${invoice.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#1C2230] border border-[#2A3545] text-[#8DAFC8] text-[10px] font-bold">
                {getContractorInitials(invoice)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">{getContractorName(invoice)}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <p className="text-[11.5px] text-neutral-400">
                  #{invoice.invoiceNumber}
                </p>
                <span className="text-neutral-300">·</span>
                <p className="text-[11.5px] text-neutral-400">
                  {format(new Date(invoice.year, invoice.month - 1), "MMMM yyyy")}
                </p>
              </div>
              <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50 mt-1">
                {formatAmount(invoice.amount, invoice.currency)}
              </p>
            </div>
          </div>
          <StatusBadge status={invoice.status === "pending_review" ? "pending" : invoice.status} />
        </div>
        <div className="flex gap-1.5 pt-2.5 pl-11 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewingInvoice(invoice)}
            data-testid={`button-view-invoice-${invoice.id}`}
          >
            View details
          </Button>
          {invoice.fileUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadInvoiceFile(invoice.fileUrl, invoice.fileName)}
              data-testid={`button-download-invoice-${invoice.id}`}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
          {isAdmin && invoice.status === "approved" && (
            <Button
              size="sm"
              variant="ghost"
              className={TINTED_BTN}
              onClick={() => {
                setPayingInvoice(invoice);
                setPaidDate(format(new Date(), "yyyy-MM-dd"));
                setPaymentReference("");
              }}
              data-testid={`button-mark-paid-${invoice.id}`}
            >
              <BadgeCheck className="w-4 h-4 mr-1" />
              Mark as paid
            </Button>
          )}
        </div>
        {invoice.status === "paid" && invoice.paidAt && (
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-2 pl-11">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Paid</span>{" "}
            on {format(new Date(invoice.paidAt), "MMM d, yyyy")}
            {invoice.paymentReference && (
              <> · Ref: <span className="font-mono">{invoice.paymentReference}</span></>
            )}
            {invoice.paidBy && getUserName(invoice.paidBy) && (
              <> · by {getUserName(invoice.paidBy)}</>
            )}
          </p>
        )}
        {invoice.reviewNote && (
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-2 pl-11">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Review note:</span> {invoice.reviewNote}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 flex flex-col gap-[18px]">
      <div>
        <h1 className="text-xl font-normal text-neutral-900 dark:text-neutral-50 font-serif mb-0.5" data-testid="text-page-title">Team invoices</h1>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Review and approve contractor invoice submissions
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({getPendingReviewInvoices().length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="paid" data-testid="tab-paid">
            Paid ({paidInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected ({rejectedInvoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : getPendingReviewInvoices().length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Pending review</div>
                  <div className="text-[11.5px] text-neutral-400">Invoices awaiting your approval</div>
                </div>
                <span className="text-[11px] font-semibold bg-[#FFFBEB] dark:bg-[#D97706]/15 text-[#D97706] dark:text-[#FBBF24] px-2.5 py-1 rounded-full">
                  {getPendingReviewInvoices().length} items
                </span>
              </div>
              {bulkEligibleInvoices.length > 0 && (
                <div className="flex items-center gap-2 px-[18px] py-2.5 border-b border-neutral-100 dark:border-white/10 bg-[#F9FAFB] dark:bg-white/5">
                  <Checkbox
                    checked={
                      invoiceBulk.allVisibleSelected
                        ? true
                        : invoiceBulk.someVisibleSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={(c) => invoiceBulk.toggleAll(c === true)}
                    data-testid="select-all-invoices"
                    aria-label="Select all"
                  />
                  <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                    Select all eligible on page
                  </span>
                </div>
              )}
              <div>{getPendingReviewInvoices().map((invoice) => renderInvoiceCard(invoice, true))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No pending invoices</p>
              <p className="text-[12px] text-neutral-400 mt-1">All invoices have been reviewed</p>
            </div>
          )}
          <BulkActionBar
            selectedIds={invoiceBulk.selectedArray}
            resourceLabel="invoice"
            endpoint="/api/invoices/bulk-review"
            onAfterSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/team/invoices"] });
              queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
              queryClient.invalidateQueries({ queryKey: ["/api/invoices/pending-count"] });
              queryClient.invalidateQueries({ queryKey: ["/api/team/timesheets"] });
              queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
            }}
            onClear={invoiceBulk.clear}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {allLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : approvedInvoices.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Approved invoices</div>
                <div className="text-[11.5px] text-neutral-400">Invoices that have been approved</div>
              </div>
              <div>{approvedInvoices.map((invoice) => renderSimpleInvoiceCard(invoice))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No approved invoices</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          {allLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : paidInvoices.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Paid invoices</div>
                <div className="text-[11.5px] text-neutral-400">Invoices that have been paid out</div>
              </div>
              <div>{paidInvoices.map((invoice) => renderSimpleInvoiceCard(invoice))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <BadgeCheck className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No paid invoices yet</p>
              <p className="text-[12px] text-neutral-400 mt-1">Approved invoices marked as paid will appear here</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {allLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : rejectedInvoices.length > 0 ? (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
                <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Rejected invoices</div>
                <div className="text-[11.5px] text-neutral-400">Invoices that were not approved</div>
              </div>
              <div>{rejectedInvoices.map((invoice) => renderSimpleInvoiceCard(invoice))}</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl py-14 text-center">
              <XCircle className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">No rejected invoices</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ReviewDialog
        open={review.isOpen}
        onOpenChange={() => review.close()}
        title={
          review.action === "approve"
            ? "Approve Invoice"
            : review.action === "request_revision"
            ? "Request Invoice Revision"
            : "Reject Invoice"
        }
        description={
          review.action === "approve"
            ? "Confirm that you want to approve this invoice."
            : review.action === "request_revision"
            ? "Request changes to this invoice. The contractor will be notified and can update and resubmit."
            : "Please provide a reason for rejecting this invoice."
        }
        confirmLabel={
          review.action === "approve"
            ? "Approve Invoice"
            : review.action === "request_revision"
            ? "Request Revision"
            : "Reject Invoice"
        }
        confirmVariant={review.action === "approve" ? "default" : review.action === "request_revision" ? "outline" : "destructive"}
        isPending={review.isPending}
        confirmDisabled={!review.canConfirm}
        onConfirm={review.confirm}
        onCancel={review.close}
      >
        {review.item && (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-md bg-muted/50">
              <p className="font-medium">
                {getContractorName(review.item)} - #{review.item.invoiceNumber}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(review.item.year, review.item.month - 1), "MMMM yyyy")}
              </p>
              <p className="text-sm font-medium mt-1">
                Amount: {formatAmount(review.item.amount, review.item.currency)}
              </p>
            </div>
            <ReviewNoteField
              label={
                review.action === "approve"
                  ? "Note (optional)"
                  : review.action === "request_revision"
                  ? "What changes are needed?"
                  : "Reason for rejection"
              }
              required={review.noteRequired}
              value={review.note}
              onChange={review.setNote}
              placeholder={
                review.action === "approve"
                  ? "Add a note for the contractor..."
                  : review.action === "request_revision"
                  ? "Please describe what changes are needed in the invoice..."
                  : "Please explain why this invoice is being rejected..."
              }
            />
          </div>
        )}
      </ReviewDialog>

      <Dialog open={!!payingInvoice} onOpenChange={(open) => { if (!open) { setPayingInvoice(null); setPaymentReference(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-mark-paid-title">Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Record the payment date and an optional reference (e.g., wire confirmation, transaction ID).
            </DialogDescription>
          </DialogHeader>
          {payingInvoice && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-md bg-muted/50">
                <p className="font-medium">
                  {getContractorName(payingInvoice)} - #{payingInvoice.invoiceNumber}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(payingInvoice.year, payingInvoice.month - 1), "MMMM yyyy")}
                </p>
                <p className="text-sm font-medium mt-1">
                  Amount: {formatAmount(payingInvoice.amount, payingInvoice.currency)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid-date">Payment date</Label>
                <Input
                  id="paid-date"
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  data-testid="input-paid-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-reference">Payment reference (optional)</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. WIRE-2026-001234"
                  maxLength={200}
                  data-testid="input-payment-reference"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => { setPayingInvoice(null); setPaymentReference(""); }}
              data-testid="button-cancel-mark-paid"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmMarkPaid}
              disabled={markPaidMutation.isPending || !paidDate}
              data-testid="button-confirm-mark-paid"
            >
              {markPaidMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><BadgeCheck className="w-4 h-4 mr-1" />Mark as Paid</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingInvoice} onOpenChange={() => { setViewingInvoice(null); setCollapsedWeeks(new Set()); setExpandedEntries(new Set()); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="min-w-0 overflow-hidden">
            <DialogTitle data-testid="text-view-dialog-title" className="truncate">
              Invoice Details - {viewingInvoice && getContractorName(viewingInvoice)}
            </DialogTitle>
            <DialogDescription className="truncate">
              #{viewingInvoice?.invoiceNumber} - {viewingInvoice && format(new Date(viewingInvoice.year, viewingInvoice.month - 1), "MMMM yyyy")}
            </DialogDescription>
          </DialogHeader>
          
          {viewingInvoice && (
            <div className="space-y-4 min-w-0">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-muted/50 min-w-0">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">{formatAmount(viewingInvoice.amount, viewingInvoice.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={viewingInvoice.status === "pending_review" ? "pending" : viewingInvoice.status} />
                </div>
              </div>

              {viewingInvoice.status === "paid" && viewingInvoice.paidAt && (
                <div className="p-4 rounded-md bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BadgeCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-sm">Payment Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Paid on</p>
                      <p className="font-medium">{format(new Date(viewingInvoice.paidAt), "MMM d, yyyy")}</p>
                    </div>
                    {viewingInvoice.paymentReference && (
                      <div>
                        <p className="text-xs text-muted-foreground">Reference</p>
                        <p className="font-medium font-mono break-all">{viewingInvoice.paymentReference}</p>
                      </div>
                    )}
                    {viewingInvoice.paidBy && getUserName(viewingInvoice.paidBy) && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Marked paid by</p>
                        <p className="font-medium">{getUserName(viewingInvoice.paidBy)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewingInvoice.fileUrl && (
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => openInvoiceFile(viewingInvoice.fileUrl, viewingInvoice.fileName)}
                    data-testid="link-view-file"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View Invoice File
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => downloadInvoiceFile(viewingInvoice.fileUrl, viewingInvoice.fileName)}
                    data-testid="button-download-invoice"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-0 truncate">{viewingInvoice.fileName}</span>
                </div>
              )}

              {viewingInvoice.timesheet && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">Linked Timesheet</span>
                    <StatusBadge status={viewingInvoice.timesheet.status} />
                    {viewingInvoice.timesheet.status === "approved" && viewingInvoice.timesheet.reviewedBy && getUserName(viewingInvoice.timesheet.reviewedBy) && (
                      <span className="text-xs text-muted-foreground">
                        Approved by <span className="font-medium text-foreground">{getUserName(viewingInvoice.timesheet.reviewedBy)}</span>
                      </span>
                    )}
                  </div>
                  
                  {summaryStats && (
                    <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-muted/50">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total Hours</p>
                        <p className="font-semibold">{summaryStats.totalHours}h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Days Worked</p>
                        <p className="font-semibold">{summaryStats.daysWorked}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
                        <p className="font-semibold">{summaryStats.avgHoursPerDay}h</p>
                      </div>
                    </div>
                  )}

                  {approvedOOOForMonth.length > 0 && (
                    <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
                          Out of Office ({approvedOOOForMonth.length} {approvedOOOForMonth.length === 1 ? 'request' : 'requests'})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {approvedOOOForMonth.map((request) => (
                          <div key={request.id} className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                            <span>
                              {format(new Date(request.startDate), "MMM d")}
                              {request.startDate !== request.endDate && ` - ${format(new Date(request.endDate), "MMM d")}`}
                            </span>
                            {request.oooType === "half_day" && (
                              <span className="text-amber-600 dark:text-amber-400">(Half day)</span>
                            )}
                            {request.reason && (
                              <span className="text-amber-600/70 dark:text-amber-400/70 truncate">- {request.reason}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                    <WeeklyEntriesViewer
                      isLoading={entriesLoading}
                      weeklyGroups={weeklyGroups}
                      collapsedWeeks={collapsedWeeks}
                      onToggleWeek={toggleWeekCollapse}
                      expandedEntries={expandedEntries}
                      onToggleEntry={toggleEntryExpand}
                    />
                  </div>
                </div>
              )}

              {!viewingInvoice.timesheet && (
                <div className="text-sm text-muted-foreground p-3 rounded-md bg-muted/50">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  No timesheet linked to this invoice
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setViewingInvoice(null)}
              data-testid="button-close-view"
            >
              Close
            </Button>
            {viewingInvoice?.status === "pending_review" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingInvoice(null);
                    review.start(viewingInvoice!, "reject");
                  }}
                  data-testid="button-reject-from-view"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setViewingInvoice(null);
                    review.start(viewingInvoice!, "approve");
                  }}
                  data-testid="button-approve-from-view"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </>
            )}
            {viewingInvoice?.status === "approved" && isAdmin && (
              <Button
                onClick={() => {
                  const inv = viewingInvoice!;
                  setViewingInvoice(null);
                  setPayingInvoice(inv);
                  setPaidDate(format(new Date(), "yyyy-MM-dd"));
                  setPaymentReference("");
                }}
                data-testid="button-mark-paid-from-view"
              >
                <BadgeCheck className="w-4 h-4 mr-1" />
                Mark as Paid
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
