import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Check, CreditCard, Users, Calendar, ArrowRight, Tag, AlertTriangle, Clock, XCircle, RefreshCw, Mail, Pencil } from "lucide-react";
import { PLAN_LIMITS, type SubscriptionPlanType } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

interface BillingData {
  subscription: {
    id: string;
    organizationId: string;
    plan: string;
    status: string;
    seatCount: number;
    maxSeats: number;
    currentPeriodStart: string;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    createdAt: string;
    updatedAt: string;
    appliedDiscountId: string | null;
    discountType: string | null;
    discountValue: number | null;
    paystackCustomerCode: string | null;
    paystackSubscriptionCode: string | null;
    billingCurrency: string | null;
    scheduledDowngradeAt: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    billingEmail: string | null;
  };
  billing?: {
    basePrice: number;
    netPrice: number;
    discountType: string | null;
    discountValue: number | null;
    discountCode: { code: string; description: string | null } | null;
  };
}

interface UsageData {
  currentSeats: number;
  maxSeats: number;
  plan: string;
  percentUsed: number;
  trialEndsAt: string | null;
  trialExpired: boolean;
  daysLeftInTrial: number | null;
  estimatedMonthlyCost: number;
}

interface CurrencyData {
  currency: "NGN" | "USD" | "EUR";
  prices: Record<string, Record<string, string>>;
}

interface SubscriptionStatusData {
  nextPaymentDate: string | null;
  status: string | null;
  planCode: string | null;
  currency: string | null;
  emailToken: string | null;
  scheduledDowngradeAt: string | null;
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "Up to 3 contractors (30-day trial)",
    "Timesheet management",
    "Leave tracking",
    "Basic invoicing",
  ],
  starter: [
    "Up to 25 contractors",
    "Everything in Free",
    "Performance evaluations",
    "Priority support",
  ],
  pro: [
    "Up to 100 contractors",
    "Everything in Starter",
    "Advanced analytics",
    "Custom branding",
  ],
  enterprise: [
    "Unlimited contractors",
    "Everything in Pro",
    "Dedicated support",
    "Custom integrations",
    "SLA guarantee",
  ],
};

