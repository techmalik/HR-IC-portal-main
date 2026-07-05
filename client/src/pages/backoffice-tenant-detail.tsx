import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tag, X, Loader2, AlertTriangle, Settings2 } from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  userCount: number;
  createdAt: string;
  mrr: number;
  maxSeats?: number;
  discountType: string | null;
  discountValue: number | null;
  appliedDiscountId: string | null;
  subscriptionId: string | null;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  active: boolean;
  expiresAt: string | null;
}

function planPillClass(plan: string) {
  switch (plan.toLowerCase()) {
    case "enterprise": return "bg-[#111827] text-white";
    case "pro": return "bg-[#059669] text-white";
    case "starter": return "bg-[#F3F4F6] text-[#374151]";
    default: return "bg-[#F3F4F6] text-[#9CA3AF]";
  }
}

function discountSummary(type: string | null, value: number | null) {
  if (!type || value == null) return null;
  return type === "percentage" ? `${value}% off` : `$${value} off`;
}

const PLAN_MAX_SEATS: Record<string, number> = {
  free: 3,
  starter: 10,
  pro: 50,
  enterprise: 999,
};

function DiscountModal({
  tenant,
  discountCodes,
  onClose,
}: {
  tenant: Tenant;
  discountCodes: DiscountCode[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState("");

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/backoffice/tenants/${tenant.id}/discount`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountCodeId: selectedId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to apply discount");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/tenants"] });
      toast({ title: "Discount applied" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/backoffice/tenants/${tenant.id}/discount`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove discount");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/tenants"] });
      toast({ title: "Discount removed" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const activeCodes = discountCodes.filter((c) => c.active && (!c.expiresAt || new Date(c.expiresAt) >= new Date()));
  const hasDiscount = Boolean(tenant.appliedDiscountId);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#111827]">Manage discount: {tenant.name}</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {hasDiscount && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-[12.5px] font-semibold text-emerald-800">
                  {discountSummary(tenant.discountType, tenant.discountValue)} discount active
                </div>
                <div className="text-[11.5px] text-emerald-700">Net MRR: ${tenant.mrr}/mo</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[11.5px] text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 px-3"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Remove"}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[12px] font-medium text-[#374151]">
            {hasDiscount ? "Replace with a different code" : "Apply a discount code"}
          </label>
          {activeCodes.length === 0 ? (
            <p className="text-[12.5px] text-[#9CA3AF]">No active discount codes available. Create one in the Discounts page first.</p>
          ) : (
            <>
              <select
                className="w-full h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">- Select a code -</option>
                {activeCodes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.type === "percentage" ? `${c.value}%` : `$${c.value}`} off
                    {c.description ? ` · ${c.description}` : ""}
                  </option>
                ))}
              </select>
              <Button
                className="w-full text-[13px]"
                disabled={!selectedId || applyMutation.isPending}
                onClick={() => applyMutation.mutate()}
              >
                {applyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Tag className="w-4 h-4 mr-2" />
                )}
                Apply discount
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanModal({
  tenant,
  onClose,
}: {
  tenant: Tenant;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [plan, setPlan] = useState(tenant.plan);
  const [maxSeats, setMaxSeats] = useState(String(tenant.maxSeats ?? PLAN_MAX_SEATS[tenant.plan] ?? 3));

  const planMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/backoffice/tenants/${tenant.id}/plan`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, maxSeats: Number(maxSeats) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update plan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/audit-log"] });
      toast({ title: "Plan updated" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const currentMaxSeats = tenant.maxSeats ?? PLAN_MAX_SEATS[tenant.plan] ?? 3;
  const hasChanges = plan !== tenant.plan || Number(maxSeats) !== currentMaxSeats;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#111827]">Change plan: {tenant.name}</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-[#374151] block mb-1">Plan</label>
            <select
              className="w-full h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#059669]"
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                setMaxSeats(String(PLAN_MAX_SEATS[e.target.value] ?? 3));
              }}
            >
              <option value="free">Free: $0/mo</option>
              <option value="starter">Starter: $29/mo</option>
              <option value="pro">Pro: $79/mo</option>
              <option value="enterprise">Enterprise: custom</option>
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#374151] block mb-1">Max seats</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={maxSeats}
              onChange={(e) => setMaxSeats(e.target.value)}
              className="w-full h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#059669]"
            />
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Default for {plan}: {PLAN_MAX_SEATS[plan] ?? "-"} seats
            </p>
          </div>
        </div>

        <Button
          className="w-full text-[13px]"
          disabled={!hasChanges || planMutation.isPending}
          onClick={() => planMutation.mutate()}
        >
          {planMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}

function SuspendModal({
  tenant,
  onClose,
}: {
  tenant: Tenant;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const isSuspended = tenant.status === "suspended";

  const mutation = useMutation({
    mutationFn: async () => {
      const endpoint = isSuspended ? "reactivate" : "suspend";
      const res = await fetch(`/api/backoffice/tenants/${tenant.id}/${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSuspended ? {} : { reason }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Action failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/audit-log"] });
      toast({ title: isSuspended ? "Organization reactivated" : "Organization suspended" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isSuspended ? "bg-emerald-50" : "bg-red-50"}`}>
            <AlertTriangle className={`w-4 h-4 ${isSuspended ? "text-emerald-600" : "text-red-500"}`} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#111827]">
              {isSuspended ? "Reactivate" : "Suspend"}: {tenant.name}
            </h2>
            <p className="text-[12px] text-[#6B7280]">
              {isSuspended
                ? "Restore access for all users in this organization."
                : "All users in this organization will be blocked from logging in."}
            </p>
          </div>
        </div>

        {!isSuspended && (
          <div>
            <label className="text-[12px] font-medium text-[#374151] block mb-1">Reason (optional)</label>
            <textarea
              className="w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              rows={2}
              placeholder="e.g. Payment overdue, policy violation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 text-[13px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className={`flex-1 text-[13px] ${isSuspended ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSuspended ? "Reactivate" : "Suspend"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BackofficeTenantDetailPage() {
  const [managingTenant, setManagingTenant] = useState<Tenant | null>(null);
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null);
  const [suspendTenant, setSuspendTenant] = useState<Tenant | null>(null);

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/backoffice/tenants"],
    staleTime: 15_000,
  });

  const { data: discountCodes = [] } = useQuery<DiscountCode[]>({
    queryKey: ["/api/backoffice/discount-codes"],
    staleTime: 30_000,
  });

  return (
    <BackofficeLayout title="All tenants">
      {managingTenant && (
        <DiscountModal
          tenant={managingTenant}
          discountCodes={discountCodes}
          onClose={() => setManagingTenant(null)}
        />
      )}
      {planTenant && (
        <PlanModal
          tenant={planTenant}
          onClose={() => setPlanTenant(null)}
        />
      )}
      {suspendTenant && (
        <SuspendModal
          tenant={suspendTenant}
          onClose={() => setSuspendTenant(null)}
        />
      )}

      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_60px_80px_140px_200px] px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Organization</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Plan</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Users</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">MRR</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Discount</span>
          <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[12.5px] text-[#9CA3AF]">
            No tenants yet.
          </div>
        ) : (
          tenants.map((t, i) => {
            const summary = discountSummary(t.discountType, t.discountValue);
            const isSuspended = t.status === "suspended";
            return (
              <div
                key={t.id}
                className={`grid grid-cols-[1fr_80px_60px_80px_140px_200px] px-5 py-3 border-b border-[#F9FAFB] items-center ${
                  i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                } ${isSuspended ? "opacity-60" : ""}`}
                data-testid={`row-tenant-${t.slug}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-medium text-[#111827]">{t.name}</div>
                    {isSuspended && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">
                        Suspended
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF]">
                    {t.slug} · joined {format(new Date(t.createdAt), "MMM yyyy")}
                  </div>
                </div>
                <span className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full w-fit ${planPillClass(t.plan)}`}>
                  {t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}
                </span>
                <span className="text-[12.5px] text-[#374151] tabular-nums">
                  {t.userCount}
                </span>
                <span className="text-[12.5px] font-semibold text-[#111827] tabular-nums">
                  {t.mrr > 0 ? `$${t.mrr}` : "-"}
                </span>
                <div>
                  {summary ? (
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {summary}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#9CA3AF]">-</span>
                  )}
                </div>
                <div className="flex gap-1.5 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11.5px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] px-2"
                    onClick={() => setPlanTenant(t)}
                    title="Change plan / seats"
                  >
                    <Settings2 className="w-3 h-3 mr-1" />
                    Plan
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11.5px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] px-2"
                    onClick={() => setManagingTenant(t)}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    Disc.
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-[11.5px] px-2 border ${
                      isSuspended
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        : "text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
                    }`}
                    onClick={() => setSuspendTenant(t)}
                  >
                    {isSuspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </BackofficeLayout>
  );
}
