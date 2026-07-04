import { Link } from "wouter";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";

const kpis = [
  { label: "MRR", value: "$14,820", delta: "+12% vs last month", tone: "up" as const },
  { label: "Active tenants", value: "47", delta: "+3 this month", tone: "up" as const },
  { label: "Total users", value: "612", delta: "across all tenants", tone: "neutral" as const },
  { label: "Churn rate", value: "1.8%", delta: "-0.4% vs last month", tone: "up" as const },
];

const openTicketsKpi = { label: "Open tickets", value: "3", delta: "1 urgent" };

const mrrChart = [
  { month: "Jan", height: 54, color: "#D1FAE5" },
  { month: "Feb", height: 66, color: "#A7F3D0" },
  { month: "Mar", height: 72, color: "#6EE7B7" },
  { month: "Apr", height: 82, color: "#34D399" },
  { month: "May", height: 90, color: "#10B981" },
  { month: "Jun", height: 96, color: "#059669" },
  { month: "Jul", height: 96, color: "#059669", current: true },
];

const planBreakdown = [
  { plan: "Enterprise", tenants: 6, pct: 13, color: "#111827", detail: "$7,200 MRR · custom" },
  { plan: "Pro", tenants: 19, pct: 40, color: "#059669", detail: "$6,320 MRR · $79/mo" },
  { plan: "Starter", tenants: 14, pct: 30, color: "#34D399", detail: "$1,300 MRR · $29/mo" },
  { plan: "Free", tenants: 8, pct: 17, color: "#D1FAE5", detail: "$0 MRR" },
];

const recentSignups = [
  {
    org: "Meridian Co.",
    domain: "meridian.co",
    plan: "Enterprise",
    users: "24 users",
    signedUp: "Jul 1, 2026",
  },
  {
    org: "NorthStar Labs",
    domain: "northstarlabs.io",
    plan: "Pro",
    users: "11 users",
    signedUp: "Jun 28, 2026",
  },
  {
    org: "Vertex Labs",
    domain: "vertexlabs.com",
    plan: "Starter",
    users: "6 users",
    signedUp: "Jun 22, 2026",
  },
  {
    org: "Corelink Systems",
    domain: "corelink.io",
    plan: "Pro",
    users: "9 users",
    signedUp: "Jun 15, 2026",
  },
  {
    org: "Acme Corp",
    domain: "acmecorp.com",
    plan: "Free",
    users: "3 users",
    signedUp: "Jun 9, 2026",
  },
];

function planPillClass(plan: string) {
  switch (plan) {
    case "Enterprise":
      return "bg-[#111827] text-white";
    case "Pro":
      return "bg-[#059669] text-white";
    case "Starter":
      return "bg-[#F3F4F6] text-[#374151]";
    default:
      return "bg-[#F3F4F6] text-[#9CA3AF]";
  }
}

const systemHealth = [
  { label: "API", value: "99.98%", ok: true },
  { label: "Database", value: "99.99%", ok: true },
  { label: "File storage", value: "100%", ok: true },
  { label: "Email delivery", value: "96.2%", ok: false },
  { label: "Auth service", value: "100%", ok: true },
];

const latencyBars = [60, 55, 70, 50, 80, 100, 65, 60, 70, 55];

