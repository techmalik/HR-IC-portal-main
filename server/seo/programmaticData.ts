export type PageStatus = "draft" | "published";

export interface IndustryPage {
  slug: string;
  name: string;
  shortName: string;
  heroTitle: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  painPoints: string[];
  useCases: { title: string; description: string }[];
  faqs: { q: string; a: string }[];
  updatedDate: string;
  status?: PageStatus;
}

export interface CompetitorPage {
  slug: string;
  competitorName: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  positioning: string;
  competitorWeaknesses: string[];
  axleStrengths: string[];
  comparison: { feature: string; axle: string; competitor: string }[];
  pricingNote: string;
  faqs: { q: string; a: string }[];
  updatedDate: string;
  status?: PageStatus;
}

const today = "2025-04-30";

const industryFaqsBase = (name: string) => [
  {
    q: `How is Axle different from generic timesheet apps for ${name}?`,
    a: `Axle is built specifically for teams that work with independent contractors, not employees. The approval workflow gates invoices behind approved timesheets, every action is logged for audit, and the data model fits how ${name} actually engage and pay contractors.`,
  },
  {
    q: `Can ${name} run a global contractor team on Axle?`,
    a: `Yes. Axle records invoices in any currency, supports IBAN/SWIFT bank fields for international wires, and keeps a clean audit trail per contractor, which is exactly what cross-border teams need at month end.`,
  },
  {
    q: `Does Axle handle leave and OOO for contractors?`,
    a: `Yes. Contractors submit OOO requests, supervisors approve them, and approved OOO appears on a shared availability calendar. Hourly contractors don't bill for OOO days, and timesheet validation accounts for it automatically.`,
  },
  {
    q: `Is there a free plan that fits small ${name}?`,
    a: `Yes. Axle's free plan covers up to 3 contractors with full timesheet, invoice, and OOO functionality, plenty to get a small engagement off spreadsheets.`,
  },
];

