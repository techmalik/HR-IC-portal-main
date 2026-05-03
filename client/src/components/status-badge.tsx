import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "paid":
        return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30";
      case "pending":
      case "pending_review":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      case "revision_requested":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      case "draft":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
      case "submitted":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "completed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getDisplayStatus = () => {
    const statusLower = status.toLowerCase();
    if (statusLower === "pending_review") {
      return "Pending Review";
    }
    if (statusLower === "revision_requested") {
      return "Revision Requested";
    }
    return status;
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium uppercase tracking-wide border",
        getStatusStyles(),
        className
      )}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {getDisplayStatus()}
    </Badge>
  );
}
