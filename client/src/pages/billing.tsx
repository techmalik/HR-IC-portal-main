import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, CreditCard, Users, Calendar, ArrowRight } from "lucide-react";
import { PLAN_LIMITS, type SubscriptionPlanType } from "@shared/schema";

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
    createdAt: string;
    updatedAt: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    billingEmail: string | null;
  };
}

interface UsageData {
  currentSeats: number;
  maxSeats: number;
  plan: string;
  percentUsed: number;
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "Up to 3 contractors",
    "Timesheet management",
    "Leave tracking",
    "Basic invoicing",
  ],
  starter: [
    "Up to 10 contractors",
    "Everything in Free",
    "Performance evaluations",
    "Priority support",
  ],
  pro: [
    "Up to 50 contractors",
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

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: billing, isLoading: billingLoading } = useQuery<BillingData>({
    queryKey: ["/api/billing"],
    queryFn: async () => {
      const token = localStorage.getItem("teamflow_session_token");
      const res = await fetch("/api/billing", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch billing data");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/billing/usage"],
    queryFn: async () => {
      const token = localStorage.getItem("teamflow_session_token");
      const res = await fetch("/api/billing/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch usage data");
      return res.json();
    },
    enabled: !!user,
  });

  const changePlanMutation = useMutation({
    mutationFn: async (newPlan: string) => {
      const token = localStorage.getItem("teamflow_session_token");
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case "canceled":
        return <Badge variant="destructive">Canceled</Badge>;
      case "past_due":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Past Due</Badge>;
      case "trialing":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Trial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Plan</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {planInfo?.name || "Free"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusBadge(billing?.subscription?.status || "active")}
              {planInfo?.price > 0 && (
                <span className="text-sm text-muted-foreground">
                  ${planInfo.price}/mo
                </span>
              )}
              {planInfo?.price === 0 && currentPlan !== "enterprise" && (
                <span className="text-sm text-muted-foreground">Free</span>
              )}
              {currentPlan === "enterprise" && (
                <span className="text-sm text-muted-foreground">Custom pricing</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Seat Usage</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {seatCount} / {maxSeats}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={percentUsed} className="h-2 mb-1" />
            <p className="text-sm text-muted-foreground">
              {percentUsed}% of seats used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Billing Period</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Current
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Started {formatDate(billing?.subscription?.currentPeriodStart)}
            </p>
            {billing?.subscription?.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Renews {formatDate(billing.subscription.currentPeriodEnd)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose Your Plan</CardTitle>
          <CardDescription>
            Select the plan that best fits your team's needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const info = PLAN_LIMITS[plan];
              const features = PLAN_FEATURES[plan] || [];
              const isCurrent = plan === currentPlan;
              const isDowngrade = plans.indexOf(plan) < plans.indexOf(currentPlan);
              const isUpgrade = plans.indexOf(plan) > plans.indexOf(currentPlan);

              return (
                <div
                  key={plan}
                  className={`relative rounded-lg border p-5 flex flex-col ${
                    isCurrent
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border"
                  }`}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Current Plan
                    </Badge>
                  )}
                  <h3 className="text-lg font-semibold mt-1">{info.name}</h3>
                  <div className="mt-2 mb-4">
                    {info.price > 0 ? (
                      <span className="text-3xl font-bold">${info.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                    ) : plan === "enterprise" ? (
                      <span className="text-3xl font-bold">Custom</span>
                    ) : (
                      <span className="text-3xl font-bold">Free</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Up to {info.maxSeats === 999 ? "unlimited" : info.maxSeats} seats
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
                    <Button variant="outline" className="w-full" disabled>
                      Contact Sales
                    </Button>
                  ) : (
                    <Button
                      variant={isUpgrade ? "default" : "outline"}
                      className="w-full"
                      onClick={() => changePlanMutation.mutate(plan)}
                      disabled={changePlanMutation.isPending}
                    >
                      {changePlanMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                      {isUpgrade && <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {billing?.organization && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Organization Name</p>
                <p className="font-medium">{billing.organization.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing Email</p>
                <p className="font-medium">{billing.organization.billingEmail || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
