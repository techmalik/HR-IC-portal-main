import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Layers,
  Clock,
  CalendarOff,
  FileText,
  BarChart3,
  Check,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Timesheet Management",
    description:
      "Track daily hours, submit monthly timesheets, and manage approvals with an intuitive calendar interface.",
  },
  {
    icon: CalendarOff,
    title: "Leave Tracking",
    description:
      "Handle out-of-office requests, half-day leave, and vacation scheduling with automated approval workflows.",
  },
  {
    icon: FileText,
    title: "Invoicing",
    description:
      "Upload, review, and approve contractor invoices with line-item detail and automatic calculations.",
  },
  {
    icon: BarChart3,
    title: "Performance Evaluations",
    description:
      "Run structured review cycles with self-assessments, manager ratings, and 360° peer feedback.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    seats: "Up to 3 contractors",
    highlight: false,
    features: [
      "Timesheet management",
      "Leave tracking",
      "Basic invoicing",
      "Email notifications",
    ],
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    seats: "Up to 10 contractors",
    highlight: false,
    features: [
      "Everything in Free",
      "Performance evaluations",
      "Team dashboards",
      "Activity logs",
    ],
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    seats: "Up to 50 contractors",
    highlight: true,
    features: [
      "Everything in Starter",
      "Advanced reporting",
      "Custom workflows",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    seats: "Unlimited contractors",
    highlight: false,
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "SSO & advanced security",
      "Custom integrations",
    ],
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">TeamFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLocation("/login")}>
              Login
            </Button>
            <Button onClick={() => setLocation("/signup")}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Manage your contractors,{" "}
            <span className="text-primary">effortlessly</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground">
            Timesheets, leave tracking, invoicing, and performance reviews — all
            in one platform built for teams that work with independent
            contractors.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => setLocation("/signup")}>
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything you need to manage contractors
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From onboarding to payment, TeamFlow streamlines every step of
              working with independent contractors.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border border-border">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as your team grows. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`border relative ${
                  plan.highlight
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : "border-border"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.seats}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => setLocation("/signup")}
                  >
                    {plan.name === "Enterprise"
                      ? "Contact Sales"
                      : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Layers className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">TeamFlow</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button
                onClick={() => setLocation("/login")}
                className="hover:text-foreground transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => setLocation("/signup")}
                className="hover:text-foreground transition-colors"
              >
                Sign Up
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} TeamFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
