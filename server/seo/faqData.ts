export const FAQ_LAST_UPDATED = "2025-04-30";

export interface FaqItem {
  question: string;
  answer: string;
  section: string;
}

export const faqItems: FaqItem[] = [
  // Getting Started
  {
    section: "Getting Started",
    question: "What is TeamFlow and who is it for?",
    answer:
      "TeamFlow is a contractor operations platform built for SaaS companies and remote-first businesses that manage independent contractors. It brings timesheets, invoice approvals, OOO requests, and performance tracking into one place — replacing the spreadsheets, email threads, and ad-hoc Slack processes that most teams rely on. It's designed for ops leads, HR managers, and founders who manage between 3 and 200 contractors.",
  },
  {
    section: "Getting Started",
    question: "How quickly can my team get set up on TeamFlow?",
    answer:
      "Most teams are fully operational within a single day. The setup flow takes about 20 minutes: create your organization, invite your contractors, configure your billing cycle, and you're ready. Contractors receive an email invitation and can submit their first timesheet on the same day. There's no lengthy onboarding or professional services requirement.",
  },
  {
    section: "Getting Started",
    question: "Do I need to install any software to use TeamFlow?",
    answer:
      "No. TeamFlow is entirely web-based and works in any modern browser. There's no desktop app to install, no mobile app required, and no browser extension. Contractors and managers access it at the same URL from any device, including tablets and phones.",
  },
  {
    section: "Getting Started",
    question: "Can I try TeamFlow before committing to a paid plan?",
    answer:
      "Yes. TeamFlow offers a free plan that supports up to 3 contractors with full access to timesheets, invoice approvals, and OOO management. No credit card is required to sign up. The free plan is designed to let small teams validate the workflow before upgrading.",
  },
  {
    section: "Getting Started",
    question: "Does TeamFlow support multiple organizations or clients?",
    answer:
      "Each TeamFlow account is scoped to a single organization. If you're a contractor yourself managing relationships with multiple clients, each client would have their own TeamFlow organization and invite you in. If you run an agency with multiple client accounts, contact us about our Agency plan which supports cross-organization management from a single login.",
  },

  // Timesheets & Invoices
  {
    section: "Timesheets & Invoices",
    question: "How does the timesheet submission and approval process work?",
    answer:
      "Contractors log hours daily or weekly through the TeamFlow interface. When the billing period ends, they submit the timesheet for review. Their assigned supervisor receives a notification, reviews the hours, and either approves or returns the timesheet with comments. Approved timesheets unlock the invoice submission for that period — contractors cannot invoice for unapproved hours.",
  },
  {
    section: "Timesheets & Invoices",
    question: "What happens if a contractor submits a timesheet late?",
    answer:
      "Late submissions are flagged in the supervisor dashboard. TeamFlow sends automated reminders to contractors before the submission deadline, and escalation notifications to admins when SLAs are missed. Your organization can configure what happens to late timesheets — whether they roll to the next period or are handled manually on a case-by-case basis.",
  },
  {
    section: "Timesheets & Invoices",
    question: "Can contractors upload invoices directly in TeamFlow?",
    answer:
      "Yes. Once a timesheet is approved, the contractor can upload their invoice as a PDF directly in TeamFlow. The invoice is linked to the approved timesheet, so finance can reconcile hours against invoice amounts without digging through email. Supervisors and admins can approve, reject, or request revisions on uploaded invoices.",
  },
  {
    section: "Timesheets & Invoices",
    question: "Does TeamFlow handle invoice payments directly?",
    answer:
      "TeamFlow manages the invoice approval workflow — submission, review, approval, and record-keeping — but does not process payments directly. Once an invoice is approved in TeamFlow, your finance team handles payment through your existing banking or payroll infrastructure (wire transfer, ACH, Wise, etc.). This keeps TeamFlow lightweight and avoids introducing another financial intermediary into your stack.",
  },
  {
    section: "Timesheets & Invoices",
    question: "Can I set different billing cycles for different contractors?",
    answer:
      "Yes. TeamFlow supports per-contractor billing cycle configuration. You can have some contractors on weekly cycles, others on bi-weekly or monthly cycles, all within the same organization. The timesheet and invoice workflow adapts to each contractor's cycle independently.",
  },
  {
    section: "Timesheets & Invoices",
    question: "What currencies does TeamFlow support for invoices?",
    answer:
      "TeamFlow supports invoice recording in any currency. Contractors can specify the currency on their invoice and include their bank details (including IBAN and SWIFT codes for international transfers). TeamFlow stores the invoiced amount in the original currency — it does not perform currency conversion, which keeps the financial records accurate for your accounting team.",
  },

  // Compliance & Legal
  {
    section: "Compliance & Legal",
    question: "How does TeamFlow help prevent contractor misclassification?",
    answer:
      "TeamFlow is designed around the contractor model — it doesn't include features like paid leave accrual, employee benefits tracking, or mandatory scheduling that could blur the employee-contractor line. The timesheet and invoice workflow reinforces the contractor model: contractors submit for approval as independent service providers, not as employees logging punches. For classification assessments, we recommend consulting a labor attorney for your specific situation.",
  },
  {
    section: "Compliance & Legal",
    question: "Does TeamFlow generate 1099 forms for US contractors?",
    answer:
      "TeamFlow tracks total invoiced amounts per contractor per calendar year, making it easy to identify which US contractors crossed the $600 1099-NEC threshold. However, TeamFlow does not generate or e-file 1099 forms directly — this is typically handled through your payroll provider (Gusto, ADP, etc.) or tax software. The records in TeamFlow serve as the source of truth for the amounts to report.",
  },
  {
    section: "Compliance & Legal",
    question: "Is contractor data stored securely in TeamFlow?",
    answer:
      "Yes. TeamFlow stores all data — timesheets, invoices, contractor profiles, and banking details — with encryption at rest and in transit. Access is role-based: contractors can only see their own records, supervisors see only their direct reports, and admins have organization-wide access. Uploaded documents (invoices, contracts) are stored in secure object storage and are not publicly accessible.",
  },
  {
    section: "Compliance & Legal",
    question: "Can I export all contractor records for an audit?",
    answer:
      "Yes. Admins can export timesheet records, invoice records, and approval history for any contractor or date range. Exports are available in CSV format, suitable for your accounting system or for audit documentation. All approval actions are logged with timestamps and user IDs, providing a complete audit trail.",
  },

  // OOO & Availability
  {
    section: "OOO & Availability",
    question: "How does OOO management work for contractors in TeamFlow?",
    answer:
      "Contractors submit out-of-office requests through TeamFlow specifying the date range and a brief reason. Supervisors receive a notification and can approve or decline. Approved OOO periods appear in the supervisor's team calendar, giving visibility into coverage gaps before they become problems. Hourly contractors don't bill for OOO days, and the system accounts for this in timesheet validation.",
  },
  {
    section: "OOO & Availability",
    question: "Does TeamFlow distinguish between different types of leave (sick, vacation, public holidays)?",
    answer:
      "TeamFlow supports multiple OOO request types, which you can customize for your organization. Common types include vacation, sick leave, public holiday, and personal day. These are advisory categories — they help supervisors understand context when approving. Since contractors are not entitled to paid leave by default, the categorization is for planning purposes only, not for leave accrual or payout.",
  },
  {
    section: "OOO & Availability",
    question: "Can I see all contractor availability at a glance?",
    answer:
      "Yes. The supervisor dashboard includes a team availability view that shows who is working, who is on approved OOO, and whose timesheets are pending for the current period — all in a single calendar view. This makes it easy to spot coverage gaps and plan deadlines around contractor availability.",
  },

  // Roles & Permissions
  {
    section: "Roles & Permissions",
    question: "What user roles does TeamFlow support?",
    answer:
      "TeamFlow includes four roles: Owner (full access including billing), Admin (full access to all contractor records and settings), Supervisor (can approve timesheets and invoices for their direct reports), and IC/Contractor (can submit their own timesheets, OOO requests, and invoices). Supervisors can be ICs themselves — a contractor who manages other contractors gets both sets of permissions.",
  },
  {
    section: "Roles & Permissions",
    question: "Can I give a supervisor access to only their own team's records?",
    answer:
      "Yes. Supervisors in TeamFlow have a bounded view — they can only see and act on records for contractors who are directly assigned to them. They cannot view other supervisors' team records, organization-wide financials, or admin settings. This makes TeamFlow safe to use with supervisors who are themselves contractors, without exposing sensitive organization-wide data.",
  },
];