const industriesData: Omit<IndustryPage, "updatedDate">[] = [
  {
    slug: "marketing-agencies",
    name: "marketing agencies",
    shortName: "agencies",
    heroTitle: "Contractor Management for Marketing Agencies",
    metaTitle: "Contractor Management for Marketing Agencies | Axle",
    metaDescription: "Run a marketing agency without spreadsheet chaos. Axle handles freelancer timesheets, retainer billing, OOO, and approvals, built for agency ops.",
    intro: "Marketing agencies live and die by billable hours. When 60% of your delivery capacity is freelance (copywriters, designers, paid media specialists, video editors), your timesheet and invoice process is your margin. Axle gives agency ops a single place to track contractor hours per client, gate invoices behind supervisor approval, and pull clean utilization reports without piecing together five spreadsheets.",
    painPoints: [
      "Freelancers logging hours in five different formats every month",
      "Retainer overruns nobody noticed until the client complained",
      "Invoice approvals stuck in account-director email threads",
      "No clean way to see contractor utilization across clients",
    ],
    useCases: [
      { title: "Per-client utilization tracking", description: "Tag every timesheet entry with a client or project so you can see exactly how many freelance hours a retainer is actually consuming, before you blow through the budget." },
      { title: "Account-director approval gates", description: "Account directors approve their team's timesheets weekly; only approved hours unlock invoice submission. No more end-of-month reconciliation arguments." },
      { title: "Freelancer roster across services", description: "Manage copywriters, designers, paid media buyers, and developers from one roster, with role-based permissions so each lead only sees their own people." },
      { title: "Cross-currency invoicing", description: "Pay a US copywriter, an EU designer, and a LATAM developer from the same workflow: Axle records each invoice in its native currency." },
    ],
    faqs: industryFaqsBase("marketing agencies"),
  },
  {
    slug: "software-development-firms",
    name: "software development firms",
    shortName: "dev shops",
    heroTitle: "Contractor Management for Software Development Firms",
    metaTitle: "Contractor Management for Software Development Firms | Axle",
    metaDescription: "Manage a contract dev shop without losing margin. Axle runs sprint-aligned timesheets, invoice approvals, and utilization reporting for software teams.",
    intro: "Software shops that bill by the hour need precise contractor records, not because clients won't trust you, but because a single ambiguous timesheet can blow up an audit or a fixed-price scope conversation. Axle gives engineering managers a clean weekly approval flow and finance a paper trail that holds up against an external review.",
    painPoints: [
      "Contractors logging hours in Jira, Toggl, and a Google Sheet, none of which reconcile",
      "Sprint-aligned billing that doesn't match calendar months",
      "Finance manually matching invoices against approved hours",
      "No clean utilization view across active client engagements",
    ],
    useCases: [
      { title: "Sprint-aligned billing periods", description: "Configure custom billing cycles per contractor (bi-weekly for sprint-aligned work, monthly for retainers) without forcing the whole team onto one cadence." },
      { title: "Engineering-manager approval", description: "EMs review and approve their team's timesheets in one screen; once approved, hours flow straight into the invoice approval queue with no manual re-entry." },
      { title: "Per-project hour caps", description: "Set hour caps per contractor per month: a guardrail against scope creep, with automated alerts when a cap is approached." },
      { title: "Audit-ready records", description: "Every approval, edit, and rejection is logged with timestamp and user: the audit trail you'll wish you had if a client ever disputes a bill." },
    ],
    faqs: industryFaqsBase("software development firms"),
  },
  {
    slug: "design-studios",
    name: "design studios",
    shortName: "studios",
    heroTitle: "Contractor Management for Design Studios",
    metaTitle: "Contractor Management for Design Studios | Axle",
    metaDescription: "Track freelance designer hours, approve invoices, and manage OOO across your studio's roster, without the spreadsheet sprawl.",
    intro: "Design studios run on bursts of contractor capacity: illustrators, motion designers, 3D artists who come in for a project and rotate out. The ops challenge isn't tracking employees; it's tracking a constantly-shifting roster of specialists with different rates, currencies, and billing rhythms. Axle is built for exactly that.",
    painPoints: [
      "Onboarding a new freelancer every other week",
      "Different hourly rates per role: illustrator vs. motion vs. 3D",
      "Project-scoped engagements with no clear end date",
      "Studio leads chasing timesheets the night before client billing",
    ],
    useCases: [
      { title: "Roster rotation", description: "Onboard a freelancer in 5 minutes, deactivate them in one click when the project wraps. Their full timesheet and invoice history stays archived for audit." },
      { title: "Per-role rate cards", description: "Different rates per role and per contractor are stored on the contract, surfaced on every timesheet so studio leads can spot anomalies before approval." },
      { title: "Studio-lead approval", description: "Each studio lead approves their team's timesheets and invoices; admins see the full org-wide picture without micromanaging." },
      { title: "Client-tagged hours", description: "Tag hours by client or project for clean retainer reporting and quick studio utilization views." },
    ],
    faqs: industryFaqsBase("design studios"),
  },
  {
    slug: "video-production-companies",
    name: "video production companies",
    shortName: "production teams",
    heroTitle: "Contractor Management for Video Production Companies",
    metaTitle: "Contractor Management for Video Production Companies | Axle",
    metaDescription: "Manage freelance crew, editors, and post-production talent with day rates, OOO, and per-project invoice approvals, built for video shops.",
    intro: "Video production runs on day rates, project-based crews, and tight delivery windows. Axle handles freelance editors, motion designers, sound engineers, and on-set crew with the kind of structured records that survive a year-end audit and a client-side production audit.",
    painPoints: [
      "Day-rate vs. hourly contractors mixed in the same team",
      "Crew rosters that change per project",
      "Post-production hours bleeding into the next billing cycle",
      "Producer chasing invoices from 12 freelancers at month-end",
    ],
    useCases: [
      { title: "Day-rate billing", description: "Track day rates alongside hourly contractors. Day-based logging on shoot days, hourly logging in post: same tool, no friction." },
      { title: "Project rosters", description: "Spin up a project-specific contractor roster in minutes; archive it cleanly when the project wraps." },
      { title: "Producer-led approvals", description: "Producers approve their crew's timesheets weekly so post-production can keep moving without finance being a bottleneck." },
      { title: "Multi-currency crew", description: "Pay editors in the US, sound design in the UK, motion in Argentina: invoices stored in native currency for clean accounting." },
    ],
    faqs: industryFaqsBase("video production companies"),
  },
  {
    slug: "accounting-firms",
    name: "accounting firms",
    shortName: "accounting practices",
    heroTitle: "Contractor Management for Accounting Firms",
    metaTitle: "Contractor Management for Accounting Firms | Axle",
    metaDescription: "Manage seasonal accountants, audit contractors, and per-engagement billing with audit-grade records, built for accounting practice ops.",
    intro: "Accounting practices know structured records, but managing your own contractor roster often happens in a spreadsheet that wouldn't survive your own audit. Axle gives partners and practice managers a clean approval workflow, per-engagement billing, and an audit trail that matches the rigor you apply to your clients.",
    painPoints: [
      "Seasonal contractors during tax and audit busy season",
      "Per-engagement vs. per-hour billing mixed in one team",
      "Compliance with contractor classification rules",
      "Partners approving timesheets between client meetings",
    ],
    useCases: [
      { title: "Seasonal capacity", description: "Onboard 30 seasonal contractors in January, deactivate them cleanly in May. Full historical records preserved for tax-year audit purposes." },
      { title: "Per-engagement billing", description: "Tag hours to specific client engagements; pull engagement-level profitability without manual reconciliation." },
      { title: "Partner approval", description: "Partners approve their direct reports' timesheets in two minutes a week, and only see their own engagements, not the whole firm." },
      { title: "Audit-ready trail", description: "Every approval, every change, every invoice: all logged with timestamps and user IDs. If you're audited yourself, the records are already there." },
    ],
    faqs: industryFaqsBase("accounting firms"),
  },
  {
    slug: "law-firms",
    name: "law firms",
    shortName: "firms",
    heroTitle: "Contractor Management for Law Firms",
    metaTitle: "Contractor Management for Law Firms | Axle",
    metaDescription: "Manage of-counsel attorneys, contract paralegals, and per-matter billing with the audit trail your firm's compliance needs.",
    intro: "Of-counsel attorneys, contract paralegals, and document review specialists are increasingly part of how modern firms staff matters. Axle gives practice managers a clean, audit-grade record of every contractor hour, gated behind the approvals your billing partners already enforce.",
    painPoints: [
      "Of-counsel and contract attorneys outside payroll",
      "Per-matter billable hours that need clean reconciliation",
      "Billing partners reviewing dozens of timesheets",
      "Confidentiality that a generic timesheet tool can't enforce",
    ],
    useCases: [
      { title: "Per-matter time tracking", description: "Tag every hour to a matter; export per-matter reports for billing reconciliation without manual data entry." },
      { title: "Partner-level approval", description: "Billing partners approve their team's timesheets each week; supervisors see only their direct reports, not the whole firm." },
      { title: "Confidentiality by design", description: "Role-based access ensures of-counsel attorneys don't see other matters; admins control visibility per-matter and per-user." },
      { title: "Compliance records", description: "Full audit trail of every approval and change: useful both for firm-internal compliance and any regulatory inquiry." },
    ],
    faqs: industryFaqsBase("law firms"),
  },
  {
    slug: "consulting-firms",
    name: "consulting firms",
    shortName: "consultancies",
    heroTitle: "Contractor Management for Consulting Firms",
    metaTitle: "Contractor Management for Consulting Firms | Axle",
    metaDescription: "Manage subject-matter experts, contract analysts, and per-engagement billing across your consulting roster: clean utilization, clean audit trail.",
    intro: "Consulting firms scale by tapping a network of subject-matter experts on demand. Axle handles the operational layer: structured timesheets per engagement, invoice approval workflows, and per-engagement utilization reporting that survives partner scrutiny.",
    painPoints: [
      "On-demand SME network: different per project",
      "Per-engagement billing across multiple clients",
      "Engagement leads chasing timesheets at month-end",
      "Partners needing clean utilization reports",
    ],
    useCases: [
      { title: "Engagement tagging", description: "Every hour is tagged to an engagement; per-engagement profitability is one export away." },
      { title: "Engagement-lead approval", description: "Engagement leads approve their team's timesheets weekly: clean signal to finance, no end-of-month chaos." },
      { title: "SME roster", description: "Maintain a roster of subject-matter experts you tap repeatedly; each engagement spins up fast with their pre-approved rate cards." },
      { title: "Cross-currency billing", description: "Engage SMEs globally and bill in native currency: Axle keeps the records clean for your accounting team." },
    ],
    faqs: industryFaqsBase("consulting firms"),
  },
  {
    slug: "architecture-firms",
    name: "architecture firms",
    shortName: "architecture practices",
    heroTitle: "Contractor Management for Architecture Firms",
    metaTitle: "Contractor Management for Architecture Firms | Axle",
    metaDescription: "Track freelance designers, drafting specialists, and rendering contractors with per-project hour records, built for architecture practices.",
    intro: "Architecture firms scale capacity through freelance drafters, renderers, and BIM specialists. Axle makes it straightforward to manage that contractor capacity per project, with the kind of clean record that aligns with your existing AIA billing rigor.",
    painPoints: [
      "Project-based contractor rosters",
      "Drafters and renderers with different rate structures",
      "Per-phase billing tied to AIA milestones",
      "Principal-level approvals across many projects",
    ],
    useCases: [
      { title: "Per-project tagging", description: "Tag hours by project; pull project-level cost reports without spreadsheet wrangling." },
      { title: "Phase-aligned billing", description: "Configure billing cycles to match AIA project phases: schematic, design development, construction documents, etc." },
      { title: "Principal approval", description: "Principals approve their project teams' timesheets in a few clicks per week, with full visibility into hours-to-date per project." },
      { title: "Specialist roster", description: "Maintain a roster of trusted freelance drafters and renderers; reactivate them in one click for the next project." },
    ],
    faqs: industryFaqsBase("architecture firms"),
  },
  {
    slug: "healthcare-startups",
    name: "healthcare startups",
    shortName: "healthcare teams",
    heroTitle: "Contractor Management for Healthcare Startups",
    metaTitle: "Contractor Management for Healthcare Startups | Axle",
    metaDescription: "Manage clinical advisors, regulatory consultants, and contract clinicians with audit-ready records, built for healthcare startup ops.",
    intro: "Healthcare startups depend on a network of clinical advisors, regulatory consultants, and part-time clinicians. Axle gives ops a clean, audit-grade record of every contractor hour and invoice: exactly the kind of paper trail that simplifies your next due diligence or regulatory inquiry.",
    painPoints: [
      "Clinical advisors with irregular hours",
      "Regulatory consultants on retainer",
      "Compliance-heavy approval workflows",
      "Audit trails for fundraising and regulatory review",
    ],
    useCases: [
      { title: "Advisor retainers", description: "Track retainer hours per advisor; surface retainer burn rates so you don't blow through advisory budget unnoticed." },
      { title: "Compliance approvals", description: "Layered approval workflows so clinical and operational sign-offs are both required before invoice payment." },
      { title: "Audit-ready records", description: "Every approval logged with timestamp and reviewer: the kind of paper trail VCs and regulators expect to see." },
      { title: "Multi-jurisdiction contractors", description: "Pay advisors in different countries with appropriate banking detail and currency support." },
    ],
    faqs: industryFaqsBase("healthcare startups"),
  },
  {
    slug: "ecommerce-businesses",
    name: "e-commerce businesses",
    shortName: "e-commerce brands",
    heroTitle: "Contractor Management for E-Commerce Businesses",
    metaTitle: "Contractor Management for E-Commerce Businesses | Axle",
    metaDescription: "Manage freelance copywriters, designers, paid media buyers, and CX agents on your e-commerce team without the spreadsheet sprawl.",
    intro: "E-commerce brands stitch together a contractor team across creative, paid media, and customer service. Axle gives founders a single ops layer for managing that team: timesheets, invoices, and OOO without the email-and-spreadsheet chaos that scales worst exactly when revenue scales fastest.",
    painPoints: [
      "Freelance creatives across copy, design, and video",
      "Paid media specialists across Meta, Google, and TikTok",
      "Outsourced CX agents with shifting hours",
      "Founder approving every invoice manually",
    ],
    useCases: [
      { title: "Cross-functional roster", description: "One roster spans creatives, media buyers, and CX agents, each with appropriate role-based permissions and billing structures." },
      { title: "Founder dashboard", description: "Founders see total monthly contractor spend across the whole team in one view, drill into individuals when something looks off." },
      { title: "OOO calendar", description: "See contractor availability at a glance, particularly useful for CX agents whose coverage gaps directly affect customer SLAs." },
      { title: "Quick invoicing", description: "Approved timesheets flow into invoice approval; finance sees one queue, not 12 email threads." },
    ],
    faqs: industryFaqsBase("e-commerce businesses"),
  },
  {
    slug: "real-estate-agencies",
    name: "real estate agencies",
    shortName: "agencies",
    heroTitle: "Contractor Management for Real Estate Agencies",
    metaTitle: "Contractor Management for Real Estate Agencies | Axle",
    metaDescription: "Manage transaction coordinators, photographers, virtual assistants, and contract agents with structured timesheets and invoice approvals.",
    intro: "Real estate agencies run on a network of transaction coordinators, photographers, virtual assistants, and contract agents. Axle gives broker-owners a clean way to manage that contractor team: structured timesheets, invoice approvals, and a clean audit trail per-deal or per-listing.",
    painPoints: [
      "Transaction coordinators with deal-based billing",
      "Real estate photographers paid per shoot",
      "Virtual assistants billing hourly",
      "Broker-owner trying to manage all of them in spreadsheets",
    ],
    useCases: [
      { title: "Per-deal tagging", description: "Tag hours and invoices to specific deals; pull deal-level cost analysis without manual reconciliation." },
      { title: "Mixed billing models", description: "Day rates for photographers, hourly for VAs, project fees for TCs: all in one tool with one approval workflow." },
      { title: "Broker-owner visibility", description: "One dashboard for total contractor spend, per-listing cost, and team utilization." },
      { title: "Clean records for tax season", description: "1099-ready records for every US contractor; full audit trail for state-level compliance." },
    ],
    faqs: industryFaqsBase("real estate agencies"),
  },
  {
    slug: "financial-services-firms",
    name: "financial services firms",
    shortName: "financial services teams",
    heroTitle: "Contractor Management for Financial Services Firms",
    metaTitle: "Contractor Management for Financial Services Firms | Axle",
    metaDescription: "Manage compliance consultants, contract analysts, and specialist advisors with audit-grade timesheets and invoice records.",
    intro: "Financial services teams operate under intense regulatory scrutiny. Every contractor hour, every approval, every payment needs to be defensible in an audit. Axle gives compliance and ops leaders a structured workflow that produces records auditors actually want to see.",
    painPoints: [
      "Compliance consultants on retainer",
      "Contract analysts during deal cycles",
      "Specialist advisors with high day rates",
      "Audit-defensible records as a hard requirement",
    ],
    useCases: [
      { title: "Compliance approvals", description: "Layered approval workflows ensure both operational and compliance sign-off before invoice payment." },
      { title: "Per-engagement records", description: "Tag every hour to an engagement or deal; pull engagement-level cost reports for client billing." },
      { title: "Audit-grade trail", description: "Every approval, every edit, every change: logged with timestamp and user ID. Auditor-ready out of the box." },
      { title: "High-rate advisor management", description: "Manage advisors with significant day rates with appropriate visibility and approval gates." },
    ],
    faqs: industryFaqsBase("financial services firms"),
  },
  {
    slug: "education-tech-companies",
    name: "education technology companies",
    shortName: "EdTech teams",
    heroTitle: "Contractor Management for EdTech Companies",
    metaTitle: "Contractor Management for EdTech Companies | Axle",
    metaDescription: "Manage curriculum designers, contract tutors, content reviewers, and SMEs with structured timesheets and invoice approvals.",
    intro: "EdTech companies scale through a network of curriculum designers, contract tutors, and subject-matter experts. Axle gives ops a single place to manage that network with structured timesheets, layered approval workflows, and clean per-course or per-program records.",
    painPoints: [
      "Curriculum designers on project-based retainers",
      "Contract tutors with weekly hour fluctuations",
      "Subject-matter experts on per-deliverable engagements",
      "Quality reviewers gating content release",
    ],
    useCases: [
      { title: "Per-course tagging", description: "Tag hours by course or program; pull per-course cost reports for COGS analysis." },
      { title: "Tiered approval", description: "Curriculum lead approves content; ops lead approves invoice, both gates required before payment." },
      { title: "SME roster", description: "Maintain a roster of trusted SMEs with pre-approved rate cards; reactivate them quickly for the next module." },
      { title: "Tutor scheduling", description: "OOO management makes it easy to plan tutor coverage and avoid surprise scheduling gaps." },
    ],
    faqs: industryFaqsBase("education technology companies"),
  },
  {
    slug: "fintech-companies",
    name: "fintech companies",
    shortName: "fintechs",
    heroTitle: "Contractor Management for Fintech Companies",
    metaTitle: "Contractor Management for Fintech Companies | Axle",
    metaDescription: "Manage compliance consultants, contract engineers, and specialist contractors across your fintech team, audit-grade by design.",
    intro: "Fintechs operate under intense regulatory and security scrutiny, and increasingly rely on specialist contractors for compliance, engineering, and risk. Axle gives fintech ops a structured, audit-grade contractor management workflow that produces records your auditors and investors actually want to see.",
    painPoints: [
      "Compliance contractors with sensitive access",
      "Engineering contractors on regulated systems",
      "Risk and fraud specialists on retainer",
      "Investor-ready and audit-ready record keeping",
    ],
    useCases: [
      { title: "Role-based access", description: "Compliance contractors only see what compliance contractors should see, no broader org-wide visibility unless explicitly granted." },
      { title: "Audit-grade records", description: "Every approval and change logged with full attribution; survives regulatory inquiry and investor due diligence." },
      { title: "Tiered approvals", description: "Layered approval workflows for sensitive engagements: tech lead, compliance, and finance can all be required to sign off." },
      { title: "Multi-currency engagement", description: "Engage specialist contractors globally and keep clean records across currencies." },
    ],
    faqs: industryFaqsBase("fintech companies"),
  },
  {
    slug: "saas-startups",
    name: "SaaS startups",
    shortName: "SaaS teams",
    heroTitle: "Contractor Management for SaaS Startups",
    metaTitle: "Contractor Management for SaaS Startups | Axle",
    metaDescription: "Manage contract engineers, designers, and growth specialists across your SaaS team without spreadsheet chaos. Built for fast-moving SaaS ops.",
    intro: "SaaS startups bring on contractor specialists faster than employee headcount: contract engineers, fractional designers, growth marketers, customer ops. Axle is built specifically for that pattern, offering structured contractor management without imposing employee-style HR overhead that doesn't fit your stage.",
    painPoints: [
      "Contractor headcount growing faster than ops capacity",
      "Different rates and currencies across the team",
      "Founders manually approving every invoice",
      "Audit-ready records for the next funding round",
    ],
    useCases: [
      { title: "Lean ops setup", description: "Most SaaS teams are fully operational on Axle within a single day. Invite contractors, set up approval flows, and you're done." },
      { title: "Founder visibility", description: "One dashboard shows total contractor spend, OOO, and approval bottlenecks. Founder time spent on contractor ops drops to minutes per week." },
      { title: "Diligence-ready", description: "Investors love clean contractor records. Axle produces them automatically, no scramble before due diligence." },
      { title: "Quick onboarding", description: "Send an email invite; the contractor sets up their own profile, banking, and tax info. Ready to log time same day." },
    ],
    faqs: industryFaqsBase("SaaS startups"),
  },
  {
    slug: "nonprofits",
    name: "nonprofits",
    shortName: "nonprofits",
    heroTitle: "Contractor Management for Nonprofits",
    metaTitle: "Contractor Management for Nonprofits | Axle",
    metaDescription: "Manage program consultants, grant writers, and contract program staff with grant-ready records, built for nonprofit ops.",
    intro: "Nonprofits bring on program consultants, grant writers, and specialist contractors against tight budgets and grant-funded scope. Axle gives nonprofit ops clean per-grant or per-program contractor records, the kind that simplify financial reporting to funders.",
    painPoints: [
      "Per-grant or per-program budget tracking",
      "Grant writers and program consultants on project retainers",
      "Funder-ready financial records",
      "Lean ops team managing many contractors",
    ],
    useCases: [
      { title: "Per-grant tagging", description: "Tag every contractor hour and invoice to a grant or program; pull grant-level cost reports for funder reporting." },
      { title: "Program lead approval", description: "Program leads approve their team's timesheets; ops handles the financial close. Layered controls without bureaucracy." },
      { title: "Affordable ops layer", description: "Axle's free plan covers up to 3 contractors at zero cost, perfect for grassroots nonprofits scaling capacity carefully." },
      { title: "Funder-ready records", description: "Clean exports per grant period make annual funder reporting straightforward." },
    ],
    faqs: industryFaqsBase("nonprofits"),
  },
  {
    slug: "media-companies",
    name: "media companies",
    shortName: "media teams",
    heroTitle: "Contractor Management for Media Companies",
    metaTitle: "Contractor Management for Media Companies | Axle",
    metaDescription: "Manage freelance journalists, editors, photographers, and contributors across your publication with structured per-piece records.",
    intro: "Media companies run on freelance contributors: journalists, editors, photographers, illustrators. Axle gives editorial ops a single place to manage that contributor network with structured per-piece records and clean approval workflows.",
    painPoints: [
      "Freelance journalists with per-piece rates",
      "Photographers paid per assignment",
      "Editors approving content and invoices",
      "Per-publication cost tracking",
    ],
    useCases: [
      { title: "Per-piece tagging", description: "Tag invoices to specific articles or assignments; pull per-piece cost reports for editorial budget management." },
      { title: "Editor approval", description: "Section editors approve their contributors' invoices; editors-in-chief see the full editorial spend at a glance." },
      { title: "Mixed billing models", description: "Per-piece rates for journalists, day rates for photographers, hourly for production, all handled in one tool." },
      { title: "Contributor roster", description: "Maintain a roster of trusted freelance contributors; reactivate them in one click when an assignment fits." },
    ],
    faqs: industryFaqsBase("media companies"),
  },
  {
    slug: "advertising-agencies",
    name: "advertising agencies",
    shortName: "agencies",
    heroTitle: "Contractor Management for Advertising Agencies",
    metaTitle: "Contractor Management for Advertising Agencies | Axle",
    metaDescription: "Run a freelance-heavy advertising agency without spreadsheet chaos. Axle handles per-campaign timesheets, approvals, and invoicing.",
    intro: "Advertising agencies stitch together creative directors, copywriters, art directors, and producers per campaign. Axle is built for that exact pattern: structured per-campaign records, layered approvals, and clean utilization reporting that holds up against client scrutiny.",
    painPoints: [
      "Per-campaign rosters that change every quarter",
      "Creative director, copy, and art director rates differ",
      "Producer-led approvals across many campaigns",
      "Per-campaign profitability hard to compute",
    ],
    useCases: [
      { title: "Per-campaign tagging", description: "Tag hours and invoices to specific campaigns; pull per-campaign profitability without spreadsheet gymnastics." },
      { title: "Producer approval", description: "Producers approve their campaign teams' timesheets weekly; account directors review monthly aggregates." },
      { title: "Rate-card management", description: "Per-role rate cards stored on the contract; surfaced on every timesheet so producers can spot rate anomalies." },
      { title: "Multi-currency talent", description: "Engage talent globally and keep clean per-currency records for accounting." },
    ],
    faqs: industryFaqsBase("advertising agencies"),
  },
  {
    slug: "public-relations-firms",
    name: "public relations firms",
    shortName: "PR firms",
    heroTitle: "Contractor Management for PR Firms",
    metaTitle: "Contractor Management for PR Firms | Axle",
    metaDescription: "Manage freelance publicists, media relations specialists, and contributing writers with structured per-client records.",
    intro: "PR firms scale through a network of freelance publicists, contributing writers, and media relations specialists. Axle gives account directors a clean way to manage that contractor network with structured per-client retainers and clean approval workflows.",
    painPoints: [
      "Per-client retainers across many freelancers",
      "Media relations specialists with deliverable-based billing",
      "Account directors juggling multiple clients",
      "Retainer overrun visibility",
    ],
    useCases: [
      { title: "Retainer tracking", description: "Tag every hour to a client retainer; surface retainer burn rates so you don't blow through budget unnoticed." },
      { title: "AD-led approvals", description: "Account directors approve their team's timesheets weekly; clean signal to finance for monthly billing." },
      { title: "Freelancer roster", description: "Maintain a roster of trusted freelance publicists; activate them per-client without rebuilding contracts each time." },
      { title: "Client-level reporting", description: "Per-client cost and utilization reports straight from the dashboard." },
    ],
    faqs: industryFaqsBase("public relations firms"),
  },
  {
    slug: "photography-studios",
    name: "photography studios",
    shortName: "studios",
    heroTitle: "Contractor Management for Photography Studios",
    metaTitle: "Contractor Management for Photography Studios | Axle",
    metaDescription: "Manage second shooters, retouchers, and assistants with day-rate billing and per-shoot records, built for photography studios.",
    intro: "Photography studios scale capacity through second shooters, retouchers, and assistants, usually on day rates or per-shoot fees. Axle handles that exact billing pattern with structured per-shoot records and clean approval workflows.",
    painPoints: [
      "Day rates and per-shoot fees mixed",
      "Retouchers billing hourly in post",
      "Per-shoot cost tracking",
      "Studio owner approving every invoice",
    ],
    useCases: [
      { title: "Day-rate billing", description: "Track day rates for second shooters and assistants; hourly rates for retouchers, all in one tool." },
      { title: "Per-shoot tagging", description: "Tag hours and invoices to specific shoots; pull per-shoot cost reports for client billing." },
      { title: "Studio owner dashboard", description: "Studio owners see total contractor spend, per-shoot costs, and team utilization in one view." },
      { title: "Quick onboarding", description: "Onboard a second shooter for one shoot in five minutes; archive cleanly when the engagement ends." },
    ],
    faqs: industryFaqsBase("photography studios"),
  },
];

