import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  adminEmail: string;
  action: string;
  targetOrgId: string | null;
  targetOrgName: string | null;
  details: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; pill: string }> = {
  plan_change: { label: "Plan change", pill: "bg-blue-100 text-blue-700" },
  suspend: { label: "Suspended", pill: "bg-red-100 text-red-700" },
  reactivate: { label: "Reactivated", pill: "bg-emerald-100 text-emerald-700" },
  discount_apply: { label: "Discount applied", pill: "bg-amber-100 text-amber-700" },
  discount_remove: { label: "Discount removed", pill: "bg-[#F3F4F6] text-[#6B7280]" },
};

function ActionPill({ action }: { action: string }) {
  const meta = ACTION_LABELS[action] ?? { label: action, pill: "bg-[#F3F4F6] text-[#374151]" };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.pill}`}>
      {meta.label}
    </span>
  );
}

export default function BackofficeAuditLogPage() {
  const { data: logs = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/backoffice/audit-log"],
    staleTime: 15_000,
  });

  return (
    <BackofficeLayout title="Platform audit log">
      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[160px_1fr_140px_1fr_140px] px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">When</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Admin</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Action</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Organization</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Details</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[12.5px] text-[#9CA3AF]">
            No audit log entries yet.
          </div>
        ) : (
          logs.map((entry, i) => (
            <div
              key={entry.id}
              className={`grid grid-cols-[160px_1fr_140px_1fr_140px] px-5 py-3 border-b border-[#F9FAFB] items-center ${
                i % 2 === 1 ? "bg-[#FAFAFA]" : ""
              }`}
            >
              <span className="text-[11.5px] text-[#6B7280] tabular-nums">
                {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
              </span>
              <span className="text-[12.5px] text-[#374151] truncate pr-3">{entry.adminEmail}</span>
              <ActionPill action={entry.action} />
              <span className="text-[12.5px] font-medium text-[#111827] truncate pr-3">
                {entry.targetOrgName ?? <span className="text-[#9CA3AF]">—</span>}
              </span>
              <span className="text-[11.5px] text-[#6B7280] truncate">
                {entry.details ?? "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </BackofficeLayout>
  );
}
