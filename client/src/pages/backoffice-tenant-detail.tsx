import { useState } from "react";
import { Link } from "wouter";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Eye, Ban } from "lucide-react";

const tenant = {
  name: "Meridian Co.",
  domain: "meridian.co",
  id: "ten_8x2kpq",
  createdLabel: "Jan 2026",
  plan: "Enterprise",
  status: "active",
  mrr: "$1,200",
  users: 24,
  billingCycle: "Jul 31",
};

const tenantUsers = [
  {
    initials: "SC",
    name: "Sarah Chen",
    email: "sarah.chen@meridian.co",
    role: "Contractor",
    roleTone: "neutral" as const,
    lastActive: "2 hours ago",
    status: "active",
    joined: "Jan 2026",
    avatarBg: "#111827",
  },
  {
    initials: "MR",
    name: "Marcus Rivera",
    email: "m.rivera@meridian.co",
    role: "Supervisor",
    roleTone: "green" as const,
    lastActive: "5 hours ago",
    status: "active",
    joined: "Oct 2025",
    avatarBg: "#065F46",
  },
  {
    initials: "AT",
    name: "Aisha Tanaka",
    email: "a.tanaka@meridian.co",
    role: "Contractor",
    roleTone: "neutral" as const,
    lastActive: "1 day ago",
    status: "ooo",
    joined: "Mar 2026",
    avatarBg: "#1C2230",
    avatarBorder: true,
  },
  {
    initials: "LP",
    name: "Leo Park",
    email: "leo.park@meridian.co",
    role: "Admin",
    roleTone: "green" as const,
    lastActive: "12 minutes ago",
    status: "active",
    joined: "Jan 2026",
    avatarBg: "#111827",
  },
];

function rolePillClass(tone: "neutral" | "green") {
  return tone === "green" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#374151]";
}

const billingHistory = [
  { date: "Jul 1, 2026", desc: "Enterprise plan · monthly", amount: "$1,200.00", status: "paid" },
  { date: "Jun 1, 2026", desc: "Enterprise plan · monthly", amount: "$1,200.00", status: "paid" },
  { date: "May 1, 2026", desc: "Enterprise plan · monthly", amount: "$1,200.00", status: "paid" },
];

const activityLog = [
  { time: "2h ago", text: "Sarah Chen submitted timesheet for week of Jun 29" },
  { time: "5h ago", text: "Marcus Rivera approved 3 leave requests" },
  { time: "1d ago", text: "Aisha Tanaka set OOO status through Jul 10" },
  { time: "2d ago", text: "Invoice #INV-2044 generated and sent" },
  { time: "4d ago", text: "Leo Park added as workspace admin" },
];

const tenantFlags = [
  { name: "expense_management", enabled: true },
  { name: "bulk_csv_import", enabled: true },
  { name: "sso_saml", enabled: true },
  { name: "ai_timesheet_fill", enabled: false },
  { name: "evaluation_360", enabled: false },
];

const supportNotes = [
  {
    author: "Krish Patel",
    date: "Jun 20, 2026",
    text: "Onboarded via annual enterprise contract. Primary contact is Sarah Chen (ops lead).",
  },
  {
    author: "Dana Wu",
    date: "Jun 25, 2026",
    text: "Requested SSO setup walkthrough. Scheduled for Jul 3.",
  },
];

const tabs = ["Users", "Billing", "Activity log", "Feature flags", "Support notes"] as const;
type Tab = (typeof tabs)[number];