export const defaultIndustries: IndustryPage[] = industriesData.map((d) => ({ ...d, updatedDate: today }));

const competitorComparisonBase = (name: string) => [
  { feature: "Built specifically for contractor ops", axle: "Yes, every workflow assumes contractor model", competitor: `${name} positions broadly across employee + contractor; contractor flows are a subset` },
  { feature: "Time to set up", axle: "Most teams operational in under a day", competitor: `${name} typically requires multi-day onboarding and configuration` },
  { feature: "Free plan", axle: "Free for up to 3 contractors with full features", competitor: `${name} requires a paid plan or has limited free usage` },
  { feature: "Approval workflow gating invoices", axle: "Invoice cannot be submitted unless timesheet is approved", competitor: `${name} treats timesheets and invoices as separate workflows` },
  { feature: "Audit trail", axle: "Every approval, edit, and rejection logged automatically", competitor: `${name} provides logs but with varying granularity per plan tier` },
  { feature: "Multi-currency invoice records", axle: "Native currency stored per invoice; no forced conversion", competitor: `${name} typically routes through their own payment rails and conversion` },
  { feature: "Pricing transparency", axle: "Clear per-seat pricing; no per-payment fees", competitor: `${name} pricing often varies with payment volume and country` },
];

const switchHistoryFaq = (name: string) => ({
  q: `Can I switch from ${name} to Axle without losing history?`,
  a: `Yes. Axle lets you import contractor records and historical timesheet/invoice data via CSV, so you keep a continuous audit trail when you migrate off ${name}.`,
});

