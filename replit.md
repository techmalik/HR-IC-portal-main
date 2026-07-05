# Axle — Multi-Tenant Contractor Management SaaS

## Overview
Axle is a multi-tenant SaaS platform for managing independent contractors. Organizations can sign up, add their contractors, and manage timesheets, leave tracking, invoicing, and performance evaluations — all in one platform.

## User Preferences
Preferred communication style: Simple, everyday language.

## Notification System
- In-app + email notifications for all approval flows: timesheets (submit/approve/reject/unlock/reminder), invoices (submit/approve/reject/paid), expenses, OOO, overtime, evaluations, feedback invitations, contracts.
- Per-user preferences in `notification_preferences`: `inAppEnabled`, `emailEnabled`, plus category toggles (`oooNotifications`, `timesheetNotifications`, `overtimeNotifications`, `invoiceNotifications` (also covers expenses), `deadlineReminders`, `evaluationNotifications`, `teamActionNotifications`).
- Centralized prefix→category mapper: `getPreferenceCategory()` in `server/notificationService.ts`, reused by both in-app and email category checks.
- Notification bell groups items by Today/Yesterday/date and routes via wouter `setLocation` based on `entityType`/`type` (e.g. `/team/:userId`, `/timesheets?highlight=`).
- Timesheet reminder scheduler (`server/index.ts`): runs every 12h, only fires in last 7 days of a month or first 5 days of the next month, idempotent per (user, period) using `entityId = "ts-reminder:YYYY-MM"`.

## System Architecture

### Multi-Tenancy
- **Organizations**: Each signup creates an organization with isolated data
- **Roles**: `owner` (org creator), `admin` (org admin), `ic` (independent contractor)
- **Data Isolation**: All queries filter by `organizationId` from the authenticated user
- **Subscriptions**: Free (3 seats), Starter ($29/mo, 10 seats), Pro ($79/mo, 50 seats), Enterprise (custom)
- **Seat Limits**: Enforced on user creation; admins see usage in Billing page

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with CSS variables (light/dark mode, indigo blue theme)
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API (`/api` prefix)
- **Build System**: Vite (frontend), esbuild (server)

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: `shared/schema.ts` (shared between frontend/backend)
- **Key Tables**: `organizations`, `subscriptions`, `users`, `ooo_requests`, `timesheets`, `daily_entries`, `overtime_requests`, `invoices`, `invoice_line_items`, `evaluations`, `evaluation_sections`, `ic_responsibilities`, `feedback_invitations`, `notifications`, `notification_preferences`, `activity_logs`, `sessions`
- **Storage Interface**: Abstract `IStorage` in `server/storage.ts`

### Authentication
- **Self-Service Registration**: Public signup at `/signup` creates org + owner user + free subscription
- **Session-based**: Database-backed tokens (24-hour expiration, hourly cleanup)
- **Password Security**: bcrypt (12 salt rounds)
- **Role-Based Access**: `owner`, `admin`, `ic` roles with conditional rendering
- **Supervisor Access**: ICs with direct reports automatically gain supervisor features

### Public Pages
- **Landing Page** (`/`): Hero section, features, pricing cards, CTA buttons
- **Login** (`/login`): Username/password authentication
- **Signup** (`/signup`): Organization registration form (name, email, password, org name)
- **Competitive Analysis** (`/competitive-analysis`): Strategy report with web preview + jsPDF download (data in `client/src/data/competitorData.ts`)

### Key Features
- **Timesheets**: Monthly calendar-based hour logging with autosave
- **Leave Management**: OOO requests with team conflict detection
- **Invoicing**: Auto-generated invoices from timesheets, PDF generation with jsPDF
- **Performance Evaluations**: 7-level seniority framework, IC self-assessment + manager review
- **Overtime/Weekend Work**: Approval workflows for extra hours
- **Billing**: Plan management, seat usage tracking, upgrade/downgrade
- **Onboarding Tours**: Role-specific guided tours for new users
- **Email Notifications**: Resend integration with preference-based delivery
- **Activity Logs**: Full audit trail per organization

### Integrations
- **Replit Object Storage**: Invoice PDFs and avatar uploads
- **Resend**: Email notifications (requires `RESEND_API_KEY`)

### Key Design Patterns
- **Dynamic Supervisor Privileges**: ICs with `supervisorId` gain supervisor features
- **Organization-Scoped Queries**: All storage methods accept optional `organizationId` for data isolation
- **Status Workflows**: Entities use status enums (pending/approved/rejected)
- **Shared Types**: Database schema types shared via `@shared/schema`

## External Dependencies

### Database
- **PostgreSQL**: Primary database
- **Drizzle Kit**: Schema push (`npm run db:push`)

### UI Libraries
- **Radix UI**: Accessible UI primitives
- **Lucide React**: Icon library
- **date-fns**: Date manipulation

### Development
- **Vite**: Dev server and frontend build
- **tsx**: TypeScript execution
