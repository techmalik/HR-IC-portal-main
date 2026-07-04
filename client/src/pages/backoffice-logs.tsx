import { BackofficeLayout } from "@/components/backoffice-layout";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogRow {
  time: string;
  level: LogLevel;
  service: string;
  tenant: string;
  actor: string;
  message: string;
  meta: string;
}

const logs: LogRow[] = [
  { time: "14:32:08.112", level: "INFO", service: "api", tenant: "Meridian Co.", actor: "sarah.chen@meridian.co", message: "POST /api/timesheets/submit", meta: "200 · 84ms" },
  { time: "14:32:07.884", level: "INFO", service: "auth", tenant: "Meridian Co.", actor: "sarah.chen@meridian.co", message: "User session refreshed", meta: "200 · 22ms" },
  { time: "14:31:55.203", level: "WARN", service: "email", tenant: "NorthStar Labs", actor: "system", message: "Email delivery delayed, retrying in 30s (to: james@northstar.io)", meta: "retry 2/3" },
  { time: "14:31:42.991", level: "INFO", service: "api", tenant: "Meridian Co.", actor: "marcus.rivera@meridian.co", message: "GET /api/leave/requests", meta: "200 · 41ms" },
  { time: "14:31:38.774", level: "ERROR", service: "api", tenant: "Vertex Labs", actor: "system", message: "POST /api/invoices/upload · failed to parse PDF, unsupported format", meta: "422 · 12ms" },
  { time: "14:31:21.055", level: "INFO", service: "billing", tenant: "Meridian Co.", actor: "stripe", message: "Stripe webhook received · invoice.paid · $1,200", meta: "processed" },
  { time: "14:31:08.330", level: "INFO", service: "api", tenant: "Meridian Co.", actor: "aisha.tanaka@meridian.co", message: "PUT /api/users/usr_at_003/status · OOO flag set", meta: "200 · 37ms" },
  { time: "14:30:59.111", level: "INFO", service: "auth", tenant: "Meridian Co.", actor: "leo.park@meridian.co", message: "New user login · device: MacOS Chrome", meta: "200 · 56ms" },
  { time: "14:30:44.802", level: "DEBUG", service: "worker", tenant: "system", actor: "system", message: "Cron: monthly timesheet reminder job · 47 emails queued", meta: "queued" },
  { time: "14:30:31.447", level: "INFO", service: "api", tenant: "Meridian Co.", actor: "marcus.rivera@meridian.co", message: "POST /api/leave/approve", meta: "200 · 48ms" },
  { time: "14:29:58.002", level: "ERROR", service: "auth", tenant: "NorthStar Labs", actor: "unknown", message: "Failed login attempt · 3 consecutive failures · ip: 89.34.12.200", meta: "401 · 8ms" },
  { time: "14:29:40.118", level: "INFO", service: "api", tenant: "Meridian Co.", actor: "sarah.chen@meridian.co", message: "GET /api/dashboard · 4 active sessions concurrent", meta: "200 · 62ms" },
  { time: "14:29:12.556", level: "INFO", service: "billing", tenant: "Corelink Systems", actor: "stripe", message: "Stripe webhook received · invoice.payment_failed · $79", meta: "processed" },
  { time: "14:28:57.301", level: "WARN", service: "worker", tenant: "system", actor: "system", message: "PDF export queue backlog exceeded 50 jobs", meta: "62 queued" },
  { time: "14:28:33.640", level: "INFO", service: "api", tenant: "Acme Corp", actor: "dana.wu@acmecorp.com", message: "POST /api/expenses · receipt uploaded", meta: "201 · 91ms" },
  { time: "14:28:05.219", level: "ERROR", service: "api", tenant: "Corelink Systems", actor: "system", message: "GET /api/reports/export · request timed out", meta: "504 · 30000ms" },
  { time: "14:27:49.884", level: "INFO", service: "auth", tenant: "Vertex Labs", actor: "priya.nair@vertexlabs.com", message: "Password reset completed", meta: "200 · 33ms" },
  { time: "14:27:20.075", level: "DEBUG", service: "worker", tenant: "system", actor: "system", message: "Cache warm: tenant plan breakdown", meta: "312ms" },
  { time: "14:26:58.410", level: "INFO", service: "api", tenant: "Meridian Co.", actor: "leo.park@meridian.co", message: "PATCH /api/feature-flags/sso_saml", meta: "200 · 19ms" },
  { time: "14:26:31.203", level: "WARN", service: "billing", tenant: "NorthStar Labs", actor: "stripe", message: "Card ending 4242 will expire this month", meta: "notice" },
];

