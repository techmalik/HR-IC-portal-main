import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Tag, Settings2, Users } from "lucide-react";
import {
  DiscountModal,
  PlanModal,
  SuspendModal,
  planPillClass,
  discountSummary,
  PLAN_MAX_SEATS,
  type Tenant,
  type DiscountCode,
} from "@/pages/backoffice-tenant-detail";

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  maxSeats: number;
  discountType: string | null;
  discountValue: number | null;
  appliedDiscountId: string | null;
}

interface TenantUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AuditLogEntry {
  id: string;
  adminEmail: string;
  action: string;
  details: string | null;
  createdAt: string;
}

interface TenantDetail {
  organization: Organization;
  subscription: Subscription | null;
  netPrice: number;
  discountCode: { code: string } | null;
  users: TenantUser[];
  recentAuditLog: AuditLogEntry[];
}

const ACTION_LABELS: Record<string, string> = {
  plan_change: "Plan change",
  suspend: "Suspended",
  reactivate: "Reactivated",
  discount_apply: "Discount applied",
  discount_remove: "Discount removed",
};

export default function BackofficeTenantDrilldownPage() {
  const [, params] = useRoute("/back-office/tenants/:orgId");
  const orgId = params?.orgId ?? "";

  const [discountOpen, setDiscountOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const { data, isLoading, error } = useQuery<TenantDetail>({
    queryKey: ["/api/backoffice/tenants", orgId],
    enabled: Boolean(orgId),
    staleTime: 10_000,
  });

  const { data: discountCodes = [] } = useQuery<DiscountCode[]>({
    queryKey: ["/api/backoffice/discount-codes"],
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <BackofficeLayout title="Tenant detail" active="/back-office/tenants">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
        </div>
      </BackofficeLayout>
    );
  }

  if (error || !data) {
    return (
      <BackofficeLayout title="Tenant detail" active="/back-office/tenants">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-[13px] text-[#9CA3AF]">Tenant not found.</div>
          <Link href="/back-office/tenants" className="text-[12.5px] text-[#059669] hover:underline">
            Back to all tenants
          </Link>
        </div>
      </BackofficeLayout>
    );
  }

  const { organization, subscription, netPrice, discountCode, users, recentAuditLog } = data;
  const plan = subscription?.plan ?? "free";
  const isSuspended = subscription?.status === "suspended";

  // Adapt to the shape the shared modals (from the tenant list page) expect.
  const tenantForModals: Tenant = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    plan,
    status: subscription?.status ?? "active",
    maxSeats: subscription?.maxSeats ?? PLAN_MAX_SEATS[plan] ?? 3,
    userCount: users.length,
    createdAt: organization.createdAt,
    mrr: netPrice,
    discountType: subscription?.discountType ?? null,
    discountValue: subscription?.discountValue ?? null,
    appliedDiscountId: subscription?.appliedDiscountId ?? null,
    subscriptionId: subscription?.id ?? null,
  };

  const summary = discountSummary(tenantForModals.discountType, tenantForModals.discountValue);

  return (
    <BackofficeLayout
      title={organization.name}
      active="/back-office/tenants"
      actions={
        <Link href="/back-office/tenants">
          <Button variant="outline" size="sm" className="h-7 text-[11.5px] px-2">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> All tenants
          </Button>
        </Link>
      }
    >
      {discountOpen && (
        <DiscountModal tenant={tenantForModals} discountCodes={discountCodes} onClose={() => setDiscountOpen(false)} />
      )}
      {planOpen && <PlanModal tenant={tenantForModals} onClose={() => setPlanOpen(false)} />}
      {suspendOpen && <SuspendModal tenant={tenantForModals} onClose={() => setSuspendOpen(false)} />}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#111827]">{organization.name}</h2>
                {isSuspended && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">
                    Suspended
                  </span>
                )}
              </div>
              <div className="text-[11.5px] text-[#9CA3AF]">
                {organization.slug} · joined {format(new Date(organization.createdAt), "MMM d, yyyy")}
              </div>
            </div>
            <span className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full w-fit ${planPillClass(plan)}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase mb-1">Net MRR</div>
              <div className="text-[16px] font-semibold text-[#111827]">{netPrice > 0 ? `$${netPrice}` : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase mb-1">Seats</div>
              <div className="text-[16px] font-semibold text-[#111827]">
                {users.length} / {tenantForModals.maxSeats}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase mb-1">Discount</div>
              {summary ? (
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[12px] font-semibold text-emerald-700">
                    {summary}{discountCode ? ` (${discountCode.code})` : ""}
                  </span>
                </div>
              ) : (
                <div className="text-[13px] text-[#9CA3AF]">None</div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#F3F4F6]">
            <Button variant="outline" size="sm" className="h-7 text-[11.5px] px-2" onClick={() => setPlanOpen(true)}>
              <Settings2 className="w-3 h-3 mr-1" /> Change plan / seats
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[11.5px] px-2" onClick={() => setDiscountOpen(true)}>
              <Tag className="w-3 h-3 mr-1" /> Manage discount
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`h-7 text-[11.5px] px-2 ${
                isSuspended
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                  : "text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
              }`}
              onClick={() => setSuspendOpen(true)}
            >
              {isSuspended ? "Reactivate" : "Suspend"}
            </Button>
          </div>
        </div>

        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#9CA3AF]" />
            <h3 className="text-[13px] font-semibold text-[#111827]">Recent audit entries</h3>
          </div>
          {recentAuditLog.length === 0 ? (
            <div className="text-[12px] text-[#9CA3AF]">No audit entries for this tenant yet.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentAuditLog.map((entry) => (
                <div key={entry.id} className="text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#374151]">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                    <span className="text-[10.5px] text-[#9CA3AF] tabular-nums">
                      {format(new Date(entry.createdAt), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9CA3AF]">{entry.adminEmail}{entry.details ? ` · ${entry.details}` : ""}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_80px] px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Name</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Email</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Role</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Status</span>
        </div>
        {users.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[12.5px] text-[#9CA3AF]">
            No users in this organization.
          </div>
        ) : (
          users.map((u, i) => (
            <div
              key={u.id}
              className={`grid grid-cols-[1fr_1fr_100px_80px] px-5 py-3 border-b border-[#F9FAFB] items-center ${
                i % 2 === 1 ? "bg-[#FAFAFA]" : ""
              }`}
            >
              <span className="text-[13px] text-[#111827]">{u.firstName} {u.lastName}</span>
              <span className="text-[12.5px] text-[#6B7280] truncate pr-3">{u.email}</span>
              <span className="text-[12px] text-[#374151] capitalize">{u.role}</span>
              <span className={`text-[11px] font-semibold ${u.isActive ? "text-emerald-600" : "text-[#9CA3AF]"}`}>
                {u.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          ))
        )}
      </div>
    </BackofficeLayout>
  );
}
