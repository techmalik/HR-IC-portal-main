export interface Competitor {
  name: string;
  oneLiner: string;
  pricingModel: string;
  pricingTiers: string[];
  fundingHeadcount: string;
  recentLaunches: string[];
  strengths: string[];
  weaknesses: string[];
  citations: { label: string; url: string }[];
  positioning: { x: number; y: number };
}

export const competitors: Competitor[] = [
  {
    name: "Deel",
    oneLiner:
      "All-in-one global payroll, EOR, and contractor platform serving 35,000+ companies across 150 countries.",
    pricingModel: "Per-contractor monthly fee, EOR seat fee, payroll add-ons.",
    pricingTiers: [
      "Contractors: from $49/contractor/month",
      "EOR: from $599/employee/month",
      "Global Payroll: custom",
      "Deel HR: free up to 200 employees",
    ],
    fundingHeadcount:
      "$679M total funding (Series D, May 2022 at $12B valuation). ~5,000 employees.",
    recentLaunches: [
      "Deel IT (device management) launched 2024",
      "Deel Engage (performance + onboarding) GA 2024",
      "Deel AI assistant rolled out 2025",
    ],
    strengths: [
      "Broadest country coverage (150+) with legal entities the team owns",
      "Polished contractor onboarding, NDA/MSA library, and bulk pay flows",
      "Strong brand recognition and SOC 2 / ISO 27001 / GDPR posture",
    ],
    weaknesses: [
      "Pricing opaque on enterprise tiers; $49 floor is high for SMB-only contractor teams",
      "G2 reviewers cite slow support response on edge-case tax/compliance tickets",
      "Feature sprawl makes the product feel heavy for ops teams that only need timesheets + invoices",
    ],
    citations: [
      { label: "deel.com/pricing", url: "https://www.deel.com/pricing" },
      { label: "Crunchbase: Deel", url: "https://www.crunchbase.com/organization/deel" },
      { label: "G2: Deel reviews", url: "https://www.g2.com/products/deel/reviews" },
    ],
    positioning: { x: 0.85, y: 0.8 },
  },
  {
    name: "Remote",
    oneLiner:
      "Owned-entity EOR and contractor platform marketed on transparent pricing and IP protection.",
    pricingModel: "Flat per-seat fees with public, non-negotiated pricing.",
    pricingTiers: [
      "Contractor Management: $29/contractor/month",
      "EOR: $599/employee/month",
      "Global Payroll: from $50/employee/month",
      "Remote Talent (free job board)",
    ],
    fundingHeadcount:
      "$496M total funding (Series C, Apr 2022 at $3B+ valuation). ~1,400 employees.",
    recentLaunches: [
      "Remote API + embedded EOR (2024)",
      "Remote Equity (RSU/options for global teams) 2024",
      "AI-assisted compliance reviews 2025",
    ],
    strengths: [
      "Public pricing builds buyer trust; lower contractor seat fee than Deel",
      "Owns 100% of legal entities (no third-party partners), for a cleaner liability story",
      "Strong IP-assignment templates valued by venture-backed buyers",
    ],
    weaknesses: [
      "Smaller country footprint than Deel; some APAC corridors lag",
      "Reviewers report a heavier UI for purely contractor (non-EOR) workflows",
      "Reporting/exports less flexible than Rippling for finance teams",
    ],
    citations: [
      { label: "remote.com/pricing", url: "https://remote.com/pricing" },
      { label: "Crunchbase: Remote", url: "https://www.crunchbase.com/organization/remote-2" },
      { label: "G2: Remote reviews", url: "https://www.g2.com/products/remote-com/reviews" },
    ],
    positioning: { x: 0.78, y: 0.7 },
  },
  {
    name: "Rippling",
    oneLiner:
      "Contractor module inside Rippling's unified HR/IT/Finance platform: strong if you already run Rippling.",
    pricingModel: "Per-employee bundled with Rippling Unity platform fee.",
    pricingTiers: [
      "Platform fee: from $8/user/month",
      "Contractor Payments: ~$29/contractor/month (US) / $49 (intl)",
      "EOR add-on: from $499/employee/month",
    ],
    fundingHeadcount:
      "$1.4B+ total funding (Series F, 2024 at $13.5B valuation). ~3,500 employees.",
    recentLaunches: [
      "Rippling Spend (corporate cards + bills) integrated with contractor payouts (2024)",
      "Global payroll expansion to 50+ countries (2024)",
      "Rippling AI workflows (2025)",
    ],
    strengths: [
      "Best-in-class identity, device, and app provisioning bundled with contractor lifecycle",
      "Native approval workflows + custom reports rivaled only by Workday at this price",
      "Single source of truth across HR, IT, finance; strong for 50+ employee orgs",
    ],
    weaknesses: [
      "Requires buying the Unity platform, not viable for contractor-only buyers",
      "Steep learning curve; admins report 4-6 weeks to fully configure",
      "Contractor experience UI feels secondary to the employee experience",
    ],
    citations: [
      { label: "rippling.com/contractors", url: "https://www.rippling.com/contractors" },
      { label: "Crunchbase: Rippling", url: "https://www.crunchbase.com/organization/rippling" },
      { label: "G2: Rippling reviews", url: "https://www.g2.com/products/rippling/reviews" },
    ],
    positioning: { x: 0.7, y: 0.92 },
  },
  {
    name: "Worksuite",
    oneLiner:
      "Freelancer management system (FMS) focused on agencies and enterprises with 100+ contributors.",
    pricingModel: "Tiered SaaS with onboarding fee; usage-based add-ons.",
    pricingTiers: [
      "Core: from $1,500/month (up to 100 freelancers)",
      "Pro: custom (workflow automation, SSO)",
      "Enterprise: custom (SOC 2, dedicated CSM)",
    ],
    fundingHeadcount:
      "$15M Series A (2022, undisclosed valuation). ~120 employees.",
    recentLaunches: [
      "Compliance Center for AB5/IR35 status checks (2024)",
      "AI-matched freelancer talent pools (2025)",
      "Localized payments in 35 currencies (2024)",
    ],
    strengths: [
      "Built specifically for freelancer ops: workflows feel native, not bolted-on",
      "Strong vendor onboarding/compliance forms (W-9, W-8BEN, NDA flows)",
      "Talent pool + ratings make repeat-hire workflows fast for agencies",
    ],
    weaknesses: [
      "$1,500/month floor pushes out SMB and seed-stage SaaS teams",
      "UI feels dated vs Deel/Remote per recent G2 reviews",
      "Limited native integrations (Slack, QuickBooks) compared to Rippling",
    ],
    citations: [
      { label: "worksuite.com/pricing", url: "https://worksuite.com/pricing" },
      { label: "Crunchbase: Worksuite", url: "https://www.crunchbase.com/organization/shortlist" },
      { label: "G2: Worksuite reviews", url: "https://www.g2.com/products/worksuite-formerly-shortlist/reviews" },
    ],
    positioning: { x: 0.45, y: 0.55 },
  },
  {
    name: "Bonsai",
    oneLiner:
      "Freelancer-side workspace (proposals, contracts, invoices) repositioning toward small-team agencies.",
    pricingModel: "Per-user SaaS, contractor self-pays primarily.",
    pricingTiers: [
      "Starter: $25/month",
      "Professional: $39/month",
      "Business: $79/month",
      "Bonsai Tax (US only): $10/month add-on",
    ],
    fundingHeadcount:
      "$15.4M Series A (2021). ~80 employees.",
    recentLaunches: [
      "Bonsai Agency (multi-seat collaboration) 2024",
      "Project profitability dashboards 2024",
      "Stripe-native global payments expansion 2025",
    ],
    strengths: [
      "Loved by freelancers: proposal/contract templates are best-in-class",
      "Affordable for very small teams (1-10 users)",
      "Tax + accounting features bundled (US contractors)",
    ],
    weaknesses: [
      "Not designed for buy-side (company managing N contractors); permissions model is thin",
      "No real EOR or compliance coverage for international hires",
      "Reporting + audit trails insufficient for finance teams above ~10 contractors",
    ],
    citations: [
      { label: "hellobonsai.com/pricing", url: "https://www.hellobonsai.com/pricing" },
      { label: "Crunchbase: Bonsai", url: "https://www.crunchbase.com/organization/hello-bonsai" },
      { label: "G2: Bonsai reviews", url: "https://www.g2.com/products/bonsai/reviews" },
    ],
    positioning: { x: 0.2, y: 0.3 },
  },
  {
    name: "Plane",
    oneLiner:
      "Modern global payroll + contractor payments platform pitched as the 'developer-friendly Deel alternative.'",
    pricingModel: "Per-contractor and per-employee monthly fees.",
    pricingTiers: [
      "Contractors: from $39/contractor/month",
      "International payroll: from $499/employee/month",
      "US payroll: from $39/employee/month",
    ],
    fundingHeadcount:
      "$50M+ total funding (Series B, 2022). ~120 employees. (Formerly Pilot.co)",
    recentLaunches: [
      "Plane API + webhooks for engineering teams (2024)",
      "Same-day USD ACH for US contractors (2024)",
      "Localized benefits in 12 countries (2025)",
    ],
    strengths: [
      "Clean, fast UI, favored by ops teams at YC-stage SaaS companies",
      "Transparent pricing and a real free tier for very small teams",
      "API-first posture appeals to technical buyers",
    ],
    weaknesses: [
      "Country coverage thinner than Deel/Remote (~80 vs 150)",
      "Limited HRIS depth (no performance reviews, no native goal tracking)",
      "Mid-market reporting gaps surface above ~50 contractors",
    ],
    citations: [
      { label: "plane.com/pricing", url: "https://www.plane.com/pricing" },
      { label: "Crunchbase: Plane (Pilot)", url: "https://www.crunchbase.com/organization/pilot-co" },
      { label: "G2: Plane reviews", url: "https://www.g2.com/products/plane/reviews" },
    ],
    positioning: { x: 0.4, y: 0.6 },
  },
  {
    name: "Multiplier",
    oneLiner:
      "EOR + contractor platform with strong APAC presence and aggressive SMB pricing.",
    pricingModel: "Per-seat monthly with regional pricing variation.",
    pricingTiers: [
      "Contractors: from $40/contractor/month",
      "EOR: from $400/employee/month",
      "Global Payroll: custom",
    ],
    fundingHeadcount:
      "$87M total funding (Series B, 2022 at ~$400M). ~600 employees.",
    recentLaunches: [
      "Multiplier API for embedded payroll (2024)",
      "Crypto payouts pilot in select corridors (2024)",
      "AI-assisted contract localization (2025)",
    ],
    strengths: [
      "Strong APAC and EMEA coverage; competitive EOR pricing",
      "Faster onboarding times reported vs Deel for India/SE Asia hires",
      "Built-in equity management for international employees",
    ],
    weaknesses: [
      "Brand awareness in North America still limited",
      "Reviewers cite occasional inconsistencies in country-specific tax filings",
      "UI/UX behind Plane and Remote per recent G2 commentary",
    ],
    citations: [
      { label: "usemultiplier.com/pricing", url: "https://www.usemultiplier.com/pricing" },
      { label: "Crunchbase: Multiplier", url: "https://www.crunchbase.com/organization/multiplier-1c93" },
      { label: "G2: Multiplier reviews", url: "https://www.g2.com/products/multiplier/reviews" },
    ],
    positioning: { x: 0.55, y: 0.65 },
  },
];