const levelStyles: Record<LogLevel, string> = {
  INFO: "bg-[#F3F4F6] text-[#6B7280]",
  WARN: "bg-[#D97706] text-white",
  ERROR: "bg-[#DC2626] text-white",
  DEBUG: "bg-[#1F2937] text-[#9CA3AF]",
};

const levelTextColor: Record<LogLevel, string> = {
  INFO: "#9CA3AF",
  WARN: "#FDE68A",
  ERROR: "#FCA5A5",
  DEBUG: "#4B5563",
};

const filterChip = "border-[1.5px] border-[#E5E7EB] rounded-[7px] px-[11px] py-[6px] bg-[#F9FAFB] text-xs text-[#6B7280] flex items-center gap-[5px]";

const counts = {
  info: logs.filter((l) => l.level === "INFO").length,
  warn: logs.filter((l) => l.level === "WARN").length,
  error: logs.filter((l) => l.level === "ERROR").length,
};

export default function BackofficeLogsPage() {
  return (
    <BackofficeLayout
      title="System Logs"
      actions={
        <>
          <div className={filterChip}>
            Tenant: All
            <ChevronDown className="w-[11px] h-[11px] text-[#9CA3AF]" />
          </div>
          <div className={filterChip}>
            Level: All
            <ChevronDown className="w-[11px] h-[11px] text-[#9CA3AF]" />
          </div>
          <div className={filterChip}>
            Last 1h
            <ChevronDown className="w-[11px] h-[11px] text-[#9CA3AF]" />
          </div>
          <div className={`${filterChip} text-[#9CA3AF]`}>
            <Search className="w-3 h-3 text-[#D1D5DB]" />
            Search logs...
          </div>
          <Button
            className="h-auto bg-[#111827] text-white text-xs font-semibold px-[13px] py-[7px] rounded-[7px] hover:bg-[#111827]"
            data-testid="button-export-logs"
          >
            Export
          </Button>
        </>
      }
    >
      <div className="flex-1 flex flex-col rounded-xl overflow-hidden min-h-0">
        <div className="flex-1 bg-[#0A0D12] px-5 py-4 overflow-auto font-mono text-xs leading-[1.7] flex flex-col gap-[3px]">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`flex flex-wrap gap-x-3 gap-y-0.5 items-baseline rounded px-1 ${
                log.level === "ERROR" ? "bg-[#DC2626]/[0.06]" : ""
              }`}
              data-testid={`row-log-${i}`}
            >
              <span className="text-[#374151] whitespace-nowrap shrink-0">{log.time}</span>
              <span
                className={`text-[10px] font-bold px-1.5 rounded-[3px] shrink-0 ${levelStyles[log.level]}`}
              >
                {log.level}
              </span>
              <span className="text-[#4B5563] shrink-0">[{log.service}]</span>
              <span style={{ color: levelTextColor[log.level] }}>{log.message}</span>
              <span className="text-[#34D399] ml-auto shrink-0">{log.meta}</span>
              <span className="text-[#4B5563] shrink-0 w-24 text-right">{log.actor}</span>
              <span className="text-[#374151] shrink-0 w-32 text-right">{log.tenant}</span>
            </div>
          ))}
          <div className="flex gap-3 items-baseline mt-1">
            <span className="text-[#374151]">14:32:09.000</span>
            <span className="text-[#059669]">▋</span>
          </div>
        </div>
        <div className="bg-white border-t border-[#E5E7EB] px-5 py-[10px] flex items-center gap-6">
          <span className="text-xs text-[#9CA3AF]">
            Showing {logs.length} most recent · Last updated 1s ago
          </span>
          <div className="flex gap-4 ml-auto">
            <div className="flex items-center gap-[5px]">
              <div className="w-2 h-2 rounded-sm bg-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">{counts.info} INFO</span>
            </div>
            <div className="flex items-center gap-[5px]">
              <div className="w-2 h-2 rounded-sm bg-[#D97706]" />
              <span className="text-xs text-[#6B7280]">{counts.warn} WARN</span>
            </div>
            <div className="flex items-center gap-[5px]">
              <div className="w-2 h-2 rounded-sm bg-[#DC2626]" />
              <span className="text-xs text-[#6B7280]">{counts.error} ERROR</span>
            </div>
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
