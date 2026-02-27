# Mentalyc HR Management System

## Overview
This is a full-stack HR management application for Mentalyc, providing role-based dashboards and workflows. It supports two primary roles: **IC (Individual Contributor)** and **Admin**. ICs with assigned team members automatically gain supervisor privileges. The system manages time-off requests, timesheets, invoices, and performance evaluations, with a focus on streamlining HR operations for contractors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with CSS variables (light/dark mode)
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API (`/api` prefix)
- **Build System**: Vite (frontend), esbuild (server)

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: `shared/schema.ts` (shared between frontend/backend)
- **Schema Validation**: drizzle-zod
- **Storage Interface**: Abstract `IStorage` in `server/storage.ts`

### Authentication
- **Pattern**: Session-based with database-backed tokens
- **Password Security**: bcrypt (12 salt rounds)
- **Session Storage**: PostgreSQL sessions table (24-hour expiration, hourly cleanup)
- **Context**: React Context (`auth-context.tsx`)
- **Role-Based Access**: Conditional rendering and route protection based on `user.role`
- **Supervisor Access**: `isSupervisor` flag includes both Admins and ICs with direct reports.

### Key Design Patterns
- **Dynamic Supervisor Privileges**: ICs with `supervisorId` gain supervisor features.
- **Role-Based Dashboards**: Tailored dashboards for Admin, Supervisor, and IC roles.
- **`hasDirectReports` Flag**: Determines `isSupervisor` status.
- **Status Workflow**: Entities use status enums (pending/approved/rejected) with visual indicators.
- **Shared Types**: Database schema types are shared via `@shared/schema`.
- **Component Composition**: shadcn/ui customized via `design_guidelines.md`.
- **Navigation Hierarchy**: Supervisors have access to "My Team" via the "Approvals & Reviews" sidebar group.
- **Breadcrumb Consistency**: Drill-down pages (like IC Details) follow the `Dashboard -> My Team -> ...` path.

### Recent Improvements (Feb 2026)
- **OOO Requests**: Manager auto-defaults to user's assigned supervisor; past dates disabled; "Resubmit Request" label for rejected requests; scrolls to list after submission; character counter on reason field.
- **Overtime Approvals**: Work description (activityLog) shown in approval dialog; skeleton loading instead of "Unknown User" flash; all tabs use consistent card grid layout; character counter on note field.
- **Leave Requests**: Team conflict detection shows warning when teammates have overlapping dates; consistent grid layout across all tabs; query only fires after user is loaded; character counter on note field.
- **IC Dashboard**: Color-coded timesheet progress bar (green/amber/red based on pace); Pending Overtime Requests summary card added.
- **Supervisor Dashboard**: "Out of Office Today" widget shows team members currently away; team member cards show OOO indicator dots.
- **Profile Security**: Password change now uses dedicated `/api/users/:id/password` endpoint with current-password verification; returns 401 with specific message for wrong password.
- **Users Page**: Edit-mode email validation (inline red border + pre-save check); failed rows highlighted with red border after partial save.
- **Sidebar**: Removed redundant role badge — role is shown once via the role label text only.

### Security Hardening
- **Global Auth Middleware**: All protected API routes validate session tokens.
- **Role-Based Authorization**: `requireRole()` middleware for restricted access.
- **Rate Limiting**: Login endpoint limited to 5 attempts/minute.
- **Session Security**: 24-hour expiration, hourly cleanup.
- **API Protection**: 50+ routes require valid session; ownership verification for user data; privileged access for admins.
- **Self-Approval Prevention**: Users cannot approve their own requests.
- **Error Handling**: Non-blocking notifications; generic error messages to prevent info leaks.

### Professional Invoice Generation System
- Full invoice generation with line items (description, rate, quantity, totals).
- Contractor and bill-to information.
- Saveable payment details for ICs.
- PDF generation using jsPDF, with preview and download.
- Auto-prefill rate from `user.hourlyRate` and quantity from approved timesheet hours.
- `hourlyRate` and `monthlyCap` fields added to user schema.
- Invoice file naming convention: `Invoice-{ContractorName}-{InvoiceNumber}-{Month}-{Year}.pdf`.

### Performance Evaluation System Enhancements
- Dual-input workflow: IC self-assessment followed by manager review.
- IC metadata display on form.
- Collapsible Seniority Scale reference.
- Manager-only fields: "Expectations for Next Review" and "Manager Summary", Experience Level selector.
- Evaluation lifecycle notifications.
- Automatic experience level update on IC profile.
- Schema extended with `expectationsForNextReview`, `managerSummary`, `newExperienceLevel`, `outcomes`, `overallScore`.
- `SENIORITY_SCALE` constant for 7-level framework.
- Direct finalization for managers.
- `Outcomes` tracking (multi-select) and `Overall score` calculation.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.
- **Drizzle Kit**: Migrations and schema push.

### UI Libraries
- **Radix UI**: Accessible UI primitives.
- **Lucide React**: Icon library.
- **date-fns**: Date manipulation.
- **embla-carousel-react**: Carousel component.

### Development Tools
- **Vite**: Development server.
- **tsx**: TypeScript execution.
- **Replit Plugins**: Development banner, error overlay.

### Session Management
- **connect-pg-simple**: PostgreSQL session store (though current uses localStorage).

### Integrations
- **Notion API**: Automatic invoice sync to Notion database (`b2c73227d00440e48037b88f4403603f`) on invoice submission.
  - Fields synced: Title, Status, Submitted at, Duration, Amount, Category, PDF attachment (from Object Storage).
  - Uses `NOTION_API_KEY` environment variable.
  - Non-blocking implementation (`setImmediate`).