export interface FeatureRow {
  feature: string;
  weight: number;
  scores: Record<string, number>;
}

export const featureMatrix: FeatureRow[] = [
  { feature: "Timesheet capture + approval", weight: 5, scores: { Axle: 5, Deel: 3, Remote: 3, Rippling: 4, Worksuite: 4, Bonsai: 2, Plane: 3, Multiplier: 3 } },
  { feature: "Invoice review + audit trail", weight: 5, scores: { Axle: 5, Deel: 4, Remote: 4, Rippling: 4, Worksuite: 4, Bonsai: 3, Plane: 4, Multiplier: 3 } },
  { feature: "OOO / leave tracking", weight: 4, scores: { Axle: 5, Deel: 3, Remote: 3, Rippling: 4, Worksuite: 3, Bonsai: 1, Plane: 2, Multiplier: 3 } },
  { feature: "Performance evaluations", weight: 4, scores: { Axle: 4, Deel: 4, Remote: 3, Rippling: 5, Worksuite: 2, Bonsai: 1, Plane: 1, Multiplier: 2 } },
  { feature: "Approval workflows / RBAC", weight: 5, scores: { Axle: 4, Deel: 3, Remote: 3, Rippling: 5, Worksuite: 4, Bonsai: 2, Plane: 3, Multiplier: 3 } },
  { feature: "EOR / global payroll", weight: 3, scores: { Axle: 0, Deel: 5, Remote: 5, Rippling: 4, Worksuite: 2, Bonsai: 0, Plane: 4, Multiplier: 5 } },
  { feature: "Country coverage breadth", weight: 3, scores: { Axle: 2, Deel: 5, Remote: 5, Rippling: 4, Worksuite: 4, Bonsai: 3, Plane: 3, Multiplier: 4 } },
  { feature: "Setup speed (time to first invoice)", weight: 4, scores: { Axle: 5, Deel: 3, Remote: 3, Rippling: 2, Worksuite: 3, Bonsai: 4, Plane: 4, Multiplier: 3 } },
  { feature: "Pricing accessibility (SMB)", weight: 4, scores: { Axle: 5, Deel: 2, Remote: 3, Rippling: 2, Worksuite: 1, Bonsai: 4, Plane: 4, Multiplier: 3 } },
  { feature: "Reporting + CSV/PDF exports", weight: 4, scores: { Axle: 4, Deel: 3, Remote: 3, Rippling: 5, Worksuite: 3, Bonsai: 2, Plane: 3, Multiplier: 3 } },
  { feature: "Audit-ready compliance trail", weight: 4, scores: { Axle: 4, Deel: 4, Remote: 4, Rippling: 4, Worksuite: 4, Bonsai: 2, Plane: 3, Multiplier: 3 } },
];