export default function BackofficeOverviewPage() {
  return (
    <BackofficeLayout
      title="Platform Overview"
      actions={
        <>
          <div className="flex items-center gap-[5px] border-[1.5px] border-[#E5E7EB] rounded-[7px] px-3 py-[6px] bg-[#F9FAFB] text-[12.5px] text-[#6B7280]">
            <Calendar className="w-3 h-3 text-[#9CA3AF]" />
            Last 30 days
            <ChevronDown className="w-[11px] h-[11px] text-[#9CA3AF]" />
          </div>
          <div className="w-2 h-2 bg-[#10B981] rounded-full" />
          <span className="text-[12px] text-[#6B7280]">All systems operational</span>
        </>
      }
    >
      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[11px] px-4 py-[14px]"
            data-testid={`card-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="text-[9.5px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase mb-[10px]">
              {kpi.label}
            </div>
            <div className="text-[26px] font-bold text-[#111827] tracking-[-0.03em] tabular-nums">
              {kpi.value}
            </div>
            <div
              className={`text-[11.5px] font-medium mt-1 ${
                kpi.tone === "up" ? "text-[#059669]" : "text-[#6B7280]"
              }`}
            >
              {kpi.delta}
            </div>
          </div>
        ))}
        <div
          className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] rounded-[11px] px-4 py-[14px]"
          data-testid="card-kpi-open-tickets"
        >
          <div className="text-[9.5px] font-bold text-[#92400E] tracking-[0.1em] uppercase mb-[10px]">
            {openTicketsKpi.label}
          </div>
          <div className="text-[26px] font-bold text-[#92400E] tracking-[-0.03em] tabular-nums">
            {openTicketsKpi.value}
          </div>
          <div className="text-[11.5px] font-medium mt-1 text-[#B45309]">
            {openTicketsKpi.delta}
          </div>
        </div>
      </div>

      {/* MRR chart + plan breakdown */}
      <div className="grid grid-cols-[1fr_280px] gap-[14px]">
        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl px-[22px] py-[18px]">
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="text-[13.5px] font-semibold text-[#111827]">
                Monthly recurring revenue
              </div>
              <div className="text-xs text-[#9CA3AF] mt-0.5">Jan 2026 to Jul 2026</div>
            </div>
            <span className="text-[13px] font-semibold text-[#059669]">$14,820</span>
          </div>
          <div className="flex items-end gap-[10px] h-[120px] pb-6 border-b border-[#F3F4F6]">
            {mrrChart.map((bar) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${bar.height}px`,
                    background: bar.color,
                    boxShadow: bar.current
                      ? "0 0 0 2px #059669, 0 0 0 4px rgba(5,150,105,0.2)"
                      : undefined,
                  }}
                />
                <span
                  className={`text-[10px] ${
                    bar.current ? "text-[#059669] font-semibold" : "text-[#9CA3AF]"
                  }`}
                >
                  {bar.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl p-[18px]">
          <div className="text-[13.5px] font-semibold text-[#111827] mb-4">Plan breakdown</div>
          <div className="flex flex-col gap-3">
            {planBreakdown.map((row) => (
              <div key={row.plan}>
                <div className="flex justify-between mb-[5px]">
                  <span className="text-[12.5px] font-medium text-[#374151]">{row.plan}</span>
                  <span className="text-[12.5px] font-semibold text-[#111827] tabular-nums">
                    {row.tenants} tenants
                  </span>
                </div>
                <div className="h-1.5 bg-[#F3F4F6] rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.pct}%`, background: row.color }}
                  />
                </div>
                <div className="text-[11px] text-[#9CA3AF] mt-[3px]">{row.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent signups + system health */}
      <div className="grid grid-cols-[1fr_340px] gap-[14px] flex-1 min-h-0">
        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
          <div className="px-[18px] py-[13px] border-b border-[#F3F4F6] flex justify-between items-center">
            <span className="text-[13.5px] font-semibold text-[#111827]">Recent signups</span>
            <Link
              href="/back-office/tenants"
              className="text-xs text-[#059669] font-medium no-underline"
              data-testid="link-view-all-tenants"
            >
              View all tenants
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[1fr_90px_100px_110px_120px] px-[18px] py-2 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Organization
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Plan
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Users
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Signed up
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase text-right">
                Actions
              </span>
            </div>
            {recentSignups.map((row, i) => (
              <div
                key={row.org}
                className={`grid grid-cols-[1fr_90px_100px_110px_120px] px-[18px] py-[11px] border-b border-[#F9FAFB] items-center ${
                  i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                }`}
                data-testid={`row-tenant-${row.org.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <div>
                  <div className="text-[13px] font-medium text-[#111827]">{row.org}</div>
                  <div className="text-[11.5px] text-[#9CA3AF]">{row.domain}</div>
                </div>
                <span
                  className={`text-[11.5px] font-semibold px-[9px] py-[3px] rounded-full whitespace-nowrap w-fit ${planPillClass(
                    row.plan
                  )}`}
                >
                  {row.plan}
                </span>
                <span className="text-[12.5px] text-[#374151] tabular-nums">{row.users}</span>
                <span className="text-[12.5px] text-[#6B7280]">{row.signedUp}</span>
                <div className="flex gap-[5px] justify-end">
                  <Link href="/back-office/tenants/meridian">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto text-[11.5px] text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] px-[9px] py-[3px]"
                    >
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto text-[11.5px] text-[#059669] bg-[#ECFDF5] px-[9px] py-[3px]"
                  >
                    Login as
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl p-[18px] flex flex-col gap-[14px]">
          <div className="text-[13.5px] font-semibold text-[#111827]">System health</div>
          <div className="flex flex-col gap-[9px]">
            {systemHealth.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-[7px] h-[7px] rounded-full"
                    style={{ background: row.ok ? "#059669" : "#D97706" }}
                  />
                  <span className="text-[13px] text-[#374151]">{row.label}</span>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: row.ok ? "#059669" : "#D97706" }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#F3F4F6] pt-3">
            <div className="text-xs font-medium text-[#374151] mb-2">API latency (p95)</div>
            <div className="flex items-end gap-[3px] h-10">
              {latencyBars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${h}%`,
                    background: h === 100 ? "#FDE68A" : i === latencyBars.length - 1 ? "#059669" : "#D1FAE5",
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[#D1D5DB]">7 days ago</span>
              <span className="text-[11px] font-semibold text-[#111827]">142ms avg</span>
              <span className="text-[10px] text-[#D1D5DB]">today</span>
            </div>
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
