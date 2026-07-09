import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Loader2, Search } from "lucide-react";

interface ActivityLogEntry {
  id: string;
  organizationId: string;
  organizationName: string | null;
  userId: string;
  actorEmail: string | null;
  action: string;
  details: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

const PAGE_SIZE = 50;

function actionLabel(action: string) {
  return action.replace(/_/g, " ");
}

export default function BackofficeLogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: result, isLoading } = useQuery({
    queryKey: ["/api/backoffice/activity-logs", { offset: page * PAGE_SIZE }],
    queryFn: async ({ queryKey }) => {
      const [url, f] = queryKey as [string, { offset: number }];
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(f.offset));
      const res = await fetch(`${url}?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const logs = (await res.json()) as ActivityLogEntry[];
      const total = Number(res.headers.get("X-Total-Count") ?? logs.length);
      return { logs, total };
    },
    // Genuinely re-polls — this is real recent activity, not a static snapshot.
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const allLogs = result?.logs ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const trimmed = search.trim().toLowerCase();
  const logs = trimmed
    ? allLogs.filter(
        (l) =>
          actionLabel(l.action).toLowerCase().includes(trimmed) ||
          (l.organizationName ?? "").toLowerCase().includes(trimmed) ||
          (l.actorEmail ?? "").toLowerCase().includes(trimmed) ||
          (l.details ?? "").toLowerCase().includes(trimmed)
      )
    : allLogs;

  return (
    <BackofficeLayout
      title="System Logs"
      actions={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Filter this page…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 w-56 rounded-md border border-[#E5E7EB] bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#059669]"
          />
        </div>
      }
    >
      <div className="flex-1 flex flex-col rounded-xl overflow-hidden min-h-0 bg-white border-[1.5px] border-[#E5E7EB]">
        <div className="grid grid-cols-[140px_160px_1fr_1fr] px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">When</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Tenant</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Event</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Actor</span>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[12.5px] text-[#9CA3AF]">
              {trimmed ? "No entries match your filter." : "No activity recorded yet."}
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={log.id}
                className={`grid grid-cols-[140px_160px_1fr_1fr] px-5 py-2.5 border-b border-[#F9FAFB] items-center ${
                  i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                }`}
                data-testid={`row-log-${log.id}`}
              >
                <span className="text-[11.5px] text-[#6B7280] tabular-nums">
                  {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                </span>
                <span className="text-[12px] text-[#374151] truncate pr-2">
                  {log.organizationName ?? <span className="text-[#9CA3AF]">—</span>}
                </span>
                <span className="text-[12.5px] text-[#111827] capitalize truncate pr-2">
                  {actionLabel(log.action)}
                  {log.details ? <span className="text-[#9CA3AF]"> · {log.details}</span> : null}
                </span>
                <span className="text-[11.5px] text-[#6B7280] truncate">
                  {log.actorEmail ?? "—"}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border-t border-[#E5E7EB] px-5 py-[10px] flex items-center gap-4">
          <span className="text-xs text-[#9CA3AF]">
            {total > 0
              ? `Showing ${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} of ${total}`
              : "No entries"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="h-7 px-2 rounded-md border border-[#E5E7EB] bg-white text-[11.5px] text-[#374151] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-[12px] text-[#6B7280]">
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="h-7 px-2 rounded-md border border-[#E5E7EB] bg-white text-[11.5px] text-[#374151] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