export interface KanoItem {
  feature: string;
  category: string;
  notes: string;
}

export const kanoAnalysis: KanoItem[] = [
  { feature: "Timesheet approval gates", category: "Must-have", notes: "Buyers don't celebrate it but churn fast without it." },
  { feature: "Invoice ↔ timesheet linking", category: "Performance", notes: "More automation = more buyer love. Owned by Axle." },
  { feature: "OOO calendar with team view", category: "Performance", notes: "Differentiator vs Deel/Remote which treat OOO as afterthought." },
  { feature: "EOR coverage in 150 countries", category: "Must-have (for global buyers)", notes: "Table stakes if buyer hires globally; out of scope for Axle's ICP." },
  { feature: "Performance review cycles", category: "Delighter", notes: "Rare in contractor-only tools; strong wedge against Bonsai/Plane." },
  { feature: "Branded contractor portal", category: "Delighter", notes: "No competitor offers white-label out of the box for SMB." },
  { feature: "Slack/Teams notifications", category: "Indifferent (today) / Performance (12mo)", notes: "Everyone will ship it; staying behind risks downgrade." },
];

export const positioningStatement = {
  forWhom: "SaaS ops leaders, founders, and HR managers running 5–200 independent contractors",
  whoNeed: "to replace spreadsheets and email threads with a single approval-driven workflow, without buying an EOR they don't need",
  product: "Axle is a contractor operations platform",
  category: "(contractor management, NOT EOR/payroll)",
  benefit: "that delivers timesheets, invoices, OOO, and performance reviews in one approval-gated workflow",
  unlike: "Unlike Deel, Remote, and Multiplier (which bundle EOR you may not need) or Bonsai (built for the freelancer side, not the buyer)",
  weAlone: "Axle gives the buying company a structured, audit-ready ops layer in under a day, with pricing that scales from 3 contractors to 200, no implementation team required.",
};

