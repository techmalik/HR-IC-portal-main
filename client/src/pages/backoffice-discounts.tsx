import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const API = "/api/backoffice/discount-codes";

function typeBadge(type: string, value: number) {
  if (type === "percentage") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#ECFDF5] text-[#065F46]">
        {value}% off
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
      ${value} off
    </span>
  );
}

interface FormState {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: string;
  active: boolean;
  expiresAt: string;
}

const BLANK: FormState = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  active: true,
  expiresAt: "",
};

function DiscountForm({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial: FormState;
  onCancel: () => void;
  onSave: (f: FormState) => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (v: unknown) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-[12px] text-[#374151]">Code *</Label>
          <Input
            className="h-8 text-[13px] uppercase"
            placeholder="e.g. LAUNCH50"
            value={f.code}
            onChange={(e) => set("code")(e.target.value.toUpperCase())}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px] text-[#374151]">Description</Label>
          <Input
            className="h-8 text-[13px]"
            placeholder="Optional note"
            value={f.description}
            onChange={(e) => set("description")(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-[12px] text-[#374151]">Type *</Label>
          <select
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
            value={f.type}
            onChange={(e) => set("type")(e.target.value as "percentage" | "fixed")}
            disabled={saving}
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed amount ($)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[12px] text-[#374151]">
            Value * {f.type === "percentage" ? "(0–100)" : "($ amount)"}
          </Label>
          <Input
            className="h-8 text-[13px]"
            type="number"
            min={0}
            max={f.type === "percentage" ? 100 : undefined}
            placeholder={f.type === "percentage" ? "e.g. 20" : "e.g. 10"}
            value={f.value}
            onChange={(e) => set("value")(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px] text-[#374151]">Expires at (optional)</Label>
          <Input
            className="h-8 text-[13px]"
            type="date"
            value={f.expiresAt}
            onChange={(e) => set("expiresAt")(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => set("active")(!f.active)}
          disabled={saving}
          className="focus:outline-none"
        >
          {f.active ? (
            <ToggleRight className="w-6 h-6 text-[#059669]" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-[#9CA3AF]" />
          )}
        </button>
        <span className="text-[12.5px] text-[#374151]">{f.active ? "Active" : "Inactive"}</span>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving} className="text-[12.5px]">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(f)} disabled={saving} className="text-[12.5px]">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Save
        </Button>
      </div>
    </div>
  );
}

export default function BackofficeDiscountsPage() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: codes = [], isLoading } = useQuery<DiscountCode[]>({
    queryKey: [API],
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: async (f: FormState) => {
      const res = await fetch(API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: f.code,
          description: f.description || null,
          type: f.type,
          value: Number(f.value),
          active: f.active,
          expiresAt: f.expiresAt || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to create discount code");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API] });
      setShowCreate(false);
      toast({ title: "Discount code created" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: FormState }) => {
      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: f.description || null,
          type: f.type,
          value: Number(f.value),
          active: f.active,
          expiresAt: f.expiresAt || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API] });
      setEditId(null);
      toast({ title: "Discount code updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [API] }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API] });
      toast({ title: "Discount code deleted" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function toFormState(c: DiscountCode): FormState {
    return {
      code: c.code,
      description: c.description ?? "",
      type: c.type as "percentage" | "fixed",
      value: String(c.value),
      active: c.active,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
    };
  }

  return (
    <BackofficeLayout
      title="Discount codes"
      actions={
        !showCreate && (
          <Button
            size="sm"
            className="h-8 text-[12.5px] gap-1.5"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-3.5 h-3.5" /> New code
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {showCreate && (
          <DiscountForm
            initial={BLANK}
            onCancel={() => setShowCreate(false)}
            onSave={(f) => createMutation.mutate(f)}
            saving={createMutation.isPending}
          />
        )}

        {isLoading ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
          </div>
        ) : codes.length === 0 && !showCreate ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
              <Plus className="w-5 h-5 text-[#9CA3AF]" />
            </div>
            <p className="text-[13px] text-[#6B7280]">No discount codes yet.</p>
            <Button size="sm" className="text-[12.5px]" onClick={() => setShowCreate(true)}>
              Create your first code
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_100px_130px_100px_120px] px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Code</span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Discount</span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Status</span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Expires</span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Created</span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase text-right">Actions</span>
            </div>
            {codes.map((c, i) => (
              <div key={c.id}>
                {editId === c.id ? (
                  <div className="px-5 py-4 border-b border-[#F3F4F6]">
                    <DiscountForm
                      initial={toFormState(c)}
                      onCancel={() => setEditId(null)}
                      onSave={(f) => updateMutation.mutate({ id: c.id, f })}
                      saving={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div
                    className={`grid grid-cols-[1fr_120px_100px_130px_100px_120px] px-5 py-3 border-b border-[#F9FAFB] items-center ${
                      i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                    }`}
                  >
                    <div>
                      <div className="text-[13px] font-mono font-semibold text-[#111827]">{c.code}</div>
                      {c.description && (
                        <div className="text-[11.5px] text-[#9CA3AF] mt-0.5">{c.description}</div>
                      )}
                    </div>
                    <div>{typeBadge(c.type, c.value)}</div>
                    <div>
                      <button
                        onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                        disabled={toggleMutation.isPending}
                        className="flex items-center gap-1.5 focus:outline-none"
                      >
                        {c.active ? (
                          <>
                            <ToggleRight className="w-5 h-5 text-[#059669]" />
                            <span className="text-[12px] font-medium text-[#059669]">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5 text-[#9CA3AF]" />
                            <span className="text-[12px] font-medium text-[#9CA3AF]">Inactive</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[12.5px] text-[#6B7280]">
                      {c.expiresAt ? format(new Date(c.expiresAt), "MMM d, yyyy") : "—"}
                    </div>
                    <div className="text-[12.5px] text-[#6B7280]">
                      {format(new Date(c.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="flex gap-1.5 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-[#9CA3AF] hover:text-[#374151]"
                        onClick={() => setEditId(c.id)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-[#9CA3AF] hover:text-red-500"
                        onClick={() => {
                          if (confirm(`Delete "${c.code}"? This will not affect tenants already using it.`)) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BackofficeLayout>
  );
}