const eorFaqs = (name: string) => [
  {
    q: `How is Axle different from ${name}?`,
    a: `${name} bundles employer-of-record, global payroll, and contractor payments into one platform. Axle is narrower, handling contractor operations only: timesheets, invoice approvals, OOO, and audit trail. If you don't need EOR or payment processing through the same vendor, Axle gives you the ops layer without that bundle.`,
  },
  switchHistoryFaq(name),
  {
    q: `Does Axle process contractor payments the way ${name} does?`,
    a: `No, and that's intentional. Axle approves and records the work; your finance team pays through your existing banking infrastructure. That keeps Axle lean and avoids introducing another financial intermediary.`,
  },
  {
    q: `Is Axle cheaper than ${name} for contractor-only teams?`,
    a: `Usually, yes. ${name}'s effective cost scales with payment volume, country mix, and FX fees. Axle is a flat per-seat fee with no per-payment markup, so the price stays predictable as your contractor spend grows.`,
  },
];

const freelancerToolFaqs = (name: string) => [
  {
    q: `How is Axle different from ${name}?`,
    a: `${name} is designed around the individual freelancer running their own business: invoicing clients, tracking their own time, managing their own contracts. Axle is designed for the company on the other side of the table: the ops, finance, and supervisor roles managing many contractors at once, with layered approvals and role-based permissions.`,
  },
  switchHistoryFaq(name),
  {
    q: `Does Axle give supervisors and admins their own views?`,
    a: `Yes. Contractors, supervisors, admins, and owners are first-class roles. Each sees only what their role needs: a structure that's awkward to retrofit on a tool built for solo freelancers.`,
  },
  {
    q: `Can a small team start free?`,
    a: `Yes. Axle's free plan covers up to 3 contractors with full timesheet, invoice approval, and OOO features.`,
  },
];