export const recommendations = [
  {
    title: "Own 'Contractor Ops in a Day' as your category wedge",
    body: "Deel, Rippling, and Worksuite all require multi-week implementations. Lead every page, demo, and ad with a 'live in under a day' guarantee, and back it with a self-serve free tier that produces an approved invoice on day one. This is the SMB white space competitors structurally cannot defend without cannibalizing their EOR ASP.",
    battlecard: [
      "Q to ask buyer: 'How long did your last HR/payroll tool take to actually go live?'",
      "Q to ask buyer: 'When you only need timesheet + invoice approvals, are you OK paying for an EOR seat you'll never use?'",
      "Trap: Ask Deel/Rippling reps for a one-day onboarding SLA in writing. They won't give it.",
    ],
  },
  {
    title: "Double down on approval-gated workflows as your moat",
    body: "Every G2 weakness for Bonsai, Plane, and even Worksuite cites missing or weak approval chains. Axle's invoice ↔ timesheet linkage is already best-in-class: productize it as 'Compliance Mode' with audit exports, role-bounded supervisors, and a public security page (SOC 2 plan, encryption, access logs). This converts the silent feature into a procurement-stage differentiator.",
    battlecard: [
      "Q to ask buyer: 'When finance audits last quarter's contractor spend, can you produce timesheet → invoice → approver → timestamp in one click today?'",
      "Q to ask buyer: 'Who can see contractor banking details in your current tool? Can a supervisor see another supervisor's team?'",
      "Trap: Bonsai has no team RBAC; Plane has flat permissions. Demo this side-by-side.",
    ],
  },
  {
    title: "Build a 'we don't do EOR (and that's the point)' positioning page",
    body: "The biggest brand risk is being mistaken for a Deel-lite. April Dunford's playbook says: name the category you're NOT in, loudly. Ship a comparison page (`/contractor-management-vs-eor`) that explains exactly when a buyer should choose Axle vs Deel/Remote, including a pricing calculator that proves a 25-contractor team saves $15k+/year by not buying EOR. This earns SEO traffic for 'Deel alternative for contractors only' searches and disarms the 'why not just use Deel?' objection in sales.",
    battlecard: [
      "Q to ask buyer: 'How many of your contractors will ever convert to EOR employees?' (Usually <10%)",
      "Q to ask buyer: 'Are you willing to pay 4x the per-seat cost for the optionality of converting that 10%?'",
      "Trap: Have prospect price out 25 contractors on Deel ($1,225/mo) vs Axle Pro ($350/mo); let math close.",
    ],
  },
];