export default function BackofficeTenantDetailPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Users");

  return (
    <BackofficeLayout
      title={tenant.name}
      active="/back-office/tenants"
      topbarContent={
        <div className="flex items-center gap-[6px] flex-1">
          <Link href="/back-office/tenants" className="text-[12.5px] text-[#9CA3AF] no-underline">
            Tenants
          </Link>
          <ChevronRight className="w-3 h-3 text-[#D1D5DB]" />
          <span className="text-[12.5px] font-semibold text-[#374151]">{tenant.name}</span>
        </div>
      }
      actions={
        <>
          <Button
            variant="ghost"
            className="h-auto gap-1.5 bg-[#FFFBEB] text-[#D97706] text-[12.5px] font-semibold px-[14px] py-[7px] border-[1.5px] border-[#FDE68A] rounded-[7px]"
            data-testid="button-login-as-admin"
          >
            <Eye className="w-3 h-3" />
            Login as admin
          </Button>
          <Button
            variant="ghost"
            className="h-auto bg-[#FEF2F2] text-[#DC2626] text-[12.5px] font-semibold px-[14px] py-[7px] border-[1.5px] border-[#FECACA] rounded-[7px]"
            data-testid="button-suspend-tenant"
          >
            Suspend tenant
          </Button>
        </>
      }
    >
      {/* Tenant header */}
      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl px-[22px] py-[18px] flex items-center justify-between">
        <div className="flex items-center gap-[14px]">
          <div className="w-11 h-11 bg-[#111827] rounded-[10px] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">{tenant.name[0]}</span>
          </div>
          <div>
            <div className="text-[17px] font-bold text-[#111827] mb-0.5">{tenant.name}</div>
            <div className="text-[12.5px] text-[#9CA3AF]">
              {tenant.domain} · tenant ID: {tenant.id} · created {tenant.createdLabel}
            </div>
          </div>
          <span className="text-xs font-bold bg-[#111827] text-white px-[11px] py-1 rounded-full ml-1.5">
            {tenant.plan}
          </span>
          <StatusBadge status={tenant.status} />
        </div>
        <div className="flex gap-8 text-right">
          <div>
            <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-[3px]">
              MRR
            </div>
            <div className="text-lg font-bold text-[#111827]">{tenant.mrr}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-[3px]">
              Users
            </div>
            <div className="text-lg font-bold text-[#111827]">{tenant.users}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-[3px]">
              Billing cycle
            </div>
            <div className="text-sm font-semibold text-[#111827]">{tenant.billingCycle}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-[1.5px] border-[#E5E7EB] border-b-0 bg-white rounded-t-xl overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-[11px] text-[13px] cursor-pointer border-b-2 ${
              activeTab === tab
                ? "border-[#059669] text-[#059669] font-semibold"
                : "border-transparent text-[#9CA3AF]"
            }`}
            data-testid={`tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white border-[1.5px] border-t-0 border-[#E5E7EB] rounded-b-xl overflow-hidden flex-1 min-h-0 overflow-y-auto">
        {activeTab === "Users" && (
          <div>
            <div className="grid grid-cols-[1fr_100px_120px_100px_110px_130px] px-5 py-[9px] bg-[#F9FAFB] border-t border-b border-[#E5E7EB]">
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                User
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Role
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Last active
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Status
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Joined
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase text-right">
                Actions
              </span>
            </div>
            {tenantUsers.map((u, i) => (
              <div
                key={u.email}
                className={`grid grid-cols-[1fr_100px_120px_100px_110px_130px] px-5 py-[11px] border-b border-[#F9FAFB] items-center ${
                  i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                }`}
                data-testid={`row-tenant-user-${u.initials.toLowerCase()}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center"
                    style={{
                      background: u.avatarBg,
                      border: u.avatarBorder ? "1px solid #2A3545" : undefined,
                    }}
                  >
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: u.avatarBorder ? "#8DAFC8" : "white" }}
                    >
                      {u.initials}
                    </span>
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-[#111827]">{u.name}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{u.email}</div>
                  </div>
                </div>
                <span
                  className={`text-[11.5px] px-2 py-0.5 rounded-full font-medium w-fit ${rolePillClass(
                    u.roleTone
                  )}`}
                >
                  {u.role}
                </span>
                <span className="text-xs text-[#6B7280]">{u.lastActive}</span>
                <div>
                  <StatusBadge status={u.status} />
                </div>
                <span className="text-xs text-[#6B7280]">{u.joined}</span>
                <div className="flex gap-[5px] justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto text-[11px] text-[#059669] bg-[#ECFDF5] px-2 py-[3px] rounded-md"
                  >
                    Impersonate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto text-[11px] text-[#DC2626] bg-[#FEF2F2] px-2 py-[3px] rounded-md"
                  >
                    Suspend
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Billing" && (
          <div className="p-5 flex flex-col gap-2">
            {billingHistory.map((row) => (
              <div
                key={row.date}
                className="flex items-center justify-between border-b border-[#F9FAFB] py-2.5 last:border-b-0"
              >
                <div>
                  <div className="text-[12.5px] font-medium text-[#111827]">{row.desc}</div>
                  <div className="text-[11.5px] text-[#9CA3AF]">{row.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] text-[#374151] tabular-nums">{row.amount}</span>
                  <StatusBadge status={row.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Activity log" && (
          <div className="p-5 flex flex-col gap-3">
            {activityLog.map((item, i) => (
              <div key={i} className="flex items-baseline gap-3">
                <span className="text-[11.5px] text-[#9CA3AF] w-14 shrink-0">{item.time}</span>
                <span className="text-[12.5px] text-[#374151]">{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Feature flags" && (
          <div className="p-5 flex flex-col gap-2">
            {tenantFlags.map((flag) => (
              <div
                key={flag.name}
                className="flex items-center justify-between border-b border-[#F9FAFB] py-2.5 last:border-b-0"
              >
                <span className="text-[12.5px] font-medium text-[#111827]">{flag.name}</span>
                <StatusBadge status={flag.enabled ? "active" : "declined"} />
              </div>
            ))}
          </div>
        )}

        {activeTab === "Support notes" && (
          <div className="p-5 flex flex-col gap-3">
            {supportNotes.map((note, i) => (
              <div key={i} className="border border-[#F3F4F6] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12.5px] font-semibold text-[#111827]">{note.author}</span>
                  <span className="text-[11px] text-[#9CA3AF]">{note.date}</span>
                </div>
                <p className="text-[12.5px] text-[#374151]">{note.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </BackofficeLayout>
  );
}
