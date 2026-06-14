import { FileText, Send, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const STATUS_CONFIG = {
  draft: { label: "Draft", variant: "secondary" as const, icon: FileText },
  ic_submitted: { label: "IC Submitted", variant: "default" as const, icon: Send },
  manager_submitted: { label: "Manager Reviewed", variant: "default" as const, icon: CheckCircle2 },
  completed: { label: "Completed", variant: "default" as const, icon: CheckCircle2 },
};

export function getStatusBadge(status: string): JSX.Element {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