- **Replit Object Storage**: Stores invoice PDF files.
  - Replaces base64 storage in DB.
  - Public URLs at `/objects/uploads/{uuid}`.
  - Asynchronous uploads.

### Forced Password Change System
- `mustChangePassword` boolean field in users schema.
- `ForcePasswordChangeModal` component blocks UI until password changed.
- Admin password reset (`POST /api/users/:id/reset-password`) sets `mustChangePassword: true`.
- User password change (`PATCH /api/users/:id/password`) sets `mustChangePassword: false`.
- Non-dismissible modal with password validation (6+ chars, must match).

### Onboarding Tour System
- `OnboardingTour` component with step-by-step tooltips and backdrop highlighting.
- `completedOnboarding` JSONB field tracks completed tours per user.
- **Portal tour** (4 steps): Welcome, sidebar navigation, dashboard, profile.
- **Module tours** (3 steps each): Timesheets, Invoices, Time Off (OOO).
- **Supervisor Approvals tour** (5 steps): Welcome message, Team Approvals overview, Pending Leave Requests, Timesheets to Review, Approve/Reject actions.
- Tours auto-trigger on first page visit if not completed.
- Help button (`data-testid="button-help"`) in header to restart any tour.
- Supervisor tour option visible only to users with supervisor privileges.
- Tour completion saved via `PATCH /api/users/:id/onboarding` endpoint (supports: portal, timesheets, invoices, ooo, supervisor).

### Timesheet Autosave System
- `useAutosave` hook in `client/src/hooks/use-autosave.ts` handles debounced saves
- **Debounce**: 1.5 seconds after last change before saving
- **Status indicators**: "Saving...", "Saved", "Error" shown in UI
- **Baseline tracking**: Uses `initialData` parameter to track changes from server data
- **Save on unmount**: Triggers immediate save when leaving the page to prevent data loss
- Manual Save/Submit buttons removed; autosave handles persistence
- Invoice submission auto-submits associated draft timesheets

### Invoice Submission Confirmation Flow
- Confirmation dialog shows before invoice submission with:
  - Timesheet summary (total hours, days logged)
  - Incomplete days warning (working days without hours)
  - Auto-submit notification for draft timesheets
  - **Pending approvals warning**: Orange banner shows count of pending overtime/weekend work requests awaiting approval
- **Month/Year auto-initialization**: Defaults to current month and year when invoice dialog opens
- **Sync mechanism**: Multiple refetch attempts before showing dialog to ensure latest data
- **Loading state**: "Checking for pending approvals..." indicator while fetching overtime requests
- Backend auto-submits linked draft timesheets when invoice is created

### Refresh Buttons
- Refresh buttons with spinning icon animation added to key pages:
  - Timesheets, Invoices, Evaluations, Time-Off, Overtime Approvals, Leave Requests
- Uses `queryClient.invalidateQueries` to refetch data
- Button disabled during loading state to prevent double-clicks
- All approval/request lists sorted by newest first (createdAt descending)

### Supervisor IC Detail Page
- Route: `/team/:userId` shows detailed view of a specific IC
- **Tabbed interface**:
  - Timesheets: Monthly calendar view with daily hours/activities
  - Evaluations: Performance evaluation history
  - Invoices: Invoice submission history
  - Time-offs: OOO request history
- **Year-at-a-glance summary**: Shows monthly hours for the year
- **Unlock timesheet**: Supervisors can unlock approved timesheets with required note
  - Endpoint: `POST /api/timesheets/:id/unlock`
  - Also sets linked invoices back to pending_review status
  - Creates activity log entry for audit trail

### Weekend Work Approval System
- Weekend work (Saturday/Sunday) requires supervisor approval, similar to overtime (>8 hours)
- `isWeekendWork` boolean field added to `overtime_requests` table
- Auto-creates approval request when IC logs hours on weekend days
- Overtime approvals page updated to show "Overtime & Weekend Work Approvals" title
- Weekend work requests display with orange "Weekend Work" badge
- Supervisors can approve/reject weekend work with notes
- Combined handling: if weekend work exceeds 8 hours, both badges shown

### Email Notification System
- **Provider**: Resend email service (requires `RESEND_API_KEY` secret)
- **Email Service**: `server/emailService.ts` provides email sending functionality
- **Centralized Integration**: Email dispatch is centralized in `createNotification` function in `server/notificationService.ts`
- **Non-blocking**: Uses `setImmediate` for fire-and-forget email sending to prevent request delays
- **Preference-based**: Only sends emails when user has `emailEnabled: true` in their notification preferences
- **Category Filtering**: Respects per-category preferences (OOO, timesheet, overtime, invoice, evaluation notifications)
- **Email Templates**: Professional HTML templates with:
  - Status badges (approved/rejected/pending/action required)
  - Action details and reviewer information
  - Additional context details in table format
  - Direct link to application
  - Footer with notification preferences note
- **Notification Types Covered**:
  - OOO requests: submitted, approved, rejected
  - Timesheets: submitted, approved, rejected
  - Overtime/Weekend work: submitted, approved, rejected
  - Invoices: uploaded, approved, rejected
  - Evaluations: created, reminders, feedback requests
  - User: created (team member notifications)
- **Fallback**: Gracefully handles missing API key (logs warning, continues without sending)
- **From Address**: Configurable via `FROM_EMAIL` env var (defaults to `notifications@resend.dev` for testing)