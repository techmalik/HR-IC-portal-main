import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tag, X, Loader2 } from "lucide-react";
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
          <h2 className="text-[15px] font-semibold text-[#111827]">Manage discount — {tenant.name}</h2>
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
                <option value="">— Select a code —</option>
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

export default function BackofficeTenantDetailPage() {
  const { toast } = useToast();
  const [managingTenant, setManagingTenant] = useState<Tenant | null>(null);

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

      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_70px_90px_160px_120px] px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
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
            return (
              <div
                key={t.id}
                className={`grid grid-cols-[1fr_90px_70px_90px_160px_120px] px-5 py-3 border-b border-[#F9FAFB] items-center ${
                  i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                }`}
                data-testid={`row-tenant-${t.slug}`}
              >
                <div>
                  <div className="text-[13px] font-medium text-[#111827]">{t.name}</div>
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
                  {t.mrr > 0 ? `$${t.mrr}` : "—"}
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
                    <span className="text-[12px] text-[#9CA3AF]">—</span>
                  )}
                </div>
                <div className="flex gap-1.5 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11.5px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] px-2.5"
                    onClick={() => setManagingTenant(t)}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    Discount
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
