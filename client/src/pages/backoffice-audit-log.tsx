import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Loader2, Search, X } from "lucide-react";
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

interface Tenant {
  id: string;
  name: string;
}

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "plan_change", label: "Plan change" },
  { value: "suspend", label: "Suspended" },
  { value: "reactivate", label: "Reactivated" },
  { value: "discount_apply", label: "Discount applied" },
  { value: "discount_remove", label: "Discount removed" },
];

const ACTION_PILLS: Record<string, string> = {
  plan_change: "bg-blue-100 text-blue-700",
  suspend: "bg-red-100 text-red-700",
  reactivate: "bg-emerald-100 text-emerald-700",
  discount_apply: "bg-amber-100 text-amber-700",
  discount_remove: "bg-[#F3F4F6] text-[#6B7280]",
};

const ACTION_LABELS: Record<string, string> = {
  plan_change: "Plan change",
  suspend: "Suspended",
  reactivate: "Reactivated",
  discount_apply: "Discount applied",
  discount_remove: "Discount removed",
};

function ActionPill({ action }: { action: string }) {
  const pill = ACTION_PILLS[action] ?? "bg-[#F3F4F6] text-[#374151]";
  const label = ACTION_LABELS[action] ?? action;
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${pill}`}>
      {label}
    </span>
  );
}

export default function BackofficeAuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [orgSearch, setOrgSearch] = useState("");

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["/api/backoffice/tenants"],
    staleTime: 60_000,
    select: (data) => data.map((t) => ({ id: t.id, name: t.name })),
  });

  const matchedOrg = orgSearch.trim()
    ? tenants.find((t) => t.name.toLowerCase().includes(orgSearch.trim().toLowerCase()))
    : undefined;

  const params = new URLSearchParams();
  if (actionFilter) params.set("action", actionFilter);
  if (matchedOrg) params.set("orgId", matchedOrg.id);

  const queryKey = `/api/backoffice/audit-log${params.toString() ? `?${params.toString()}` : ""}`;

  const { data: logs = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: [queryKey],
    staleTime: 15_000,
  });

  const hasFilters = Boolean(actionFilter || orgSearch.trim());

  return (
    <BackofficeLayout title="Platform audit log">
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Filter by org name…"
            value={orgSearch}
            onChange={(e) => setOrgSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-md border border-[#E5E7EB] bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#059669]"
          />
          {orgSearch && (
            <button
              onClick={() => setOrgSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-8 rounded-md border border-[#E5E7EB] bg-white px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#059669]"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setActionFilter(""); setOrgSearch(""); }}
            className="text-[12px] text-[#6B7280] hover:text-[#374151] flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}

        <span className="text-[12px] text-[#9CA3AF] ml-auto">
          {isLoading ? "" : `${logs.length} entr${logs.length === 1 ? "y" : "ies"}`}
        </span>
      </div>

      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[150px_1fr_140px_1fr_1fr] px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
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
            {hasFilters ? "No entries match your filters." : "No audit log entries yet."}
          </div>
        ) : (
          logs.map((entry, i) => (
            <div
              key={entry.id}
              className={`grid grid-cols-[150px_1fr_140px_1fr_1fr] px-5 py-3 border-b border-[#F9FAFB] items-center ${
                i % 2 === 1 ? "bg-[#FAFAFA]" : ""
              }`}
            >
              <span className="text-[11.5px] text-[#6B7280] tabular-nums">
                {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
              </span>
              <span className="text-[12.5px] text-[#374151] truncate pr-3">{entry.adminEmail}</span>
              <ActionPill action={entry.action} />
              <span className="text-[12.5px] font-medium text-[#111827] truncate pr-3">
                {entry.targetOrgName ?? <span className="text-[#9CA3AF]">-</span>}
              </span>
              <span className="text-[11.5px] text-[#6B7280] truncate">
                {entry.details ?? "-"}
              </span>
            </div>
          ))
        )}
      </div>
    </BackofficeLayout>
  );
}