export const whiteSpace = [
  "SMB-priced contractor-only tool with real RBAC (Bonsai/Plane miss this; Deel/Worksuite are too expensive)",
  "Sub-day onboarding with a self-serve free tier that produces real value",
  "Contractor-side performance reviews bundled in (only Rippling has this, and it requires the full Unity bundle)",
  "Audit-ready exports designed for finance, not HR (CSV + PDF + linked artifacts)",
  "Transparent 'no EOR' positioning: every competitor is racing toward EOR upsell, leaving the contractor-only buyer underserved",
];

export interface PricingRow {
  name: string;
  monthlyFor25: number;
  perSeat: string;
  isAxle?: boolean;
  note?: string;
}

export const pricingComparison: PricingRow[] = [
  { name: "Worksuite", monthlyFor25: 1500, perSeat: "flat floor", note: "Minimum spend regardless of contractor count" },
  { name: "Deel", monthlyFor25: 1225, perSeat: "$49/IC", note: "Plus implementation cost" },
  { name: "Plane", monthlyFor25: 975, perSeat: "$39/IC" },
  { name: "Remote", monthlyFor25: 725, perSeat: "$29/IC" },
  { name: "Multiplier", monthlyFor25: 1000, perSeat: "$40/IC" },
  { name: "Axle Pro (proposed)", monthlyFor25: 350, perSeat: "$14/IC", isAxle: true, note: "Saves $6,000–$15,000/year vs Deel" },
];

export interface PricingTier {
  name: string;
  price: string;
  limit: string;
  features: string[];
  highlight?: boolean;
}

export const newPricingTiers: PricingTier[] = [
  {
    name: "Free",
    price: "Free for 1 month",
    limit: "Up to 3 contractors",
    features: [
      "Timesheets + invoice approval",
      "OOO requests",
      "1 admin seat",
      "No credit card required",
    ],
  },
  {
    name: "Starter",
    price: "$9 / IC / month",
    limit: "Up to 25 contractors",
    features: [
      "Everything in Free",
      "Unlimited admin + supervisor seats",
      "CSV + PDF exports",
      "Email notifications",
    ],
    highlight: true,
  },
  {
    name: "Pro",
    price: "$14 / IC / month",
    limit: "Up to 100 contractors",
    features: [
      "Everything in Starter",
      "Performance evaluations",
      "Expense tracking + approval",
      "Audit-ready compliance exports",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    limit: "100+ contractors",
    features: [
      "Everything in Pro",
      "SSO / SAML",
      "Audit API access",
      "Dedicated CSM",
    ],
  },
];

export interface TargetSegment {
  label: string;
  description: string;
  size: string;
  channels: string[];
}

export const targetSegments: TargetSegment[] = [
  {
    label: "Primary: Series A–C SaaS startups",
    description: "10–80 contractors across 3–10 countries. No dedicated HR team: the founder or ops lead manages contractors in Notion or Sheets. They need compliance and audit trails without enterprise pricing.",
    size: "Est. 15,000–25,000 companies globally in this band",
    channels: [
      "YC Alumni network and Slack communities",
      "Indie Hackers and Product Hunt",
      "LinkedIn: 'Head of Operations' + 'startup' + 'remote team'",
      "Cold outbound to founders who recently raised (Crunchbase signals)",
    ],
  },
  {
    label: "Secondary: Agencies and studios",
    description: "Design, dev, and content agencies with revolving contractor rosters. They need timesheet capture and invoice approval, not payroll. Monthly churn of contractors means easy onboarding is the top priority.",
    size: "Est. 50,000+ agencies with 5+ contractors in the US/EU",
    channels: [
      "Agency-specific Slack communities (Bureau of Digital, INDIEHACKERS_AGENCY)",
      "Dribbble / Behance agency accounts",
      "LinkedIn: 'Creative Director' + 'agency' + 'freelancers'",
    ],
  },
];