const marketplaceFaqs = (name: string) => [
  {
    q: `How is Axle different from ${name}?`,
    a: `${name} is a marketplace: it sources and places freelancers and takes a cut of the engagement. Axle is the ops platform you use after the placement: structured timesheets, supervisor approvals, invoice gating, OOO, and audit trail. You can use both (source on ${name}, manage day-to-day on Axle) or bring contractors from any source.`,
  },
  {
    q: `Do I need to leave ${name} to use Axle?`,
    a: `No. Axle doesn't replace ${name}'s sourcing; it sits alongside it. Many teams keep using ${name} for discovery and run Axle as the ongoing ops layer once a contractor relationship is established.`,
  },
  {
    q: `Does Axle take a markup on contractor pay?`,
    a: `No. Marketplaces typically build margin into contractor rates or charge transaction fees. Axle charges a flat per-seat platform fee: what you pay your contractor is what they receive.`,
  },
  {
    q: `Can I import historical engagements from ${name}?`,
    a: `You can import contractor records and historical timesheet/invoice data via CSV. ${name}'s in-platform messaging and reviews stay where they are; Axle focuses on the operational record from engagement onward.`,
  },
];

const timeTrackingFaqs = (name: string) => [
  {
    q: `How is Axle different from ${name}?`,
    a: `${name} is fundamentally a time-tracking tool: it tracks hours and produces basic invoices. Axle extends past time tracking into the full contractor lifecycle: layered approval workflows, OOO management, supervisor permissions, and an audit trail logged per role and per action. If time tracking is the only thing you need, ${name} is fine; if you need the rest of the ops layer, Axle is built for it.`,
  },
  switchHistoryFaq(name),
  {
    q: `Does Axle have its own time tracking?`,
    a: `Yes. Contractors log hours per day with project/client tags, supervisors approve, and approved hours flow into the invoice approval queue automatically. The difference from ${name} is that approval gating and audit trail are first-class, not bolted on.`,
  },
  {
    q: `Can I use Axle alongside ${name}?`,
    a: `Some teams do, especially during a transition. Long term, having two systems for the same hours creates reconciliation work; most teams consolidate onto one tool once they validate the new workflow.`,
  },
];

const payrollFaqs = (name: string, focus: string) => [
  {
    q: `How is Axle different from ${name}?`,
    a: `${name} is built primarily for ${focus}. Its contractor support exists, but it's a secondary feature focused on payment and tax forms (1099 in the US), not on the operational layer of timesheet approval, OOO, and audit trail. Axle is the ops layer that complements ${name}: keep ${name} for ${focus} and tax forms, add Axle for contractor operations.`,
  },
  {
    q: `Can Axle and ${name} be used together?`,
    a: `Yes, that's the most common pattern for teams running both employees and contractors. ${name} handles ${focus}; Axle handles contractor timesheet approvals, OOO, and audit records. Approved contractor invoices from Axle can be paid through ${name} or your bank.`,
  },
  {
    q: `Does Axle handle 1099 generation?`,
    a: `No. We deliberately keep tax form generation out of scope and integrate cleanly with the tools that do it well, including ${name}. Contractor records and totals are exportable, so producing 1099s through your existing provider is straightforward.`,
  },
  switchHistoryFaq(name),
];

const enterpriseContractorFaqs = (name: string) => [
  {
    q: `How is Axle different from ${name}?`,
    a: `${name} is enterprise contractor management: large workforces, complex compliance modules, custom integrations, sales-led procurement. Axle targets the SaaS and mid-market services teams that don't have a procurement team and don't need that depth. Setup is self-serve, pricing is transparent, and the workflows are scoped to what most teams actually use day to day.`,
  },
  switchHistoryFaq(name),
  {
    q: `Can a non-enterprise team get started without a sales call?`,
    a: `Yes. Axle has self-serve signup, a free plan for up to 3 contractors, and per-seat pricing published on the website. Most teams are operational the same day.`,
  },
  {
    q: `What about advanced compliance and integrations?`,
    a: `If your team has dedicated procurement and needs deep custom integrations, ${name} or another enterprise platform may be a better fit. Axle is intentionally scoped to the workflows that move the needle for SaaS and services teams; we'd rather do that well than be everything to everyone.`,
  },
];

const stafffingComplianceFaqs = (name: string, model: string) => [
  {
    q: `How is Axle different from ${name}?`,
    a: `${name} is built around ${model}: its core value is the service it provides on top of the platform. Axle is purely the ops layer: timesheets, approvals, invoices, OOO, and audit trail for contractors you've already engaged. If you've handled sourcing or compliance through another channel and just need the operational software, Axle is the focused alternative.`,
  },
  switchHistoryFaq(name),
  {
    q: `Does Axle handle contractor classification or compliance services?`,
    a: `No. We assume you've validated classification through legal, HR, or a specialized provider. Axle focuses on what happens after that (the day-to-day operational workflow) and stays out of the services business.`,
  },
  {
    q: `Is Axle a fit if I'm not running an enterprise workforce?`,
    a: `Yes. Axle is sized for SaaS and mid-market services teams: self-serve, transparent per-seat pricing, free plan for small teams, no procurement cycle.`,
  },
];

