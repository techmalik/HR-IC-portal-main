import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, Download, Trash2, Plus, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/currency";
import type { Invoice } from "@shared/schema";

interface InvoiceListProps {
  invoices: Invoice[];
  onDelete: (invoice: Invoice) => void;
  onOpenDialog: () => void;
}

export function InvoiceList({ invoices, onDelete, onOpenDialog }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <Card data-testid="tour-target-invoice-list">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground" data-testid="tour-target-invoice-status">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No invoices uploaded</p>
            <p className="mt-1">Upload your first invoice to get started</p>
            <Button
              className="mt-4"
              onClick={onOpenDialog}
              data-testid="button-first-invoice"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="tour-target-invoice-list">
      <CardHeader>
        <CardTitle className="text-base">All Invoices</CardTitle>
        <CardDescription>Your uploaded invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice, index) => (
            <InvoiceListItem
              key={invoice.id}
              invoice={invoice}
              index={index}
              onDelete={onDelete}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface InvoiceListItemProps {
  invoice: Invoice;
  index: number;
  onDelete: (invoice: Invoice) => void;
}

function InvoiceListItem({ invoice, index, onDelete }: InvoiceListItemProps) {
  const handleView = () => {
    if (invoice.fileUrl) {
      const filename = invoice.fileName || "invoice.pdf";
      let urlStr = invoice.fileUrl;
      if (!invoice.fileUrl.startsWith("http")) {
        const url = new URL(invoice.fileUrl, window.location.origin);
        url.searchParams.set("filename", filename);
        urlStr = url.toString();
      }
      window.open(urlStr, "_blank");
    }
  };

  const handleDownload = () => {
    if (invoice.fileUrl) {
      const filename = invoice.fileName || "invoice.pdf";
      let urlStr = invoice.fileUrl;
      if (!invoice.fileUrl.startsWith("http")) {
        const url = new URL(invoice.fileUrl, window.location.origin);
        url.searchParams.set("filename", filename);
        url.searchParams.set("download", "true");
        urlStr = url.toString();
      }
      const link = document.createElement("a");
      link.href = urlStr;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      className="flex flex-col p-4 rounded-md bg-muted/50 gap-2"
      data-testid={`invoice-${invoice.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{invoice.fileName}</p>
              <StatusBadge status={invoice.status || "pending_review"} />
            </div>
            <p className="text-xs text-muted-foreground">
              {invoice.invoiceNumber && `${invoice.invoiceNumber} - `}
              {format(new Date(invoice.year, invoice.month - 1), "MMMM yyyy")} -{" "}
              {format(new Date(invoice.uploadedAt!), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-3"
          data-testid={index === 0 ? "tour-target-invoice-status" : undefined}
        >
          {invoice.amount && (
            <span className="font-semibold text-lg" data-testid={`amount-${invoice.id}`}>
              {formatMoney(invoice.amount, invoice.currency)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleView}
            data-testid={`button-view-${invoice.id}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            data-testid={`button-download-${invoice.id}`}
          >
            <Download className="w-4 h-4" />
          </Button>
          {invoice.status !== "approved" && invoice.status !== "paid" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(invoice)}
              data-testid={`button-delete-${invoice.id}`}
              title={
                invoice.status === "revision_requested"
                  ? "Delete to upload revised invoice"
                  : "Delete invoice"
              }
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {invoice.status === "rejected" && invoice.reviewNote && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Rejection Reason</p>
            <p
              className="text-sm text-destructive/80"
              data-testid={`rejection-note-${invoice.id}`}
            >
              {invoice.reviewNote}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can delete this invoice and resubmit with corrections.
            </p>
          </div>
        </div>
      )}
      {invoice.status === "revision_requested" && invoice.reviewNote && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
          <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Revision Requested
            </p>
            <p
              className="text-sm text-orange-600/80 dark:text-orange-400/80"
              data-testid={`revision-note-${invoice.id}`}
            >
              {invoice.reviewNote}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please delete this invoice and upload an updated version with the requested changes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
