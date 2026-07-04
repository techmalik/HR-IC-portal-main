import { useState } from "react";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  tag: string;
  tagStyle: string;
  rollout: number;
  footer: string;
  warn?: boolean;
}

const initialFlags: FeatureFlag[] = [
  {
    key: "expense_management",
    description: "Expense upload and approval flow",
    enabled: true,
    tag: "All tenants",
    tagStyle: "bg-[#ECFDF5] text-[#059669]",
    rollout: 100,
    footer: "Enabled Jul 1 · by Krish P.",
  },
  {
    key: "bulk_csv_import",
    description: "Bulk user and timesheet CSV import",
    enabled: true,
    tag: "Enterprise only",
    tagStyle: "bg-[#111827] text-white",
    rollout: 100,
    footer: "Enabled May 12 · by Krish P.",
  },
  {
    key: "ai_timesheet_fill",
    description: "AI-assisted timesheet autofill (beta)",
    enabled: false,
    tag: "Beta · 3 tenants",
    tagStyle: "bg-[#FFFBEB] text-[#D97706]",
    rollout: 8,
    footer: "Disabled · last tested Jun 28",
    warn: true,
  },
  {
    key: "sso_saml",
    description: "SAML-based SSO login",
    enabled: true,
    tag: "Enterprise only",
    tagStyle: "bg-[#111827] text-white",
    rollout: 100,
    footer: "Enabled Mar 4 · by Krish P.",
  },
  {
    key: "invoice_pdf_gen",
    description: "Generate PDF invoices from timesheets",
    enabled: true,
    tag: "Pro + Enterprise",
    tagStyle: "bg-[#ECFDF5] text-[#059669]",
    rollout: 83,
    footer: "Enabled Apr 17 · by Krish P.",
  },
  {
    key: "evaluation_360",
    description: "360-degree peer review workflow",
    enabled: false,
    tag: "Disabled globally",
    tagStyle: "bg-[#F3F4F6] text-[#9CA3AF]",
    rollout: 0,
    footer: "Roadmap Q3 2026",
  },
];

export default function BackofficeFlagsPage() {
  const [flags, setFlags] = useState(initialFlags);

  const toggleFlag = (key: string) => {
    setFlags((prev) =>
      prev.map((flag) =>
        flag.key === key
          ? {
              ...flag,
              enabled: !flag.enabled,
              rollout: !flag.enabled ? Math.max(flag.rollout, 100) : 0,
            }
          : flag
      )
    );
  };

  return (
    <BackofficeLayout
      title="Feature Flags"
      actions={
        <Button
          className="h-auto gap-1.5 bg-[#111827] text-white text-[12.5px] font-semibold px-[15px] py-[7px] rounded-[7px] hover:bg-[#111827]"
          data-testid="button-new-flag"
        >
          <Plus className="w-3 h-3" />
          New flag
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-3 flex-1 content-start">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className={`bg-white rounded-xl p-[18px] border-[1.5px] ${
              flag.warn ? "border-[#FDE68A]" : "border-[#E5E7EB]"
            }`}
            data-testid={`card-flag-${flag.key}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-[13px] font-semibold text-[#111827] mb-[3px]">{flag.key}</div>
                <div className="text-xs text-[#9CA3AF]">{flag.description}</div>
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={() => toggleFlag(flag.key)}
                className="shrink-0 data-[state=checked]:bg-[#059669] data-[state=unchecked]:bg-[#D1D5DB]"
                data-testid={`switch-flag-${flag.key}`}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <span
                className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${flag.tagStyle}`}
              >
                {flag.tag}
              </span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-[10.5px] text-[#9CA3AF]">Rollout</span>
                <span className="text-[10.5px] font-semibold text-[#374151] tabular-nums">
                  {flag.rollout}%
                </span>
              </div>
              <div className="h-1.5 bg-[#F3F4F6] rounded-full">
                <div
                  className="h-full rounded-full bg-[#059669]"
                  style={{ width: `${flag.rollout}%` }}
                />
              </div>
            </div>
            <div className="text-[11px] text-[#9CA3AF]">{flag.footer}</div>
          </div>
        ))}
      </div>
    </BackofficeLayout>
  );
}
