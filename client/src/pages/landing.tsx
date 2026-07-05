import { useLocation } from "wouter";
import { usePageMeta } from "@/lib/use-page-meta";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronRight,
  Check,
  Clock,
  Calendar,
  FileText,
  Award,
  Users,
  ShieldCheck,
} from "lucide-react";

function LogoMark({ size = 28, color = "#111827" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className="shrink-0">
      <circle cx="14" cy="14" r="11.5" stroke={color} strokeWidth="2" />
      <circle cx="14" cy="14" r="4" fill={color} />
    </svg>
  );
}

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blog" },
];

const features = [
  {
    icon: Clock,
    title: "Timesheet management",
    description:
      "Calendar-based monthly time logging. Daily notes, running totals, and one-click submit with a full approval trail.",
  },
  {
    icon: Calendar,
    title: "Leave and OOO requests",
    description: "Submit and track time off in seconds. Managers see team conflicts and approve with one click.",
  },
  {
    icon: FileText,
    title: "Invoice management",
    description: "Upload invoices or generate them from timesheets. Store IBAN and SWIFT once. Finance gets a clean approval queue.",
  },
  {
    icon: Award,
    title: "Performance evaluations",
    description: "Self and peer reviews across a 7-level seniority framework. Invite reviewers, track progress, view history.",
  },
  {
    icon: Users,
    title: "Team oversight",
    description: "Supervisors see the whole team in one view. Pending approvals, who's out, and evaluation status, surfaced automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Admin and compliance",
    description: "Audit logs, role-based access, and org-wide reporting. Bulk CSV import. SSO on enterprise plans.",
  },
];

const steps = [
  {
    number: "01",
    title: "Invite contractors",
    description: "Send an email invite. Contractors set up their profile and start submitting in under 5 minutes.",
    dark: true,
  },
  {
    number: "02",
    title: "Configure workflows",
    description: "Set approval chains and leave policies once. Everything runs automatically from there.",
    dark: true,
  },
  {
    number: "03",
    title: "Approve and pay",
    description: "Review timesheets, approve invoices, and export to payroll, all from one consolidated view.",
    dark: false,
  },
];

const plans = [
  {
    name: "Free",
    tagline: "For small teams just getting started",
    price: "$0",
    seats: "Up to 3 contractors",
    cta: "Get started",
    highlight: false,
    features: ["Timesheet management", "Leave tracking", "Basic invoicing"],
  },
  {
    name: "Starter",
    tagline: "Growing teams that need structure",
    price: "$29",
    seats: "Up to 10 contractors/mo",
    cta: "Get started",
    highlight: false,
    features: ["Everything in Free", "Performance evaluations", "Team dashboards"],
  },
  {
    name: "Pro",
    tagline: "Teams that move fast",
    price: "$79",
    seats: "Up to 50 contractors/mo",
    cta: "Get started",
    highlight: true,
    features: ["Everything in Starter", "Advanced reporting", "Priority support"],
  },
  {
    name: "Enterprise",
    tagline: "Large orgs with compliance needs",
    price: "Custom",
    seats: "Unlimited contractors",
    cta: "Contact sales",
    highlight: false,
    features: ["Everything in Pro", "Dedicated account manager", "SSO and advanced security"],
  },
];

const dotGridBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='11' stroke='%23111827' stroke-width='1.5' fill='none'/%3E%3Ccircle cx='30' cy='30' r='3.5' fill='%23111827'/%3E%3C/svg%3E\")";