const CURRENCY_SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", EUR: "€" };

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null);
  const [editingBillingEmail, setEditingBillingEmail] = useState(false);
  const [billingEmailValue, setBillingEmailValue] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const planParam = params.get("plan");
    if (planParam && ["starter", "pro"].includes(planParam)) {
      setHighlightedPlan(planParam);
      setTimeout(() => {
        document.getElementById("plan-cards")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
    if (payment === "success") {
      toast({
        title: "Payment successful",
        description: "Your plan has been upgraded. Changes take effect immediately.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription-status"] });
      window.history.replaceState({}, "", "/billing");
    } else if (payment === "failed") {
      toast({
        title: "Payment not completed",
        description: "Your plan was not changed. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  const { data: billing, isLoading: billingLoading } = useQuery<BillingData>({
    queryKey: ["/api/billing"],
    queryFn: async () => {
      const res = await fetch("/api/billing", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch billing data");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/billing/usage"],
    queryFn: async () => {
      const res = await fetch("/api/billing/usage", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage data");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: currencyData } = useQuery<CurrencyData>({
    queryKey: ["/api/billing/detect-currency"],
    queryFn: async () => {
      const res = await fetch("/api/billing/detect-currency", { credentials: "include" });
      if (!res.ok) return { currency: "USD", prices: {} };
      return res.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });

  const hasPaystackSub = !!billing?.subscription?.paystackSubscriptionCode;

  const { data: subStatus } = useQuery<SubscriptionStatusData>({
    queryKey: ["/api/billing/subscription-status"],
    queryFn: async () => {
      const res = await fetch("/api/billing/subscription-status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription status");
      return res.json();
    },
    enabled: !!user && hasPaystackSub,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const activeCurrency: "NGN" | "USD" | "EUR" =
    (billing?.subscription?.billingCurrency as "NGN" | "USD" | "EUR") ||
    (subStatus?.currency as "NGN" | "USD" | "EUR") ||
    currencyData?.currency ||
    "USD";

  const subscribeMutation = useMutation({
    mutationFn: async ({ plan, currency }: { plan: string; currency: string }) => {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, currency }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start checkout");
      }
      return res.json() as Promise<{ authorization_url: string; reference: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start checkout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async (newPlan: string) => {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: newPlan }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change plan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/usage"] });
      toast({
        title: "Plan updated",
        description: "Your subscription plan has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel subscription");
      }
      return res.json() as Promise<{ scheduledDowngradeAt: string | null; message: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription-status"] });
      toast({
        title: "Subscription cancelled",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reauthMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/reauth-link", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate payment link");
      }
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Could not generate payment link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/reactivate-subscription", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresCheckout) return { requiresCheckout: true };
        throw new Error(data.error || "Failed to reactivate");
      }
      return data as { message: string };
    },
    onSuccess: (data: any) => {
      if (data.requiresCheckout) {
        subscribeMutation.mutate({ plan: currentPlan, currency: activeCurrency });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription-status"] });
      toast({ title: "Subscription reactivated", description: "Your subscription is active again." });
    },
    onError: (error: Error) => {
      toast({ title: "Reactivation failed", description: error.message, variant: "destructive" });
    },
  });

  const billingEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/billing/billing-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ billingEmail: email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update billing email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      setEditingBillingEmail(false);
      toast({ title: "Billing email updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  if (billingLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = (billing?.subscription?.plan || "free") as SubscriptionPlanType;
  const planInfo = PLAN_LIMITS[currentPlan];
  const seatCount = usage?.currentSeats || 0;
  const maxSeats = usage?.maxSeats || planInfo?.maxSeats || 3;
  const percentUsed = maxSeats > 0 ? Math.round((seatCount / maxSeats) * 100) : 0;
  const trialExpired = usage?.trialExpired ?? false;
  const daysLeftInTrial = usage?.daysLeftInTrial ?? null;
  const estimatedMonthlyCost = usage?.estimatedMonthlyCost ?? 0;

  const subDbStatus = billing?.subscription?.status || "active";
  const isPastDue = subDbStatus === "past_due";
  const isSuspended = subDbStatus === "suspended";
  const scheduledDowngradeAt = billing?.subscription?.scheduledDowngradeAt || subStatus?.scheduledDowngradeAt || null;

  const plans: SubscriptionPlanType[] = ["free", "starter", "pro", "enterprise"];

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "canceled":
      case "non-renewing":
        return <StatusBadge status="declined" />;
      case "past_due":
      case "attention":
        return <StatusBadge status="pending" />;
      case "suspended":
        return <StatusBadge status="declined" />;
      default:
        return <StatusBadge status={status} />;
    }
  };

  const getPriceLabel = (plan: string) => {
    const prices = currencyData?.prices;
    if (prices && prices[plan] && prices[plan][activeCurrency]) {
      return `${prices[plan][activeCurrency]}/IC/mo`;
    }
    const info = PLAN_LIMITS[plan as SubscriptionPlanType];
    return `$${info?.unitPrice}/IC/mo`;
  };

  const handleUpgrade = (plan: string) => {
    subscribeMutation.mutate({ plan, currency: activeCurrency });
  };

  const handleDowngrade = (plan: string) => {
    changePlanMutation.mutate(plan);
  };

  const isMutating = subscribeMutation.isPending || changePlanMutation.isPending || cancelMutation.isPending;

  const nextPaymentDate = subStatus?.nextPaymentDate || null;
  const liveStatus = subStatus?.status || null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-[28px] font-normal text-neutral-900">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription plan and seat usage
        </p>
      </div>

      {/* Past-due payment warning */}
      {isPastDue && hasPaystackSub && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-[1.5px] border-red-200 bg-red-50 text-red-800">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Payment failed — your account is past due</p>
            <p className="text-sm mt-0.5">
              We couldn't charge your card. Update your payment method to restore full access.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white shrink-0"
            onClick={() => reauthMutation.mutate()}
            disabled={reauthMutation.isPending}
          >
            {reauthMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update payment method"}
          </Button>
        </div>
      )}

      {/* Suspended account warning */}
      {isSuspended && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-[1.5px] border-red-200 bg-red-50 text-red-800">
          <XCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Account suspended</p>
            <p className="text-sm mt-0.5">
              Your subscription has been suspended. Please contact support to restore access.
            </p>
          </div>
        </div>
      )}

      {/* Scheduled downgrade notice */}
      {scheduledDowngradeAt && !isSuspended && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-[1.5px] border-amber-200 bg-amber-50 text-amber-800">
          <Clock className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Subscription ending</p>
            <p className="text-sm mt-0.5">
              Your plan will revert to Free on {formatDate(scheduledDowngradeAt)}. You keep full access until then.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-800 shrink-0"
            onClick={() => reactivateMutation.mutate()}
            disabled={isMutating || reactivateMutation.isPending}
          >
            {reactivateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reactivate"}
          </Button>
        </div>
      )}

      {/* Trial expired banner */}
      {trialExpired && !hasPaystackSub && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-[1.5px] border-red-200 bg-red-50 text-red-800">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Your free trial has ended</p>
            <p className="text-sm mt-0.5">
              You can no longer add new users. Upgrade to a paid plan to continue growing your team.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white shrink-0"
            onClick={() => handleUpgrade("starter")}
            disabled={isMutating}
          >
            {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade now"}
          </Button>
        </div>
      )}

      {/* Trial countdown badge */}
      {!trialExpired && daysLeftInTrial !== null && currentPlan === "free" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border-[1.5px] border-amber-200 bg-amber-50 text-amber-800">
          <Clock className="w-5 h-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {daysLeftInTrial === 0 ? "Trial expires today" : `${daysLeftInTrial} day${daysLeftInTrial === 1 ? "" : "s"} left in your free trial`}
            </p>
            <p className="text-sm mt-0.5">
              Trial ends {formatDate(usage?.trialEndsAt)}. Upgrade any time to keep adding contractors.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Current plan card */}
        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2 flex items-center gap-1.5">
            <CreditCard className="w-3 h-3" /> Current plan
          </div>
          <div className="text-[22px] font-bold text-neutral-900 mb-1.5">{planInfo?.name || "Free"}</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {getStatusBadge(liveStatus || subDbStatus)}
              {currentPlan === "free" ? (
                <span className="text-xs text-neutral-500">Free trial</span>
              ) : currentPlan === "enterprise" ? (
                <span className="text-xs text-neutral-500">Custom pricing</span>
              ) : (
                <span className="text-xs text-neutral-500">{getPriceLabel(currentPlan)}</span>
              )}
              {billing?.billing?.discountType && (
                <span className="text-xs font-semibold text-emerald-600">
                  {CURRENCY_SYMBOL[activeCurrency] || "$"}{billing.billing.netPrice}/mo
                </span>
              )}
            </div>
            {billing?.billing?.discountCode && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Tag className="w-3 h-3 text-emerald-600" />
                <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  {billing.billing.discountCode.code}
                </span>
                {billing.billing.discountType === "percentage" ? (
                  <span className="text-[11px] text-neutral-500">
                    {billing.billing.discountValue}% discount applied
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-500">
                    {CURRENCY_SYMBOL[activeCurrency] || "$"}{billing.billing.discountValue} discount applied
                  </span>
                )}
              </div>
            )}
            {activeCurrency && (
              <span className="text-[10px] text-neutral-400 mt-0.5">Billing in {activeCurrency}</span>
            )}
          </div>
        </div>

        {/* Seat usage card */}
        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2 flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Seat usage
          </div>
          <div className="text-[26px] font-bold text-neutral-900 mb-1.5">{seatCount} / {maxSeats}</div>
          <Progress value={percentUsed} className="h-1.5 mb-1" />
          <p className="text-xs text-neutral-500">{percentUsed}% of seats used</p>
          {estimatedMonthlyCost > 0 && (
            <p className="text-xs text-emerald-700 font-medium mt-1">
              Est. {CURRENCY_SYMBOL[activeCurrency] || "$"}{estimatedMonthlyCost}/mo at current usage
            </p>
          )}
        </div>

        {/* Billing period / next payment card */}
        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> {currentPlan === "free" ? "Trial period" : "Next payment"}
          </div>
          {currentPlan === "free" ? (
            <>
              <div className="text-[22px] font-bold text-neutral-900 mb-1.5">
                {trialExpired ? "Expired" : "Active"}
              </div>
              <p className="text-xs text-neutral-500">
                Trial {trialExpired ? "ended" : "ends"} {formatDate(billing?.subscription?.trialEndsAt)}
              </p>
            </>
          ) : (
            <>
              <div className="text-[22px] font-bold text-neutral-900 mb-1.5">
                {nextPaymentDate ? formatDate(nextPaymentDate) : (scheduledDowngradeAt ? "Cancelled" : "—")}
              </div>
              {nextPaymentDate && !scheduledDowngradeAt && (
                <p className="text-xs text-neutral-500">Auto-renews on this date</p>
              )}
              {scheduledDowngradeAt && (
                <p className="text-xs text-amber-600 font-medium">Reverts to Free on {formatDate(scheduledDowngradeAt)}</p>
              )}
              {billing?.subscription?.currentPeriodStart && !nextPaymentDate && (
                <p className="text-xs text-neutral-500">
                  Started {formatDate(billing.subscription.currentPeriodStart)}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Live subscription panel — shown when org has an active Paystack subscription */}
      {hasPaystackSub && currentPlan !== "free" && (
        <Card className="border-[1.5px] border-neutral-200 rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13.5px] font-semibold text-neutral-900">Current subscription</CardTitle>
              {!scheduledDowngradeAt && !isPastDue && !isSuspended && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-1.5" />
                      )}
                      Cancel subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll keep access to your current plan until the end of the billing period.
                        After that, your account will automatically revert to the Free plan (max 3 contractors).
                        You can resubscribe at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => cancelMutation.mutate()}
                      >
                        Yes, cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Plan</p>
                <p className="font-semibold text-sm">{planInfo?.name || currentPlan}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Billing currency</p>
                <p className="font-semibold text-sm">{activeCurrency}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <div>{getStatusBadge(liveStatus || subDbStatus)}</div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {scheduledDowngradeAt ? "Reverts to Free on" : "Next payment"}
                </p>
                <p className="font-semibold text-sm">
                  {scheduledDowngradeAt
                    ? formatDate(scheduledDowngradeAt)
                    : nextPaymentDate
                    ? formatDate(nextPaymentDate)
                    : "—"}
                </p>
              </div>
            </div>

            {isPastDue && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 flex-1">
                  Payment failed. Update your card to avoid losing access.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                  onClick={() => reauthMutation.mutate()}
                  disabled={reauthMutation.isPending}
                >
                  {reauthMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Update card</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan cards */}
      <Card id="plan-cards" className="border-[1.5px] border-neutral-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-[13.5px] font-semibold text-neutral-900">Choose your plan</CardTitle>
          <CardDescription>
            Per-contractor-per-month — you pay as your team grows
            {activeCurrency && activeCurrency !== "USD" && (
              <span className="ml-1 text-xs text-neutral-500">
                · Prices shown in {activeCurrency}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const info = PLAN_LIMITS[plan];
              const features = PLAN_FEATURES[plan] || [];
              const isCurrent = plan === currentPlan;
              const isUpgrade = plans.indexOf(plan) > plans.indexOf(currentPlan);
              const isPaidPlan = plan !== "free" && plan !== "enterprise";

              const localPrice = isPaidPlan
                ? (currencyData?.prices?.[plan]?.[activeCurrency] || `$${info?.unitPrice}`)
                : null;

              const isHighlighted = highlightedPlan === plan && !isCurrent;
              return (
                <div
                  key={plan}
                  className={`relative rounded-lg border p-5 flex flex-col ${
                    isCurrent
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : isHighlighted
                      ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-300"
                      : plan === "pro"
                      ? "border-emerald-400 bg-emerald-50/40"
                      : "border-border"
                  }`}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Current Plan
                    </Badge>
                  )}
                  {isHighlighted && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white">
                      Recommended
                    </Badge>
                  )}
                  {!isCurrent && !isHighlighted && plan === "pro" && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white">
                      Best value
                    </Badge>
                  )}
                  <h3 className="text-lg font-semibold mt-1">{info.name}</h3>
                  <div className="mt-2 mb-1">
                    {isPaidPlan ? (
                      <span className="text-3xl font-bold">
                        {localPrice}
                        <span className="text-sm font-normal text-muted-foreground">/IC/mo</span>
                      </span>
                    ) : plan === "enterprise" ? (
                      <span className="text-3xl font-bold">Custom</span>
                    ) : (
                      <span className="text-3xl font-bold">Free</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    {plan === "free"
                      ? "7-day trial · no credit card"
                      : plan === "enterprise"
                      ? "Unlimited contractors"
                      : `Up to ${info.maxSeats} contractors`}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : plan === "enterprise" ? (
                    <Button variant="outline" className="w-full" asChild>
                      <a href="mailto:sales@axle.app">Contact Sales</a>
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      variant="default"
                      className={`w-full ${plan === "pro" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      onClick={() => handleUpgrade(plan)}
                      disabled={isMutating}
                    >
                      {subscribeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Upgrade
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDowngrade(plan)}
                      disabled={isMutating}
                    >
                      {changePlanMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Downgrade
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {billing?.organization && (
        <Card className="border-[1.5px] border-neutral-200 rounded-xl">
          <CardHeader>
            <CardTitle className="text-[13.5px] font-semibold text-neutral-900">Organization details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Organization Name</p>
                <p className="font-medium">{billing.organization.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Billing Email</p>
                {editingBillingEmail ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      className="h-8 text-sm"
                      value={billingEmailValue}
                      onChange={(e) => setBillingEmailValue(e.target.value)}
                      placeholder="billing@yourcompany.com"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs px-3"
                      disabled={billingEmailMutation.isPending}
                      onClick={() => billingEmailMutation.mutate(billingEmailValue)}
                    >
                      {billingEmailMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs px-3"
                      onClick={() => setEditingBillingEmail(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">{billing.organization.billingEmail || "Not set"}</span>
                    {(user?.role === "owner" || user?.role === "admin") && (
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                        onClick={() => {
                          setBillingEmailValue(billing.organization.billingEmail || "");
                          setEditingBillingEmail(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {billing.subscription.paystackCustomerCode && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment processor</p>
                  <p className="font-medium text-sm text-neutral-600">Paystack · {activeCurrency}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
