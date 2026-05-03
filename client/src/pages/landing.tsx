import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
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
  GitBranch,
  CheckCircle,
  Shield,
  Zap,
  Users,
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

const features = [
  {
    icon: Clock,
    title: "Timesheet Management",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-500",
    bullets: ["Calendar-based daily logging", "1-click supervisor approval", "Automatic monthly rollup"],
    wide: true,
  },
  {
    icon: CalendarOff,
    title: "Leave Tracking",
    color: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-500",
    description: "Handle OOO requests, half-day leave, and vacation scheduling with automated approval workflows.",
    wide: false,
  },
  {
    icon: FileText,
    title: "Invoicing",
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-500",
    description: "Upload, review, and approve contractor invoices with line-item detail and automatic calculations.",
    wide: false,
  },
  {
    icon: BarChart3,
    title: "Performance Evaluations",
    color: "from-orange-500/20 to-orange-600/10",
    iconColor: "text-orange-500",
    description: "Run structured review cycles with self-assessments, manager ratings, and seniority-scale scoring.",
    wide: false,
  },
];

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Invite contractors",
    description: "Send an email invite. Contractors create their own profile and are ready to submit timesheets in minutes.",
  },
  {
    number: "02",
    icon: GitBranch,
    title: "Set up workflows",
    description: "Configure approval chains, leave policies, and invoice rules once. Everything runs on autopilot after that.",
  },
  {
    number: "03",
    icon: CheckCircle,
    title: "Approve & pay",
    description: "Review timesheets, approve invoices, and export to payroll — all from one consolidated view.",
  },
];

