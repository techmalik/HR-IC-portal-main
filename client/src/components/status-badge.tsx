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
      case "paid":
      case "completed":
      case "active":
        return "bg-[#ECFDF5] text-[#059669] dark:bg-[#059669]/15 dark:text-[#34D399] border-transparent";
      case "pending":
      case "pending_review":
      case "submitted":
      case "ic_submitted":
      case "manager_submitted":
        return "bg-[#FFFBEB] text-[#D97706] dark:bg-[#D97706]/15 dark:text-[#FBBF24] border-transparent";
      case "rejected":
      case "declined":
      case "suspended":
        return "bg-[#FEF2F2] text-[#DC2626] dark:bg-[#DC2626]/15 dark:text-[#F87171] border-transparent";
      case "revision_requested":
        return "bg-[#FFFBEB] text-[#D97706] dark:bg-[#D97706]/15 dark:text-[#FBBF24] border-transparent";
      case "invited":
        return "bg-[#F3F4F6] text-[#374151] dark:bg-white/10 dark:text-neutral-300 border-transparent";
      case "draft":
      case "open":
        return "bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB] dark:bg-transparent dark:border-white/15 dark:text-neutral-400";
      default:
        return "bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB] dark:bg-transparent dark:border-white/15 dark:text-neutral-400";
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
    if (statusLower === "ic_submitted") {
      return "IC Submitted";
    }
    if (statusLower === "manager_submitted") {
      return "Manager Reviewed";
    }
    return status;
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[12px] font-medium rounded-full px-3 py-[3px] border",
        getStatusStyles(),
        className
      )}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {getDisplayStatus()}
    </Badge>
  );
}