const darkDotBg =
  "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  usePageMeta({
    title: "Axle — Contractor Management Platform",
    description: "Axle helps companies manage independent contractors with timesheets, invoices, leave tracking, and performance reviews — all in one place.",
    canonical: "https://axle.run/",
  });

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="h-16 bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-full px-6 lg:px-12 flex items-center">
          <a href="/" className="flex items-center gap-2.5 mr-12 no-underline">
            <LogoMark size={28} color="#111827" />
            <span className="text-gray-900 text-base font-bold tracking-tight">Axle</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 flex-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-gray-500 text-sm font-medium no-underline hover:text-gray-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4 ml-auto md:ml-0">
            <button
              onClick={() => setLocation("/login")}
              className="text-gray-500 text-sm font-medium hover:text-gray-900 transition-colors"
              data-testid="button-nav-login"
            >
              Sign in
            </button>
            <Button size="sm" onClick={() => setLocation("/signup")} data-testid="button-nav-signup">
              Get started
            </Button>
          </div>
        </div>
      </header>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white py-20 sm:py-24">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.045]"
          style={{ backgroundImage: dotGridBg, backgroundSize: "60px 60px" }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white via-transparent to-white" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full pl-3.5 pr-3 py-1.5 bg-white shadow-sm mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-gray-700 text-[12.5px] font-medium">New, expense management is live</span>
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </div>

            <h1 className="font-serif font-normal text-gray-900 text-5xl sm:text-6xl leading-[1.08] tracking-tight mb-6">
              <em>Finally,</em> contractor ops without the chaos.
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
              Timesheets, invoices, leave, and evaluations, in one place. Built for teams that run on independent contractors.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Button size="lg" onClick={() => setLocation("/signup")} data-testid="button-hero-get-started">
                Get started free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToHowItWorks} data-testid="button-hero-demo">
                See how it works
              </Button>
            </div>
            <p className="text-gray-400 text-xs">No credit card required. Free for up to 3 contractors. </p>
          </div>

          {/* Right: app screenshot mockup */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gray-200">
              {/* Browser chrome */}
              <div className="h-9 bg-gray-50 border-b border-gray-200 flex items-center px-3.5 gap-2">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 max-w-xs mx-auto bg-white border border-gray-200 rounded-md py-1 px-3 text-center">
                  <span className="text-gray-400 text-[11px]">app.axlehq.app/dashboard</span>
                </div>
              </div>
              {/* Mini app */}
              <div className="flex h-[380px] sm:h-[430px]">
                {/* Mini sidebar */}
                <div className="w-36 bg-sidebar shrink-0 p-2 pt-2.5 hidden sm:block">
                  <div className="flex items-center gap-2 px-1.5 pb-3 mb-2 border-b border-white/[0.06]">
                    <LogoMark size={16} color="white" />
                    <span className="text-gray-50 text-xs font-bold tracking-tight">Axle</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-1" style={{ background: "rgba(5,150,105,0.12)" }}>
                    <div className="w-3 h-3 rounded-sm bg-emerald-400/70" />
                    <span className="text-emerald-400 text-[11px] font-semibold">Dashboard</span>
                  </div>
                  <div className="px-2 pt-2.5 pb-1 text-[8px] font-semibold tracking-widest uppercase text-gray-600">My Work</div>
                  {["Time Off", "Timesheets", "Invoices", "Evaluations"].map((label) => (
                    <div key={label} className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-1">
                      <div className="w-3 h-3 rounded-sm bg-gray-600" />
                      <span className="text-gray-400 text-[11px]">{label}</span>
                    </div>
                  ))}
                </div>
                {/* Mini content */}
                <div className="flex-1 bg-gray-50 overflow-hidden">
                  <div className="h-9 bg-white border-b border-gray-200 flex items-center px-3.5">
                    <span className="text-gray-400 text-[10px]">Dashboard</span>
                  </div>
                  <div className="p-3.5">
                    <div className="text-gray-900 text-xs font-semibold mb-2.5">Good morning, Sarah</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
                      <div className="bg-white border border-gray-200 rounded-md p-2.5">
                        <div className="text-gray-900 text-base font-bold mb-0.5 tabular-nums">142</div>
                        <div className="text-gray-400 text-[8.5px]">Hours logged</div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-md p-2.5">
                        <div className="text-gray-900 text-base font-bold mb-0.5">$8,400</div>
                        <div className="text-gray-400 text-[8.5px]">Outstanding</div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-md p-2.5 hidden sm:block">
                        <div className="text-gray-900 text-base font-bold mb-0.5">3</div>
                        <div className="text-gray-400 text-[8.5px]">Days OOO</div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-md p-2.5 hidden sm:block">
                        <div className="text-gray-900 text-base font-bold mb-0.5">3</div>
                        <div className="text-gray-400 text-[8.5px]">Evaluations</div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-100 text-gray-900 text-[10.5px] font-semibold">
                        Recent activity
                      </div>
                      {[
                        { label: "June timesheet approved", meta: "Jul 1", status: "Approved", tone: "green" },
                        { label: "Invoice #007 submitted", meta: "Jul 2 · $4,200", status: "Pending", tone: "amber" },
                        { label: "OOO Jul 21-23 approved", meta: "Jun 28", status: "Approved", tone: "green" },
                      ].map((row) => (
                        <div key={row.label} className="px-3 py-1.5 flex items-center justify-between border-b border-gray-50 last:border-b-0">
                          <div>
                            <div className="text-gray-700 text-[10px] font-medium">{row.label}</div>
                            <div className="text-gray-400 text-[9px]">{row.meta}</div>
                          </div>
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                              row.tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Social proof strip */}
      <section className="bg-gray-50 border-y border-gray-100 py-5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-wrap items-center gap-x-10 gap-y-2">
          <span className="text-gray-400 text-xs font-medium whitespace-nowrap">Built for teams that run on contractors</span>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {[
              { icon: Clock, label: "Timesheets" },
              { icon: FileText, label: "Invoices" },
              { icon: Calendar, label: "Leave tracking" },
              { icon: Award, label: "Evaluations" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>
      {/* Features */}
      <section id="features" className="bg-white py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-14">
            <div className="inline-block bg-emerald-50 text-primary text-[11px] font-semibold px-3 py-1 rounded-full mb-3.5 tracking-wide">
              FEATURES
            </div>
            <h2 className="font-serif font-normal text-gray-900 text-3xl sm:text-4xl mb-3.5">
              Everything your team needs to run smoothly
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
              From first timesheet to final payment, Axle handles the operational layer so your contractors can focus on the work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden max-w-5xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white p-8">
                <feature.icon className="w-5 h-5 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-gray-900 text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-[13.5px] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* How it works */}
      <section id="how-it-works" className="bg-gray-50 border-t border-gray-100 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-14">
            <div className="inline-block bg-emerald-50 text-primary text-[11px] font-semibold px-3 py-1 rounded-full mb-3.5 tracking-wide">
              HOW IT WORKS
            </div>
            <h2 className="font-serif font-normal text-gray-900 text-3xl sm:text-4xl mb-3.5">Up and running in minutes</h2>
            <p className="text-gray-500 text-lg max-w-md mx-auto">
              No onboarding sessions. No implementation weeks. Invite your team and go.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-[22px] left-[calc(16.7%+22px)] right-[calc(16.7%+22px)] h-px bg-gradient-to-r from-gray-200 via-primary to-gray-200" />
            {steps.map((step) => (
              <div key={step.number} className="text-center relative z-10">
                <div
                  className={`w-11 h-11 rounded-[10px] flex items-center justify-center mx-auto mb-4 ${
                    step.dark ? "bg-gray-900" : "bg-primary"
                  }`}
                >
                  <span className="text-white text-sm font-bold">{step.number}</span>
                </div>
                <h3 className="text-gray-900 text-[17px] font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-500 text-[13.5px] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Pricing */}
      <section id="pricing" className="bg-white border-t border-gray-100 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-14">
            <div className="inline-block bg-emerald-50 text-primary text-[11px] font-semibold px-3 py-1 rounded-full mb-3.5 tracking-wide">
              PRICING
            </div>
            <h2 className="font-serif font-normal text-gray-900 text-3xl sm:text-4xl mb-3">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-lg">Start free. Scale as you grow. No surprises.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 flex flex-col ${
                  plan.highlight
                    ? "bg-gray-900 border border-gray-900"
                    : "bg-white border-[1.5px] border-gray-200"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-3.5 right-3.5 bg-white/10 text-white text-[9.5px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                    POPULAR
                  </div>
                )}
                <div className={`text-[15px] font-semibold mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </div>
                <div className={`text-[13px] mb-6 ${plan.highlight ? "text-white/50" : "text-gray-500"}`}>{plan.tagline}</div>
                <div className={`text-[38px] font-bold mb-0.5 tracking-tight ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                  {plan.price}
                </div>
                <div className={`text-xs mb-5 ${plan.highlight ? "text-white/40" : "text-gray-400"}`}>{plan.seats}</div>
                <Button
                  className="mb-5 w-full"
                  variant={plan.highlight ? "default" : plan.name === "Enterprise" ? "default" : "secondary"}
                  onClick={() =>
                    plan.name === "Enterprise"
                      ? window.open("mailto:sales@axlehq.app")
                      : setLocation("/signup")
                  }
                  data-testid={`button-plan-${plan.name.toLowerCase()}`}
                >
                  {plan.cta}
                </Button>
                <div className="flex flex-col gap-2">
                  {plan.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${plan.highlight ? "text-emerald-400" : "text-primary"}`} strokeWidth={2.5} />
                      <span className={`text-[13px] ${plan.highlight ? "text-white/65" : "text-gray-500"}`}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA dark */}
      <section className="relative overflow-hidden bg-sidebar py-20 sm:py-24 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: darkDotBg, backgroundSize: "28px 28px" }}
        />
        <div className="relative max-w-2xl mx-auto px-6">
          <h2 className="font-serif font-normal text-gray-50 text-4xl sm:text-5xl mb-4">
            Ready to bring order to contractor ops?
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-9 max-w-lg mx-auto">
            Run your contractor operations without the spreadsheet chaos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Button size="lg" onClick={() => setLocation("/signup")} data-testid="button-cta-signup">
              Start for free
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToHowItWorks}
              className="border-white/10 bg-white/[0.06] text-gray-300 hover:bg-white/10"
              data-testid="button-cta-demo"
            >
              Book a demo
            </Button>
          </div>
          <p className="text-gray-600 text-xs mt-4">No credit card required. Free up to 3 contractors.</p>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-[#0A0D12] border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-9">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-3.5">
                <LogoMark size={22} color="white" />
                <span className="text-gray-50 text-[15px] font-bold tracking-tight">Axle</span>
              </div>
              <p className="text-gray-600 text-[13px] leading-relaxed max-w-xs">
                The modern platform for managing independent contractors, from first timesheet to final payment.
              </p>
            </div>
            <div>
              <div className="text-gray-600 text-[10px] font-bold tracking-widest uppercase mb-3">Product</div>
              <div className="flex flex-col gap-2">
                <a href="#features" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  Features
                </a>
                <a href="#pricing" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  Pricing
                </a>
                <a href="/blog" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  Changelog
                </a>
              </div>
            </div>
            <div>
              <div className="text-gray-600 text-[10px] font-bold tracking-widest uppercase mb-3">Resources</div>
              <div className="flex flex-col gap-2">
                <a href="#" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  Documentation
                </a>
                <a href="/blog" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  Blog
                </a>
                <a href="#" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  Support
                </a>
              </div>
            </div>
            <div>
              <div className="text-gray-600 text-[10px] font-bold tracking-widest uppercase mb-3">Company</div>
              <div className="flex flex-col gap-2">
                <a href="#" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  About
                </a>
                <a href="#" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  Careers
                </a>
                <a href="#" className="text-gray-500 text-[13px] no-underline hover:text-gray-300 transition-colors">
                  Privacy
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.04] pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-gray-600 text-xs">© {new Date().getFullYear()} Axle. All rights reserved.</span>
            <span className="text-gray-600 text-xs">Built for teams that run on contractors</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