const testimonials = [
  {
    quote: "We used to spend two days every month chasing timesheets over email. With TeamFlow, approvals happen the same day. It's changed how our entire ops team works.",
    name: "Sarah M.",
    role: "Operations Manager",
    initials: "SM",
    color: "bg-blue-500",
  },
  {
    quote: "Our contractors are spread across five countries with different payment methods. TeamFlow's invoicing handles all of it without us having to build anything custom.",
    name: "David K.",
    role: "Head of Engineering",
    initials: "DK",
    color: "bg-purple-500",
  },
  {
    quote: "The performance evaluation module finally gave us a structured way to run reviews with our contractors. No more awkward spreadsheets or inconsistent scoring.",
    name: "Priya R.",
    role: "HR Lead",
    initials: "PR",
    color: "bg-emerald-500",
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ─── NAV ─── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">TeamFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors relative group">
              Features
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all group-hover:w-full" />
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors relative group">
              How it works
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all group-hover:w-full" />
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors relative group">
              Pricing
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all group-hover:w-full" />
            </a>
            <a href="/blog" className="hover:text-foreground transition-colors relative group">
              Blog
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all group-hover:w-full" />
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/login")}>
              Login
            </Button>
            <Button size="sm" onClick={() => setLocation("/signup")} className="shadow-sm">
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Background layers */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, hsl(220 80% 50% / 0.12) 0%, transparent 70%), radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: "auto, 32px 32px",
          }}
        />
        <div className="absolute -top-32 -right-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -z-10 pointer-events-none" />
        <div className="absolute -bottom-20 -left-40 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* Left column — copy */}
            <motion.div
              className="flex-1 text-center lg:text-left"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 border border-primary/30 bg-primary/8 text-primary text-sm rounded-full px-4 py-1.5 mb-6 font-medium">
                <span className="text-xs">✦</span>
                Contractor management, simplified
                <ArrowRight className="w-3 h-3" />
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none mb-6"
              >
                Stop chasing<br />
                <span className="text-primary">contractors.</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8"
              >
                Timesheets, leave tracking, invoicing, and performance reviews — all in one platform built for teams that work with independent contractors.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-4">
                <Button
                  size="lg"
                  onClick={() => setLocation("/signup")}
                  className="relative overflow-hidden group shadow-lg shadow-primary/25 text-base px-6"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
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
              <motion.p variants={fadeUp} className="text-xs text-muted-foreground">
                No credit card required · Free plan available
              </motion.p>

              {/* Stats */}
              <motion.div
                variants={fadeUp}
                className="mt-10 flex items-center justify-center lg:justify-start gap-6 divide-x divide-border"
              >
                {[
                  { label: "Teams", value: 500, suffix: "+" },
                  { label: "Timesheets processed", value: 50000, suffix: "+" },
                  { label: "Uptime", value: 99.9, suffix: "%" },
                ].map((stat, i) => (
                  <div key={i} className={i > 0 ? "pl-6" : ""}>
                    <div className="text-2xl font-bold text-foreground">
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
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            >
              <div className="relative">
                {/* Floating badges */}
                <motion.div
                  className="absolute -left-6 top-10 z-10 bg-card border border-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-sm font-medium"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  ✓ Invoice approved
                </motion.div>
                <motion.div
                  className="absolute -right-4 top-1/3 z-10 bg-card border border-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-sm font-medium"
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  3 timesheets pending
                </motion.div>
                <motion.div
                  className="absolute -left-2 bottom-10 z-10 bg-card border border-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-sm font-medium"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  OOO request →
                </motion.div>

                {/* Main mockup card */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
                  {/* Top bar */}
                  <div className="bg-muted/40 border-b border-border/60 px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                      <div className="w-3 h-3 rounded-full bg-green-400/60" />
                    </div>
                    <div className="flex-1 mx-4 bg-background/60 rounded-md h-5 px-2 flex items-center">
                      <div className="w-24 h-2 bg-muted rounded-full" />
                    </div>
                  </div>
                  {/* Dashboard layout */}
                  <div className="flex">
                    {/* Sidebar */}
                    <div className="w-14 bg-[hsl(220,55%,20%)] flex flex-col items-center py-4 gap-3 shrink-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/80 flex items-center justify-center mb-2">
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
                          <div className="h-6 w-20 bg-primary/80 rounded-md" />
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

      {/* ─── TRUSTED BY ─── */}
      <section className="bg-muted/40 border-y border-border/50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">Trusted by teams at</span>
            {["Acme Corp", "BrightPath", "NovaTech", "Meridian", "Apex Labs", "Craft & Co"].map((name) => (
              <span key={name} className="bg-background border border-border/80 rounded-full px-3 py-1 font-medium text-foreground/80 text-xs">
                {name}
              </span>
            ))}
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium shrink-0 ml-2">
              <Zap className="w-3.5 h-3.5" />
              Up and running in 15 minutes
            </span>
          </div>
        </div>
      </section>

      {/* ─── FEATURES BENTO ─── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">
              Features
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Everything in one place
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From onboarding to payment, TeamFlow streamlines every step of working with independent contractors.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerFast}
          >
            {/* Wide card */}
            <motion.div
              variants={fadeUp}
              className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm p-6 shadow-sm overflow-hidden relative group hover:shadow-md transition-shadow"
            >
              <div className="absolute top-0 right-0 w-48 h-48 opacity-30 pointer-events-none">
                <svg viewBox="0 0 200 200" className="w-full h-full text-primary">
                  <defs>
                    <pattern id="cal-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                      <path d="M 25 0 L 0 0 0 25" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
                    </pattern>
                  </defs>
                  <rect width="200" height="200" fill="url(#cal-grid)" />
                </svg>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-4`}>
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Timesheet Management</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Track daily hours, submit monthly timesheets, and manage approvals with an intuitive calendar interface.
              </p>
              <ul className="space-y-2">
                {["Calendar-based daily logging", "1-click supervisor approval", "Automatic monthly rollup"].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Small card — Leave */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mb-4">
                <CalendarOff className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Leave Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Handle OOO requests, half-day leave, and vacation scheduling with automated approval workflows.
              </p>
            </motion.div>

            {/* Small card — Invoicing */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Invoicing</h3>
              <p className="text-sm text-muted-foreground">
                Upload, review, and approve contractor invoices with line-item detail and automatic calculations.
              </p>
            </motion.div>

            {/* Small card — Evaluations */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Performance Evaluations</h3>
              <p className="text-sm text-muted-foreground">
                Run structured review cycles with self-assessments, manager ratings, and seniority-scale scoring.
              </p>
            </motion.div>

            {/* Full-width bottom card */}
            <motion.div
              variants={fadeUp}
              className="md:col-span-2 lg:col-span-3 rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 via-card to-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Enterprise-grade security</h3>
                <p className="text-sm text-muted-foreground">
                  Role-based access control, full audit logs, and session management — your contractor data stays protected.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation("/signup")} className="shrink-0">
                Learn more <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Get your team set up in minutes
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-xl mx-auto">
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
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px border-t-2 border-dashed border-border z-0" />
            <div className="hidden md:block absolute top-12 left-2/3 right-0 h-px border-t-2 border-dashed border-border z-0" style={{ right: "calc(16.67%)" }} />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left"
              >
                <div className="relative mb-5">
                  <span className="absolute -top-3 -left-3 text-7xl font-black text-primary/8 leading-none select-none">
                    {step.number}
                  </span>
                  <div className="relative w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Button onClick={() => setLocation("/signup")} size="lg" className="shadow-lg shadow-primary/20">
              Start for free — it takes 2 minutes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">
              Social proof
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Loved by ops teams
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto">
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
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm cursor-default"
              >
                <div className="text-5xl text-primary/20 font-serif leading-none mb-3 select-none">"</div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-6">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
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

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 sm:py-28 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">
              Pricing
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Start free and scale as your team grows. No hidden fees, no surprises.
            </motion.p>

            {/* Billing toggle */}
            <motion.div variants={fadeUp} className="inline-flex items-center bg-muted rounded-full p-1 gap-1">
              <button
                onClick={() => setIsAnnual(false)}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${!isAnnual ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${isAnnual ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
                  variants={fadeUp}
                  className={`relative rounded-2xl border p-6 flex flex-col transition-shadow hover:shadow-lg ${
                    plan.highlight
                      ? "border-primary/40 bg-gradient-to-b from-primary/5 to-card shadow-lg ring-2 ring-primary/20"
                      : "border-border/60 bg-card shadow-sm"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-lg font-bold">{plan.name}</h3>
                      <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">
                        {plan.seats}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{plan.tagline}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">{price}</span>
                      {period && <span className="text-muted-foreground text-sm">{period}</span>}
                    </div>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => setLocation(plan.name === "Enterprise" ? "#" : "/signup")}
                  >
                    {plan.name === "Enterprise" ? "Contact Sales" : plan.monthlyPrice === 0 ? "Get Started Free" : "Get Started"}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "linear-gradient(135deg, hsl(220,55%,20%) 0%, hsl(220,80%,35%) 60%, hsl(220,80%,50%) 100%)",
          }}
        />
        {/* Dot overlay */}
        <div
          className="absolute inset-0 -z-10 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Glow */}
        <motion.div
          className="absolute inset-0 -z-10 pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.08), transparent)",
          }}
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight">
              Ready to simplify contractor management?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/75 text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of teams who replaced spreadsheet chaos with one clean platform.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setLocation("/signup")}
                className="bg-white text-primary hover:bg-white/90 shadow-xl font-semibold text-base px-8"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-white/60 text-sm">No credit card required</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-card py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Layers className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">TeamFlow</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                The all-in-one platform for teams that work with independent contractors.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Badge variant="outline" className="text-xs gap-1">
                  <Shield className="w-3 h-3" /> SOC 2 Ready
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
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
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
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
