import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useInView, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Clock,
  CalendarOff,
  FileText,
  BarChart3,
  Check,
  ArrowRight,
  UserPlus,
  CheckCircle,
  Shield,
  Zap,
  Users,
  Sparkles,
  Star,
  Workflow,
  Globe,
  TrendingUp,
  Mail,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => {
    if (!Number.isInteger(target)) {
      return (Math.round(v * 10) / 10).toFixed(1) + suffix;
    }
    return Math.round(v).toLocaleString() + suffix;
  });

  useEffect(() => {
    if (inView) motionVal.set(target);
  }, [inView, target, motionVal]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center gap-0.5 mb-3">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

const plans = [
  {
    name: "Free",
    tagline: "For small teams just getting started",
    monthlyPrice: 0,
    seats: "Up to 3 contractors",
    highlight: false,
    features: ["Timesheet management", "Leave tracking", "Basic invoicing", "Email notifications"],
  },
  {
    name: "Starter",
    tagline: "Growing teams that need structure",
    monthlyPrice: 29,
    seats: "Up to 10 contractors",
    highlight: false,
    features: ["Everything in Free", "Performance evaluations", "Team dashboards", "Activity logs"],
  },
  {
    name: "Pro",
    tagline: "Teams that move fast and need control",
    monthlyPrice: 79,
    seats: "Up to 50 contractors",
    highlight: true,
    features: ["Everything in Starter", "Advanced reporting", "Custom workflows", "Priority support"],
  },
  {
    name: "Enterprise",
    tagline: "Large orgs with compliance needs",
    monthlyPrice: null,
    seats: "Unlimited contractors",
    highlight: false,
    features: ["Everything in Pro", "Dedicated account manager", "SSO & advanced security", "Custom integrations"],
  },
];

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Invite contractors",
    description: "Send an email invite. Contractors create their own profile and are ready to submit timesheets in minutes.",
    color: "from-indigo-500 to-violet-500",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
  },
  {
    number: "02",
    icon: Workflow,
    title: "Set up workflows",
    description: "Configure approval chains, leave policies, and invoice rules once. Everything runs on autopilot after that.",
    color: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
  {
    number: "03",
    icon: CheckCircle,
    title: "Approve & pay",
    description: "Review timesheets, approve invoices, and export to payroll — all from one consolidated view.",
    color: "from-purple-500 to-fuchsia-500",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
];

const testimonials = [
  {
    quote: "[Insert customer quote about saving time on timesheet approvals and reducing email back-and-forth with contractors]",
    name: "[Customer name]",
    role: "[Operations Manager / similar role]",
    initials: "OP",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    quote: "[Insert customer quote about managing contractors across multiple countries or handling international invoice payments]",
    name: "[Customer name]",
    role: "[Head of Engineering / similar role]",
    initials: "HE",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    quote: "[Insert customer quote about running structured performance reviews and moving away from spreadsheet-based scoring]",
    name: "[Customer name]",
    role: "[HR Lead / similar role]",
    initials: "HR",
    gradient: "from-purple-500 to-fuchsia-500",
  },
];

const features = [
  {
    icon: Clock,
    title: "Timesheet Management",
    description: "Track daily hours, submit monthly timesheets, and manage approvals with an intuitive calendar interface.",
    bullets: ["Calendar-based daily logging", "1-click supervisor approval", "Automatic monthly rollup"],
    gradient: "from-indigo-500/15 to-violet-500/10",
    iconGradient: "from-indigo-500 to-violet-500",
    iconColor: "text-indigo-500",
    wide: true,
  },
  {
    icon: CalendarOff,
    title: "Leave Tracking",
    description: "Handle OOO requests, half-day leave, and vacation scheduling with automated approval workflows.",
    gradient: "from-violet-500/15 to-purple-500/10",
    iconGradient: "from-violet-500 to-purple-500",
    iconColor: "text-violet-500",
  },
  {
    icon: FileText,
    title: "Invoicing",
    description: "Upload, review, and approve contractor invoices with line-item detail and automatic calculations.",
    gradient: "from-emerald-500/15 to-teal-500/10",
    iconGradient: "from-emerald-500 to-teal-500",
    iconColor: "text-emerald-500",
  },
  {
    icon: BarChart3,
    title: "Performance Evaluations",
    description: "Run structured review cycles with self-assessments, manager ratings, and seniority-scale scoring.",
    gradient: "from-orange-500/15 to-amber-500/10",
    iconGradient: "from-orange-500 to-amber-500",
    iconColor: "text-orange-500",
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const animFadeUp = shouldReduceMotion ? { hidden: {}, visible: {} } : fadeUp;
  const animStagger = shouldReduceMotion ? { hidden: {}, visible: {} } : staggerContainer;
  const animStaggerFast = shouldReduceMotion ? { hidden: {}, visible: {} } : staggerFast;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
              <Layers className="w-4.5 h-4.5 text-white" style={{ width: "18px", height: "18px" }} />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">TeamFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Pricing", href: "#pricing" },
              { label: "Blog", href: "/blog" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-foreground transition-colors relative group py-0.5"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/login")}>
              Login
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation("/signup")}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 border-0 shadow-sm shadow-indigo-500/25 text-white"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Multi-color gradient background */}
        <div className="absolute inset-0 -z-10 bg-background" />
        <div
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full -z-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(245 78% 57% / 0.10) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -top-20 right-0 w-[600px] h-[600px] rounded-full -z-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(280 70% 60% / 0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[500px] h-[400px] rounded-full -z-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(200 80% 55% / 0.07) 0%, transparent 70%)" }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* Left column */}
            <motion.div
              className="flex-1 text-center lg:text-left"
              initial="hidden"
              animate="visible"
              variants={animStagger}
            >
              <motion.div
                variants={animFadeUp}
                className="inline-flex items-center gap-2 border border-indigo-400/30 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 text-sm rounded-full px-4 py-1.5 mb-6 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Contractor management, simplified
                <ArrowRight className="w-3 h-3" />
              </motion.div>

              <motion.h1
                variants={animFadeUp}
                className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none mb-6"
              >
                Stop chasing<br />contractors.<br />
                <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
                  Start managing them.
                </span>
              </motion.h1>

              <motion.p
                variants={animFadeUp}
                className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8"
              >
                Timesheets, leave tracking, invoicing, and performance reviews — all in one platform built for teams that work with independent contractors.
              </motion.p>

              <motion.div variants={animFadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-4">
                <Button
                  size="lg"
                  onClick={() => setLocation("/signup")}
                  className="relative overflow-hidden group shadow-lg shadow-indigo-500/30 text-base px-6 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 border-0 text-white"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-base px-6"
                >
                  See how it works
                </Button>
              </motion.div>
              <motion.p variants={animFadeUp} className="text-xs text-muted-foreground">
                No credit card required · Free plan available
              </motion.p>

              {/* Stats */}
              <motion.div
                variants={animFadeUp}
                className="mt-10 flex items-center justify-center lg:justify-start gap-6 divide-x divide-border"
              >
                {[
                  { label: "Teams", value: 500, suffix: "+" },
                  { label: "Timesheets processed", value: 50000, suffix: "+" },
                  { label: "Uptime", value: 99.9, suffix: "%" },
                ].map((stat, i) => (
                  <div key={i} className={i > 0 ? "pl-6" : ""}>
                    <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right column — dashboard mockup */}
            <motion.div
              className="flex-1 relative w-full max-w-lg lg:max-w-none"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3, duration: 0.7, ease: "easeOut" }}
            >
              <div className="relative">
                {/* Floating badges */}
                <motion.div
                  className="absolute -left-6 top-10 z-10 bg-card border border-border rounded-xl px-3 py-2 shadow-xl shadow-black/10 flex items-center gap-2 text-sm font-medium"
                  animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ willChange: "transform" }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/50" />
                  ✓ Invoice approved
                </motion.div>
                <motion.div
                  className="absolute -right-4 top-1/3 z-10 bg-card border border-border rounded-xl px-3 py-2 shadow-xl shadow-black/10 flex items-center gap-2 text-sm font-medium"
                  animate={shouldReduceMotion ? {} : { y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  style={{ willChange: "transform" }}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-sm shadow-amber-500/50" />
                  3 timesheets pending
                </motion.div>
                <motion.div
                  className="absolute -left-2 bottom-10 z-10 bg-card border border-border rounded-xl px-3 py-2 shadow-xl shadow-black/10 flex items-center gap-2 text-sm font-medium"
                  animate={shouldReduceMotion ? {} : { y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  style={{ willChange: "transform" }}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-sm shadow-indigo-500/50" />
                  OOO request →
                </motion.div>

                {/* Main mockup card */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-2xl shadow-indigo-500/10 overflow-hidden ring-1 ring-indigo-500/10">
                  {/* Top bar */}
                  <div className="bg-muted/40 border-b border-border/60 px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/70" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                      <div className="w-3 h-3 rounded-full bg-green-400/70" />
                    </div>
                    <div className="flex-1 mx-4 bg-background/60 rounded-md h-5 px-2 flex items-center">
                      <div className="w-24 h-2 bg-muted rounded-full" />
                    </div>
                  </div>
                  {/* Dashboard layout */}
                  <div className="flex">
                    {/* Sidebar */}
                    <div
                      className="w-14 flex flex-col items-center py-4 gap-3 shrink-0"
                      style={{ background: "linear-gradient(180deg, #1e1b4b 0%, #2d1b69 100%)" }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center mb-2 shadow-sm shadow-indigo-500/40">
                        <Layers className="w-4 h-4 text-white" />
                      </div>
                      {[Clock, CalendarOff, FileText, BarChart3, Users].map((Icon, i) => (
                        <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? "bg-white/20" : "hover:bg-white/10"}`}>
                          <Icon className="w-4 h-4 text-white/70" />
                        </div>
                      ))}
                    </div>
                    {/* Main content */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="h-3 w-28 bg-foreground/80 rounded-full mb-1.5" />
                          <div className="h-2 w-20 bg-muted-foreground/40 rounded-full" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-6 w-16 bg-muted rounded-md" />
                          <div className="h-6 w-20 rounded-md" style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)" }} />
                        </div>
                      </div>
                      {/* Table */}
                      <div className="border border-border/60 rounded-lg overflow-hidden">
                        <div className="bg-muted/40 grid grid-cols-4 gap-2 px-3 py-2">
                          {["Contractor", "Month", "Hours", "Status"].map((h) => (
                            <div key={h} className="h-2 bg-muted-foreground/40 rounded-full w-3/4" />
                          ))}
                        </div>
                        {[
                          { status: "approved", color: "bg-emerald-500/20 text-emerald-600" },
                          { status: "pending", color: "bg-amber-500/20 text-amber-600" },
                          { status: "draft", color: "bg-muted text-muted-foreground" },
                          { status: "approved", color: "bg-emerald-500/20 text-emerald-600" },
                        ].map((row, i) => (
                          <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2.5 border-t border-border/40 items-center">
                            <div className="h-2 bg-muted/80 rounded-full w-4/5" />
                            <div className="h-2 bg-muted/60 rounded-full w-3/5" />
                            <div className="h-2 bg-muted/60 rounded-full w-2/5" />
                            <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${row.color} w-fit`}>
                              {row.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-purple-500/5 border-y border-indigo-500/10 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="text-muted-foreground shrink-0 text-xs uppercase tracking-wider font-medium">Trusted by teams at</span>
            {["Acme Corp", "BrightPath", "NovaTech", "Meridian", "Apex Labs", "Craft & Co"].map((name) => (
              <span
                key={name}
                className="bg-background border border-border/80 rounded-full px-3 py-1 font-medium text-foreground/70 text-xs hover:border-indigo-400/40 hover:text-foreground transition-colors"
              >
                {name}
              </span>
            ))}
            <span className="hidden sm:block text-border/80 select-none" aria-hidden>|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium shrink-0 text-sm">
              <Zap className="w-3.5 h-3.5" />
              Up and running in 15 minutes
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={animStagger}
          >
            <motion.div variants={animFadeUp} className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-widest uppercase rounded-full px-3 py-1 mb-4">
              <Sparkles className="w-3 h-3" />
              Features
            </motion.div>
            <motion.h2 variants={animFadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Everything in one place
            </motion.h2>
            <motion.p variants={animFadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From onboarding to payment, TeamFlow streamlines every step of working with independent contractors.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={animStaggerFast}
          >
            {/* Wide card — Timesheet */}
            <motion.div
              variants={animFadeUp}
              className="lg:col-span-2 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-card to-violet-500/5 backdrop-blur-sm p-6 shadow-sm overflow-hidden relative group hover:shadow-md hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all"
            >
              <div className="absolute top-0 right-0 w-48 h-48 opacity-20 pointer-events-none">
                <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-500">
                  <defs>
                    <pattern id="cal-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                      <path d="M 25 0 L 0 0 0 25" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.5" />
                    </pattern>
                  </defs>
                  <rect width="200" height="200" fill="url(#cal-grid)" />
                </svg>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-md shadow-indigo-500/30">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Timesheet Management</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Track daily hours, submit monthly timesheets, and manage approvals with an intuitive calendar interface.
              </p>
              <ul className="space-y-2">
                {["Calendar-based daily logging", "1-click supervisor approval", "Automatic monthly rollup"].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-indigo-600" />
                    </div>
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Leave */}
            <motion.div
              variants={animFadeUp}
              className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-card to-purple-500/5 backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:shadow-violet-500/10 hover:border-violet-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-md shadow-violet-500/30">
                <CalendarOff className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Leave Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Handle OOO requests, half-day leave, and vacation scheduling with automated approval workflows.
              </p>
            </motion.div>

            {/* Invoicing */}
            <motion.div
              variants={animFadeUp}
              className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5 backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-md shadow-emerald-500/30">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Invoicing</h3>
              <p className="text-sm text-muted-foreground">
                Upload, review, and approve contractor invoices with line-item detail and automatic calculations.
              </p>
            </motion.div>

            {/* Evaluations */}
            <motion.div
              variants={animFadeUp}
              className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 via-card to-amber-500/5 backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:shadow-orange-500/10 hover:border-orange-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 shadow-md shadow-orange-500/30">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Performance Evaluations</h3>
              <p className="text-sm text-muted-foreground">
                Run structured review cycles with self-assessments, manager ratings, and seniority-scale scoring.
              </p>
            </motion.div>

            {/* Security — full width */}
            <motion.div
              variants={animFadeUp}
              className="md:col-span-2 lg:col-span-3 rounded-2xl border border-border/60 bg-gradient-to-r from-indigo-500/5 via-card to-violet-500/5 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shrink-0 shadow-md shadow-slate-700/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Enterprise-grade security</h3>
                <p className="text-sm text-muted-foreground">
                  Role-based access control, full audit logs, and session management — your contractor data stays protected.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation("/signup")} className="shrink-0 hover:border-indigo-400/40">
                Learn more <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 sm:py-28 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-500/3 via-violet-500/3 to-transparent" />
        <div className="absolute inset-0 -z-10 border-y border-indigo-500/8" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={animStagger}
          >
            <motion.div variants={animFadeUp} className="inline-flex items-center gap-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold tracking-widest uppercase rounded-full px-3 py-1 mb-4">
              <TrendingUp className="w-3 h-3" />
              How it works
            </motion.div>
            <motion.h2 variants={animFadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Get your team set up in minutes
            </motion.h2>
            <motion.p variants={animFadeUp} className="text-lg text-muted-foreground max-w-xl mx-auto">
              Three steps and you're live. No IT department required.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(33%+2rem)] right-[calc(33%+2rem)] h-px z-0"
              style={{ background: "linear-gradient(90deg, #6366f1 0%, #7c3aed 50%, #a855f7 100%)", opacity: 0.3 }}
            />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={animFadeUp}
                className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left"
              >
                <div className="relative mb-5 flex items-center justify-center md:justify-start">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                    style={{ boxShadow: i === 0 ? "0 8px 24px rgba(99,102,241,0.35)" : i === 1 ? "0 8px 24px rgba(124,58,237,0.35)" : "0 8px 24px rgba(168,85,247,0.35)" }}
                  >
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-border text-[10px] font-black text-muted-foreground flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="text-center mt-12"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.4 }}
          >
            <Button
              onClick={() => setLocation("/signup")}
              size="lg"
              className="shadow-lg shadow-indigo-500/25 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 border-0 text-white"
            >
              Start for free — it takes 2 minutes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={animStagger}
          >
            <motion.div variants={animFadeUp} className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-widest uppercase rounded-full px-3 py-1 mb-4">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              Social proof
            </motion.div>
            <motion.h2 variants={animFadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Loved by ops teams
            </motion.h2>
            <motion.p variants={animFadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto">
              From startups to mid-size companies, TeamFlow saves ops teams hours every month.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={animFadeUp}
                whileHover={shouldReduceMotion ? {} : { y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm cursor-default hover:shadow-md hover:border-indigo-500/20 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 opacity-5 pointer-events-none">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${t.gradient}`} />
                </div>
                <StarRating />
                <div className="text-4xl bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent font-serif leading-none mb-3 select-none">"</div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-6 italic">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-indigo-500/3 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={animStagger}
          >
            <motion.div variants={animFadeUp} className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-widest uppercase rounded-full px-3 py-1 mb-4">
              <Zap className="w-3 h-3" />
              Pricing
            </motion.div>
            <motion.h2 variants={animFadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </motion.h2>
            <motion.p variants={animFadeUp} className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Start free and scale as your team grows. No hidden fees, no surprises.
            </motion.p>

            {/* Billing toggle */}
            <motion.div variants={animFadeUp} className="inline-flex items-center bg-muted rounded-full p-1 relative">
              <motion.div
                className="absolute top-1 bottom-1 bg-card rounded-full shadow-sm"
                layoutId="billing-toggle-pill"
                animate={{ x: isAnnual ? "100%" : "0%" }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 }}
                style={{ width: "calc(50% - 2px)", left: 2 }}
              />
              <button
                onClick={() => setIsAnnual(false)}
                className={`relative z-10 px-4 py-1.5 text-sm font-medium rounded-full transition-colors min-w-[90px] ${!isAnnual ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`relative z-10 px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-1.5 min-w-[90px] ${isAnnual ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Annual
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                  -20%
                </span>
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          >
            {plans.map((plan) => {
              const price = plan.monthlyPrice === null
                ? "Custom"
                : plan.monthlyPrice === 0
                  ? "$0"
                  : isAnnual
                    ? `$${Math.round(plan.monthlyPrice * 0.8)}`
                    : `$${plan.monthlyPrice}`;
              const period = plan.monthlyPrice === null ? "" : plan.monthlyPrice === 0 ? "forever" : "/month";

              return (
                <motion.div
                  key={plan.name}
                  variants={animFadeUp}
                  className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                    plan.highlight
                      ? "border-indigo-500/0 shadow-2xl shadow-indigo-500/20 ring-0 scale-[1.02]"
                      : "border-border/60 bg-card shadow-sm hover:shadow-md hover:border-indigo-500/20"
                  }`}
                  style={plan.highlight ? {
                    background: "linear-gradient(145deg, #4f46e5 0%, #6d28d9 60%, #7c3aed 100%)",
                  } : {}}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-white text-indigo-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`text-lg font-bold ${plan.highlight ? "text-white" : ""}`}>{plan.name}</h3>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] shrink-0 mt-0.5 ${plan.highlight ? "bg-white/20 text-white border-white/20" : ""}`}
                      >
                        {plan.seats}
                      </Badge>
                    </div>
                    <p className={`text-xs mb-3 ${plan.highlight ? "text-white/70" : "text-muted-foreground"}`}>{plan.tagline}</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : ""}`}>{price}</span>
                      {period && <span className={`text-sm ${plan.highlight ? "text-white/70" : "text-muted-foreground"}`}>{period}</span>}
                    </div>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${plan.highlight ? "bg-white/25" : "bg-indigo-500/15"}`}>
                          <Check className={`w-2.5 h-2.5 ${plan.highlight ? "text-white" : "text-indigo-600"}`} />
                        </div>
                        <span className={plan.highlight ? "text-white/90" : ""}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      plan.highlight
                        ? "bg-white text-indigo-600 hover:bg-white/90 border-0 font-semibold"
                        : "hover:border-indigo-400/40"
                    }`}
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => plan.name === "Enterprise" ? window.open("mailto:sales@teamflow.com") : setLocation("/signup")}
                  >
                    {plan.name === "Enterprise" ? "Contact Sales" : plan.monthlyPrice === 0 ? "Get Started Free" : "Get Started"}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "linear-gradient(135deg, #0f0c29 0%, #1e1b4b 25%, #312e81 50%, #4c1d95 75%, #6d28d9 100%)",
          }}
        />
        {/* Dot overlay */}
        <div
          className="absolute inset-0 -z-10 opacity-15"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 rounded-full -z-10 pointer-events-none -translate-y-1/2"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)" }}
        />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 rounded-full -z-10 pointer-events-none -translate-y-1/2"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)" }}
        />
        <motion.div
          className="absolute inset-0 -z-10 pointer-events-none"
          animate={shouldReduceMotion ? {} : { opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.05), transparent)",
          }}
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={animStagger}
          >
            <motion.div variants={animFadeUp} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-semibold tracking-wider uppercase rounded-full px-3 py-1 mb-6">
              <Globe className="w-3 h-3" />
              500+ teams worldwide
            </motion.div>
            <motion.h2 variants={animFadeUp} className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight">
              Ready to simplify<br />contractor management?
            </motion.h2>
            <motion.p variants={animFadeUp} className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of teams who replaced spreadsheet chaos with one clean platform.
            </motion.p>
            <motion.div variants={animFadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setLocation("/signup")}
                className="bg-white text-indigo-600 hover:bg-white/90 shadow-2xl shadow-black/30 font-semibold text-base px-8 border-0"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/signup")}
                className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-transparent text-base px-8"
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Sales
              </Button>
            </motion.div>
            <motion.p variants={animFadeUp} className="text-white/50 text-sm mt-4">No credit card required</motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">TeamFlow</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                The all-in-one platform for teams that work with independent contractors.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Badge variant="outline" className="text-xs gap-1 hover:border-indigo-400/40">
                  <Shield className="w-3 h-3" /> SOC 2 Ready
                </Badge>
                <Badge variant="outline" className="text-xs gap-1 hover:border-indigo-400/40">
                  <Zap className="w-3 h-3" /> 99.9% Uptime
                </Badge>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="/blog" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="/faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Resources</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
                <li><a href="/blog" className="hover:text-foreground transition-colors">Articles</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Legal</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="/dpa" className="hover:text-foreground transition-colors">Data Processing Addendum</a></li>
                <li><a href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} TeamFlow. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setLocation("/login")} className="hover:text-foreground transition-colors">
                Login
              </button>
              <button onClick={() => setLocation("/signup")} className="hover:text-foreground transition-colors">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
