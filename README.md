# Axle

A SaaS platform for managing Independent Contractors (ICs) and their supervisors. It streamlines time tracking, leave management, invoicing, and performance evaluations in one place.

## Features

### For Independent Contractors
- **Timesheets** — Monthly calendar-based time logging with daily activity notes
- **Out of Office Requests** — Submit and track time-off requests with manager approval
- **Invoices** — Upload invoices and save payment details (SWIFT, IBAN) for automated generation
- **Overtime & Weekend Work** — Request approval for hours beyond the standard workday
- **Performance Evaluations** — Self-assessments and peer feedback across a 7-level seniority framework

### For Supervisors
- **Leave Approvals** — Review team time-off requests with teammate conflict detection
- **Timesheet Reviews** — Approve or request revisions on submitted timesheets
- **Invoice Reviews** — Manage team invoice submissions
- **Overtime Approvals** — Approve extra hours with full work-description context
- **Team Overview** — Dashboard with "Who's OOO Today", pending items, and direct report status

### For Admins
- **User Management** — Create, edit, suspend, and bulk-import users via CSV
- **Activity Logs** — Audit trail of all system actions
- **All Timesheets** — Organisation-wide timesheet visibility

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Radix UI |
| State | TanStack Query (React Query v5) |
| Forms | React Hook Form + Zod |
| Routing | Wouter |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Session-based (bcrypt, DB-backed tokens) |
| Storage | Replit Object Storage (file uploads) |
| Email | Resend |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Environment Variables

```
DATABASE_URL=           # PostgreSQL connection string
SESSION_SECRET=         # Secret for session signing
RESEND_API_KEY=         # For email notifications
FROM_EMAIL=             # Sender address for notifications
```

### Running Locally

```bash
npm install
npm run dev
```

The app starts on port 5000 and serves both the API and the frontend.

### Database Setup

```bash
npm run db:push   # Push schema to database
```

## Project Structure

```
├── client/          # React frontend
│   └── src/
│       ├── components/   # Shared UI components
│       ├── pages/        # Page-level components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Auth context, query client, utilities
├── server/          # Express backend
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database access layer
│   └── emailService.ts   # Email notifications
├── shared/
│   └── schema.ts         # Drizzle schema + Zod types (shared)
└── drizzle.config.ts
```

## User Roles

| Role | Description |
|---|---|
| **IC** | Independent Contractor — manages their own timesheets, OOO, and invoices |
| **IC + Direct Reports** | Automatically gains supervisor features when team members are assigned |
| **Admin** | Full access to all data, user management, and system logs |