const competitorsData: Omit<CompetitorPage, "updatedDate">[] = [
  {
    slug: "deel-alternative",
    competitorName: "Deel",
    metaTitle: "Deel Alternative for Contractor Management | Axle",
    metaDescription: "Looking for a Deel alternative? Axle gives you contractor timesheets, invoice approvals, and audit-ready records, without payment-volume markup.",
    intro: "Deel is a great fit for teams that need EOR (employer of record) and global payroll bundled with contractor management. But for many SaaS and services teams, that bundle is overkill: you already have a payment provider, and what you actually need is a clean ops layer for timesheets, approvals, and audit trail. That's where Axle shines.",
    positioning: "Axle is the focused contractor ops platform. We don't process payments; we handle the approval workflow and record keeping. The result: clearer pricing, a tool that doesn't try to replace your finance stack, and a platform built end-to-end for the contractor model.",
    competitorWeaknesses: [
      "Pricing scales with payment volume, country, and currency conversion, hard to predict month-over-month",
      "Bundles features you may not need (EOR, payroll) into the contractor workflow",
      "Onboarding can take days for organizations with multiple country setups",
      "Heavy product means many features compete for attention with the core contractor ops workflow",
    ],
    axleStrengths: [
      "Single-purpose: contractor timesheets, invoices, OOO, and audit trail",
      "Most teams fully set up in under a day",
      "Transparent per-seat pricing, no per-payment markup",
      "Free plan for up to 3 contractors covers all core features",
    ],
    comparison: competitorComparisonBase("Deel"),
    pricingNote: "Deel's pricing model varies by entity, country, and payment method, with EOR fees often starting around $599/month/employee and contractor fees from $49/contractor/month plus payment processing. Axle's pricing is a flat per-seat monthly fee with no transaction markup.",
    faqs: eorFaqs("Deel"),
  },
  {
    slug: "remote-alternative",
    competitorName: "Remote",
    metaTitle: "Remote.com Alternative for Contractor Management | Axle",
    metaDescription: "Axle is a leaner alternative to Remote.com: contractor timesheets, invoice approvals, and audit-ready records without EOR markup.",
    intro: "Remote is a strong choice for companies that need full EOR services in many countries, but the platform's strength is also its overhead: you're paying for global payroll infrastructure even if you only need a contractor ops layer. Axle takes the opposite approach: narrow scope, transparent pricing, faster setup.",
    positioning: "Axle handles contractor operations without trying to be your global payroll provider. Use your existing payment provider; let Axle handle the approval workflow, records, and audit trail.",
    competitorWeaknesses: [
      "EOR-first product means contractor-only customers pay for capabilities they don't use",
      "Contractor payment fees apply per transaction in addition to platform fees",
      "Setup is more involved than a contractor-only team typically needs",
      "UI is optimized for HR/payroll teams more than for ops or founders",
    ],
    axleStrengths: [
      "Focused exclusively on contractor ops, no EOR overhead",
      "Free plan covers small teams completely",
      "Clean separation between ops layer and payment processing",
      "Setup measured in hours, not days",
    ],
    comparison: competitorComparisonBase("Remote"),
    pricingNote: "Remote charges $29/contractor/month for contractor management plus payment fees per transaction. Axle uses a flat per-seat fee with no transaction markup.",
    faqs: eorFaqs("Remote"),
  },
  {
    slug: "rippling-alternative",
    competitorName: "Rippling",
    metaTitle: "Rippling Alternative for Contractor Management | Axle",
    metaDescription: "Looking for a Rippling alternative just for contractors? Axle handles timesheets, invoices, and OOO without the full HRIS overhead.",
    intro: "Rippling is a powerful HRIS for companies that want one system for HR, IT, and finance. But if your team is contractor-heavy, you don't need an HRIS: you need a focused contractor ops layer. Axle is that layer, without the breadth and price tag of Rippling.",
    positioning: "Axle does one thing very well: manage independent contractors. We don't try to be your HRIS, your IT provisioning system, or your payroll engine. The benefit: less overhead, faster setup, lower cost.",
    competitorWeaknesses: [
      "Pricing assumes broad HRIS adoption; contractor-only customers overpay",
      "Setup and configuration meaningful even for the contractor-only module",
      "Feature breadth introduces ongoing learning curve",
      "Enterprise-grade flexibility means complex permission models even for small teams",
    ],
    axleStrengths: [
      "Built specifically for contractor ops, not as an HRIS module",
      "Setup in hours, not weeks",
      "Per-seat pricing covers all features, no module-by-module pricing",
      "Smaller surface area means less to learn for ops and contractors",
    ],
    comparison: competitorComparisonBase("Rippling"),
    pricingNote: "Rippling's contractor management is part of a broader HRIS suite with module-based pricing typically starting at $8/employee/month plus per-module fees. Axle is a flat per-seat fee that covers all contractor ops features.",
    faqs: eorFaqs("Rippling"),
  },
  {
    slug: "bonsai-alternative",
    competitorName: "Bonsai",
    metaTitle: "Bonsai Alternative for Contractor-Heavy Teams | Axle",
    metaDescription: "Axle is the team-first alternative to Bonsai, built for companies managing contractors, not for solo freelancers managing themselves.",
    intro: "Bonsai is excellent if you're an individual freelancer running your own books. But if you're on the other side of the table (a company managing many contractors), Bonsai's freelancer-first design starts working against you. Axle flips the model: built from the ground up for the company managing contractors, not for the contractor managing themselves.",
    positioning: "Axle is purpose-built for the company side of the contractor relationship. Layered approval workflows, supervisor permissions, multi-tenant role-based access: features that don't exist when the platform's primary user is a solo freelancer.",
    competitorWeaknesses: [
      "Designed for individual freelancers, not multi-contractor teams",
      "Approval workflows and supervisor roles aren't first-class concepts",
      "Permissions model isn't designed for managers and admins",
      "Reporting is contractor-centric, not company-centric",
    ],
    axleStrengths: [
      "Multi-role workflow: contractors, supervisors, admins, owners, all native",
      "Layered approval gates between timesheets and invoices",
      "Company-side reporting: utilization, spend, OOO across the team",
      "Built for org-wide audit trail, not personal freelancer records",
    ],
    comparison: competitorComparisonBase("Bonsai"),
    pricingNote: "Bonsai's pricing assumes a freelancer-first model and starts at around $25/month per freelancer's account. Axle charges per company seat with a free plan for small teams.",
    faqs: freelancerToolFaqs("Bonsai"),
  },
  {
    slug: "worksuite-alternative",
    competitorName: "Worksuite",
    metaTitle: "Worksuite Alternative for Contractor Management | Axle",
    metaDescription: "Axle is a faster-to-deploy alternative to Worksuite for SaaS teams managing contractors, without the enterprise overhead.",
    intro: "Worksuite (formerly Shortlist) is built for enterprise contractor management: large workforces, complex compliance, custom integrations. For SaaS startups and mid-market services firms, that depth often becomes overhead. Axle gives you the ops fundamentals without the enterprise procurement cycle.",
    positioning: "Axle is contractor ops for teams that don't have a procurement team. Setup measured in hours; pricing transparent and per-seat; functionality focused on the 90% of contractor workflows that actually move the needle.",
    competitorWeaknesses: [
      "Enterprise-first sales process; not self-serve",
      "Implementation typically requires dedicated CSM and configuration weeks",
      "Pricing not transparent on the website; quote-based",
      "Feature depth assumes mature ops team to operate it",
    ],
    axleStrengths: [
      "Self-serve signup and setup, no sales call required",
      "Operational in under a day",
      "Transparent per-seat pricing on the website",
      "Functionality scoped to the workflows most teams actually need",
    ],
    comparison: competitorComparisonBase("Worksuite"),
    pricingNote: "Worksuite uses quote-based enterprise pricing typically scaled to workforce size and modules. Axle uses transparent per-seat pricing with a free plan for small teams.",
    faqs: enterpriseContractorFaqs("Worksuite"),
  },
  {
    slug: "plane-alternative",
    competitorName: "Plane",
    metaTitle: "Plane Alternative for Contractor Management | Axle",
    metaDescription: "Axle is the ops-focused alternative to Plane: contractor timesheets, approvals, and audit trail without payment-rail markup.",
    intro: "Plane (formerly Pilot) is built around international payment processing: they pay your contractors, you pay them. That's valuable if you don't have a global payment infrastructure already. If you do, you're effectively paying twice: once for your bank and again for Plane's rails. Axle handles the ops layer without touching payments.",
    positioning: "Axle is contractor ops without payment processing. Approve timesheets, approve invoices, keep clean records. Pay through whatever financial infrastructure you already have.",
    competitorWeaknesses: [
      "Pricing tied to payment processing, costs scale with payment volume",
      "Payment processing markup baked into the platform fee",
      "Forces a specific payment workflow that may duplicate your existing finance stack",
      "Less flexibility for teams that want to keep their existing payment provider",
    ],
    axleStrengths: [
      "Clean separation between ops and payments, keep your existing financial stack",
      "Predictable per-seat pricing, no transaction markup",
      "Faster setup for teams that don't need a new payment rail",
      "Lighter integration footprint with finance",
    ],
    comparison: competitorComparisonBase("Plane"),
    pricingNote: "Plane's pricing model includes per-contractor monthly fees plus payment processing fees per transaction. Axle charges a flat per-seat fee with no transaction processing.",
    faqs: eorFaqs("Plane"),
  },
  {
    slug: "multiplier-alternative",
    competitorName: "Multiplier",
    metaTitle: "Multiplier Alternative for Contractor Management | Axle",
    metaDescription: "Axle is the focused contractor ops alternative to Multiplier, without EOR overhead or payment-volume pricing.",
    intro: "Multiplier focuses on global hiring, EOR services, and contractor payments. If you need EOR, that's a real value proposition. If you don't, the EOR-first design becomes friction: extra fields, extra workflows, extra cost. Axle is the contractor ops layer without the EOR overhead.",
    positioning: "Axle is contractor management without EOR. We assume you've already figured out how to engage contractors legally; we focus on the ongoing operational layer.",
    competitorWeaknesses: [
      "EOR-first design imposes overhead on contractor-only customers",
      "Pricing scales with payment volume in addition to platform fees",
      "Onboarding is heavier than a contractor-only team needs",
      "Many features irrelevant for non-EOR usage",
    ],
    axleStrengths: [
      "Contractor-first, not EOR-first",
      "Operational in under a day",
      "Transparent per-seat pricing",
      "Free plan covers small teams completely",
    ],
    comparison: competitorComparisonBase("Multiplier"),
    pricingNote: "Multiplier's pricing model includes per-contractor and per-EOR-employee monthly fees plus payment fees per transaction. Axle uses a flat per-seat fee with no payment markup.",
    faqs: eorFaqs("Multiplier"),
  },
  {
    slug: "hubstaff-alternative",
    competitorName: "Hubstaff",
    metaTitle: "Hubstaff Alternative for Contractor Management | Axle",
    metaDescription: "Axle is the trust-based alternative to Hubstaff: contractor timesheets and invoice approvals without screenshot surveillance.",
    intro: "Hubstaff's core value proposition is automated time tracking with screenshots and activity monitoring. That works for some teams. For most modern contractor relationships, particularly with senior specialists, surveillance-based time tracking actively damages the relationship. Axle takes the opposite stance: structured self-reported timesheets with approval gates.",
    positioning: "Axle trusts contractors to track their own time and gives supervisors clean approval workflows to verify it. No screenshots, no activity monitoring, no surveillance: just structured records and supervisor sign-off.",
    competitorWeaknesses: [
      "Screenshot and activity monitoring damages senior contractor relationships",
      "Surveillance approach incompatible with how most knowledge work is done",
      "Pushes contractor classification toward employee territory in audit reviews",
      "Misalignment with modern remote-work norms",
    ],
    axleStrengths: [
      "Trust-based time tracking with structured supervisor approval",
      "Compatible with senior and specialist contractor relationships",
      "Reinforces contractor classification model",
      "Modern remote-work-friendly UI and workflow",
    ],
    comparison: competitorComparisonBase("Hubstaff"),
    pricingNote: "Hubstaff charges per-user/month with feature tiers, often starting around $7-$20/user/month. Axle uses a flat per-seat fee with all features included.",
    faqs: timeTrackingFaqs("Hubstaff"),
  },
  {
    slug: "harvest-alternative",
    competitorName: "Harvest",
    metaTitle: "Harvest Alternative for Contractor Management | Axle",
    metaDescription: "Axle extends beyond Harvest's time-tracking focus with contractor invoicing, OOO, and audit-ready approval workflows.",
    intro: "Harvest is a long-standing time-tracking and invoicing tool. It's good at what it does. But contractor management isn't just time tracking; it's the full lifecycle: timesheets, approval, invoicing, OOO, audit trail. Axle covers that full lifecycle in one tool, where Harvest stops at time and basic invoicing.",
    positioning: "Axle is the full contractor ops platform. Time tracking is one component, alongside approval workflows, OOO management, audit trail, and supervisor permissions that don't exist in pure time-tracking tools.",
    competitorWeaknesses: [
      "Time-tracking-first product; contractor workflows are an afterthought",
      "OOO and supervisor approval not first-class features",
      "Limited multi-role permissions for managers vs. admins",
      "Less audit-trail granularity per role",
    ],
    axleStrengths: [
      "End-to-end contractor lifecycle in one tool",
      "Native OOO management with team availability calendar",
      "Multi-role permissions designed for managers and admins",
      "Audit trail logged per-role and per-action",
    ],
    comparison: competitorComparisonBase("Harvest"),
    pricingNote: "Harvest charges per user/month at around $13.75/user with a free plan limited to one user and two projects. Axle includes all contractor ops features at every paid tier.",
    faqs: timeTrackingFaqs("Harvest"),
  },
  {
    slug: "gusto-alternative",
    competitorName: "Gusto",
    metaTitle: "Gusto Alternative for Contractor Management | Axle",
    metaDescription: "Axle handles contractor ops the way Gusto handles employee payroll: focused, structured, and audit-grade.",
    intro: "Gusto is the gold standard for SMB payroll. Their contractor support exists, but it's a side feature focused on 1099 generation and basic payment, not on the operational layer of timesheet approval, OOO, and audit trail. Axle complements Gusto: keep Gusto for payroll and 1099 generation, add Axle for the ops layer.",
    positioning: "Axle is the ops complement to Gusto. We track timesheets, approvals, OOO, and audit trail. Gusto handles the actual payment and 1099. The two work cleanly together.",
    competitorWeaknesses: [
      "Contractor management is a secondary feature behind employee payroll",
      "Limited approval workflow for contractor timesheets",
      "No OOO management for contractors",
      "Reporting designed around payroll, not contractor operations",
    ],
    axleStrengths: [
      "Purpose-built contractor ops layer",
      "Layered approval workflows and supervisor permissions",
      "Native OOO management",
      "Complements Gusto rather than replacing it",
    ],
    comparison: competitorComparisonBase("Gusto"),
    pricingNote: "Gusto's contractor-only plan starts at $35/month plus $6 per contractor. Axle's per-seat pricing covers contractor ops features specifically, and the two tools work cleanly side by side.",
    faqs: payrollFaqs("Gusto", "SMB payroll"),
  },
  {
    slug: "paychex-alternative",
    competitorName: "Paychex",
    metaTitle: "Paychex Alternative for Modern Contractor Management | Axle",
    metaDescription: "Axle is the modern, self-serve alternative to Paychex for SaaS teams managing contractors at scale.",
    intro: "Paychex is built for traditional payroll and HR: large workforces, established processes, dedicated HR teams. For modern SaaS and services teams that work primarily with independent contractors, that legacy infrastructure is overkill. Axle is the modern, self-serve contractor ops layer that fits how today's teams actually work.",
    positioning: "Axle is contractor ops for the modern team: self-serve, fast to set up, transparent pricing, no enterprise sales motion.",
    competitorWeaknesses: [
      "Enterprise-first product designed for traditional HR teams",
      "Setup involves sales conversations and lengthy onboarding",
      "Pricing isn't transparent; it's quote-based",
      "Dated UI compared to modern SaaS tools",
    ],
    axleStrengths: [
      "Self-serve, modern UI",
      "Transparent pricing on the website",
      "Operational in under a day",
      "Built for the contractor-first team",
    ],
    comparison: competitorComparisonBase("Paychex"),
    pricingNote: "Paychex uses quote-based pricing for contractor management bundled with broader HR services. Axle is a flat per-seat fee, with a free plan for small teams.",
    faqs: payrollFaqs("Paychex", "traditional payroll and HR"),
  },
  {
    slug: "qwick-alternative",
    competitorName: "Qwick",
    metaTitle: "Qwick Alternative for Contractor Management | Axle",
    metaDescription: "Axle handles ongoing contractor operations the way Qwick handles short-term staffing: focused tools for different problems.",
    intro: "Qwick is built for hospitality on-demand staffing: booking workers for individual shifts. Axle is built for ongoing contractor relationships, meaning recurring engagements with timesheet, invoice, and OOO management. Different problems, different tools.",
    positioning: "Axle is for ongoing contractor relationships, not on-demand shift booking. If your contractors come back week after week, project after project, Axle's ops layer fits cleanly.",
    competitorWeaknesses: [
      "Designed for one-off shifts, not ongoing engagements",
      "Limited approval and invoice workflows for recurring billing",
      "OOO and team availability not relevant to its core model",
      "Records not optimized for long-term contractor relationships",
    ],
    axleStrengths: [
      "Built for recurring contractor relationships",
      "Layered approval and invoice workflows",
      "Native OOO and team availability management",
      "Long-term audit trail and historical records",
    ],
    comparison: competitorComparisonBase("Qwick"),
    pricingNote: "Qwick charges per-shift booking fees for hospitality staffing. Axle charges per-seat for ongoing contractor relationship management; they're complementary tools for different needs.",
    faqs: stafffingComplianceFaqs("Qwick", "on-demand hospitality shift staffing"),
  },
  {
    slug: "oyster-alternative",
    competitorName: "Oyster",
    metaTitle: "Oyster Alternative for Contractor Management | Axle",
    metaDescription: "Axle is the focused contractor ops alternative to Oyster, without EOR overhead or payment-volume pricing.",
    intro: "Oyster's strength is global EOR and compliance for distributed teams. If you need EOR, Oyster is a strong choice. If you don't, meaning your contractors are properly classified independent contractors, Axle gives you the ops layer without the EOR overhead.",
    positioning: "Axle is contractor ops without EOR. We assume you've already validated contractor classification; we focus on the ongoing operational workflows.",
    competitorWeaknesses: [
      "EOR-first design imposes overhead on contractor-only customers",
      "Pricing structure assumes EOR usage",
      "More complex setup than contractor-only teams need",
      "Many features designed for managing employees abroad, not contractors",
    ],
    axleStrengths: [
      "Contractor-first, lean and focused",
      "Operational in under a day",
      "Transparent per-seat pricing",
      "Fits cleanly alongside any payment provider",
    ],
    comparison: competitorComparisonBase("Oyster"),
    pricingNote: "Oyster's contractor management starts around $29/contractor/month plus payment fees, with EOR services significantly higher. Axle uses a flat per-seat fee.",
    faqs: eorFaqs("Oyster"),
  },
  {
    slug: "papaya-global-alternative",
    competitorName: "Papaya Global",
    metaTitle: "Papaya Global Alternative for Contractor Management | Axle",
    metaDescription: "Axle is the lean alternative to Papaya Global for SaaS teams that need contractor ops without enterprise payroll overhead.",
    intro: "Papaya Global is built for enterprise global payroll and EOR: comprehensive, but heavy. For SaaS and mid-market services firms that need a contractor ops layer without the enterprise payroll engine, Axle is the lighter alternative.",
    positioning: "Axle is contractor ops sized for SaaS and mid-market, not for Fortune 500 global payroll. The right tool when you need clean operational records without enterprise platform overhead.",
    competitorWeaknesses: [
      "Enterprise-grade product means enterprise-grade procurement cycle",
      "Pricing not transparent; quote-based only",
      "Setup requires dedicated implementation team",
      "Feature breadth far exceeds what most contractor-only teams need",
    ],
    axleStrengths: [
      "Self-serve, no enterprise procurement",
      "Operational in under a day",
      "Transparent per-seat pricing",
      "Fits SaaS and mid-market workflows specifically",
    ],
    comparison: competitorComparisonBase("Papaya Global"),
    pricingNote: "Papaya Global uses quote-based enterprise pricing. Axle uses transparent per-seat pricing with a free plan for small teams.",
    faqs: eorFaqs("Papaya Global"),
  },
  {
    slug: "justworks-alternative",
    competitorName: "Justworks",
    metaTitle: "Justworks Alternative for Contractor Management | Axle",
    metaDescription: "Axle is the contractor-focused alternative to Justworks, without PEO overhead, just clean ops workflows.",
    intro: "Justworks is a PEO, meaning they co-employ your team, handling payroll, benefits, and HR compliance. That's a strong fit for full-time employee teams. For contractor-heavy teams, the PEO model doesn't apply: contractors aren't employees. Axle is contractor management built for that distinction.",
    positioning: "Axle is contractor ops separate from PEO services. We don't co-employ; we don't run benefits; we don't process payroll. We give you the operational layer for managing independent contractors as independent contractors.",
    competitorWeaknesses: [
      "PEO model doesn't apply to contractors",
      "Contractor management is a secondary feature",
      "Pricing structure designed for employee headcount",
      "Limited contractor-specific workflows",
    ],
    axleStrengths: [
      "Built specifically for contractor management, not employee management",
      "Reinforces contractor classification model in workflow",
      "Per-seat pricing with no PEO overhead",
      "Native contractor lifecycle: timesheets, invoices, OOO, audit",
    ],
    comparison: competitorComparisonBase("Justworks"),
    pricingNote: "Justworks's PEO model bundles payroll, benefits, and HR services starting around $59/employee/month. Axle's contractor-focused per-seat pricing avoids the PEO bundle.",
    faqs: payrollFaqs("Justworks", "PEO services and benefits"),
  },
  {
    slug: "workmarket-alternative",
    competitorName: "WorkMarket",
    metaTitle: "WorkMarket Alternative for Contractor Management | Axle",
    metaDescription: "Axle is the modern, lighter alternative to WorkMarket for SaaS teams managing contractors at scale.",
    intro: "WorkMarket is enterprise contractor management, built for large workforces with complex compliance. For SaaS and mid-market services firms, Axle gives you the operational fundamentals without the enterprise procurement and configuration cycle.",
    positioning: "Axle is contractor ops without the enterprise weight. Self-serve, fast to set up, focused on the workflows most teams actually use.",
    competitorWeaknesses: [
      "Enterprise sales motion and procurement cycle",
      "Implementation requires dedicated team for weeks",
      "Pricing not transparent",
      "Designed for large, complex workforces",
    ],
    axleStrengths: [
      "Self-serve signup",
      "Operational in under a day",
      "Transparent pricing",
      "Sized for SaaS and mid-market services",
    ],
    comparison: competitorComparisonBase("WorkMarket"),
    pricingNote: "WorkMarket uses quote-based enterprise pricing. Axle is a transparent per-seat fee with a free plan for small teams.",
    faqs: stafffingComplianceFaqs("WorkMarket", "enterprise contractor workforce management"),
  },
  {
    slug: "mbo-partners-alternative",
    competitorName: "MBO Partners",
    metaTitle: "MBO Partners Alternative for Contractor Management | Axle",
    metaDescription: "Axle is the lean ops platform alternative to MBO Partners for teams managing direct independent contractor relationships.",
    intro: "MBO Partners specializes in compliance services and W-2 conversion for independent professionals. If you need that compliance layer, MBO is a strong choice. If you've handled compliance separately and you just need the operational layer for managing independent contractors, Axle is the focused alternative.",
    positioning: "Axle is contractor ops without compliance services. We focus on the operational workflows; you handle classification and compliance through whatever channel makes sense for your team.",
    competitorWeaknesses: [
      "Compliance-services model adds significant cost on top of ops",
      "W-2 conversion features irrelevant for properly-classified contractors",
      "Pricing structure designed for the compliance services bundle",
      "Less self-serve than modern SaaS tools",
    ],
    axleStrengths: [
      "Pure ops layer with no compliance services markup",
      "Self-serve modern SaaS workflow",
      "Transparent per-seat pricing",
      "Operational in under a day",
    ],
    comparison: competitorComparisonBase("MBO Partners"),
    pricingNote: "MBO Partners' pricing bundles compliance services with the ops platform. Axle charges only for the ops layer.",
    faqs: stafffingComplianceFaqs("MBO Partners", "contractor compliance services and W-2 conversion"),
  },
  {
    slug: "andela-alternative",
    competitorName: "Andela",
    metaTitle: "Andela Alternative: Manage Your Own Contractors | Axle",
    metaDescription: "Already have your own contractor network? Axle is the ops platform; Andela is a marketplace. Different tools for different problems.",
    intro: "Andela is a contractor marketplace: they source and place engineers for you. Axle is an ops platform. Once you have your own contractor relationships (whether sourced through Andela or independently), Axle is where you manage the ongoing operations. The two complement each other.",
    positioning: "Axle is contractor ops, not contractor sourcing. Bring your own contractors and manage them with structured timesheets, approvals, and audit trail.",
    competitorWeaknesses: [
      "Marketplace model focused on sourcing, not ops management",
      "No tooling for managing contractors you sourced elsewhere",
      "Pricing assumes a marketplace placement fee",
      "Doesn't address the full operational lifecycle",
    ],
    axleStrengths: [
      "Manage contractors regardless of sourcing channel",
      "Full operational lifecycle: timesheets, invoices, OOO, audit",
      "Per-seat pricing with no placement fees",
      "Free plan for small teams",
    ],
    comparison: competitorComparisonBase("Andela"),
    pricingNote: "Andela charges placement fees per engagement plus markup on contractor rates. Axle charges only for the ops layer, so you can bring contractors from any source.",
    faqs: marketplaceFaqs("Andela"),
  },
  {
    slug: "toptal-alternative",
    competitorName: "Toptal",
    metaTitle: "Toptal Alternative: Manage Your Own Contractors | Axle",
    metaDescription: "Axle is the ops layer for managing the contractors you already have; Toptal is a sourcing marketplace.",
    intro: "Toptal is a curated talent marketplace that screens and places freelance engineers, designers, and product managers. Axle is the ops platform that manages the ongoing relationship after the placement. If you've already sourced your contractors (through Toptal or otherwise), Axle is where you manage them.",
    positioning: "Axle is contractor ops, not contractor sourcing. Manage timesheets, approvals, invoices, and audit trail across your existing contractor network.",
    competitorWeaknesses: [
      "Marketplace model focused on sourcing, not ongoing ops",
      "Markup on contractor rates as part of the placement",
      "No tooling for managing contractors you sourced elsewhere",
      "Operational lifecycle not addressed",
    ],
    axleStrengths: [
      "Source-agnostic ops platform",
      "Full operational lifecycle per contractor",
      "No markup on contractor rates",
      "Per-seat pricing model",
    ],
    comparison: competitorComparisonBase("Toptal"),
    pricingNote: "Toptal builds margin into contractor rates as part of its sourcing service. Axle charges per ops seat with no markup on what you pay contractors.",
    faqs: marketplaceFaqs("Toptal"),
  },
  {
    slug: "upwork-alternative",
    competitorName: "Upwork",
    metaTitle: "Upwork Alternative for Managing Your Contractor Team | Axle",
    metaDescription: "Axle is the ops platform for ongoing contractor relationships; Upwork is a marketplace for one-off freelance gigs.",
    intro: "Upwork is a freelance marketplace, great for one-off gigs and discovery. But once you have a recurring contractor team, Upwork's marketplace fees, payment structure, and platform overhead become friction. Axle is the ops platform for managing that recurring contractor team directly.",
    positioning: "Axle is for managing your established contractor team off-marketplace. Direct relationships, no marketplace markup, structured ops workflows.",
    competitorWeaknesses: [
      "Marketplace fees apply to every transaction",
      "Communication and payment locked into the platform",
      "No structured ops workflow for ongoing relationships",
      "Markup on contractor rates",
    ],
    axleStrengths: [
      "Direct contractor relationships, no marketplace overhead",
      "Structured ops workflows for ongoing engagements",
      "No transaction fees or rate markup",
      "Per-seat pricing covers all features",
    ],
    comparison: competitorComparisonBase("Upwork"),
    pricingNote: "Upwork charges marketplace fees on every contractor payment plus platform service fees. Axle charges per ops seat with no transaction or rate markup.",
    faqs: marketplaceFaqs("Upwork"),
  },
];

export const defaultCompetitors: CompetitorPage[] = competitorsData.map((d) => ({ ...d, updatedDate: today }));
