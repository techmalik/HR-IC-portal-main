# TeamFlow HR Management System - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from BambooHR and Gusto's professional HR interfaces, emphasizing role-based dashboards, streamlined approval workflows, and clear information hierarchy.

## Core Design Principles
- **Role-Based Clarity**: Each user type (IC, Supervisor, Admin/Co-founder) has distinct dashboard layouts
- **Workflow Efficiency**: Minimize clicks for common tasks (timesheet entry, leave approvals)
- **Status Transparency**: Clear visual indicators for pending/approved/rejected states
- **Professional Restraint**: Clean, business-focused aesthetic without unnecessary decoration

## Typography
- **Font Stack**: Inter (primary), Segoe UI, Roboto, system fallback
- **Scale**: 
  - Headings: 24px (page titles), 18px (section headers), 16px (card titles)
  - Body: 14px (standard text), 12px (metadata, table cells)
  - Weight: 600 (headings), 500 (labels), 400 (body)

## Layout System
- **Spacing Units**: Tailwind 4, 5, 6, 8, 12, 16, 20 (prioritize 4, 8, 20)
- **Structure**: Fixed sidebar navigation (256px), main content area with max-w-7xl container
- **Cards**: 8px border radius, white background, subtle shadow, 20px internal padding
- **Grid**: Use 2-4 column grids for dashboard widgets, single column for forms

## Component Library

### Navigation
- **Sidebar**: Fixed left, logo at top, role-based menu items, user profile at bottom
- **Topbar**: Breadcrumbs, notifications icon, quick actions dropdown

### Dashboards
- **IC View**: Upcoming OOO widget, current month timesheet summary, recent invoices, quick action cards
- **Supervisor View**: Pending approvals queue, team timesheet overview, performance eval reminders, direct reports list
- **Admin View**: User management table, system activity feed, role permissions matrix, analytics widgets

### Data Tables
- **Structure**: Sticky headers, alternating row backgrounds (#F9FAFB), sortable columns, row hover states
- **Actions**: Inline action buttons (view, edit, approve/reject), bulk selection for admin tasks
- **Pagination**: Bottom-aligned, showing "X-Y of Z entries"

### Forms & Modals
- **Modals**: Centered, max-w-2xl, overlay with backdrop blur
- **Forms**: Single column, clear labels above inputs, helper text below, validation messages inline
- **Inputs**: 40px height, 8px radius, border on all states, focus ring using primary color

### Status Indicators
- **Badges**: Pill-shaped (9999px radius), uppercase 11px text
  - Approved: Green bg (#10B981 at 10% opacity), green text
  - Pending: Amber bg (#F59E0B at 10% opacity), amber text
  - Rejected: Red bg (#EF4444 at 10% opacity), red text

### Buttons
- **Primary**: Indigo Blue brand color, white text, 40px height
- **Secondary**: White bg, border, dark text
- **Ghost**: Transparent, text only, for tertiary actions
- **Sizes**: Default 40px height, Small 32px for table actions

## Color System
Indigo Blue (hsl 220, 80%, 50%) for all primary actions, CTAs, and active states. Supporting palette:
- Success/Approval: #10B981
- Warning/Pending: #F59E0B
- Error/Rejection: #EF4444
- Background: #F9FAFB
- Text Primary: #111827
- Text Secondary: #6B7280
- Surface: #FFFFFF

## Page-Specific Layouts

### Timesheet Entry
- Calendar month view with daily cells for hour entry and activity logging
- Running total displayed prominently
- Submit button becomes active when all days completed

### Leave Request Flow
- Multi-step form: date range picker → manager selection → reason textarea
- Visual calendar showing existing OOO periods
- Immediate status visibility after submission

### Performance Evaluations
- Structured form sections with progress indicator
- Invite collaborator modal with email input
- Evaluation history timeline with expand/collapse

### Admin User Management
- Searchable table with role filters
- Inline edit for permissions
- Confirmation modals for destructive actions (remove user)

## Images
- **Logo Placement**: Sidebar top (160px width), login page centered
- **No Hero Images**: This is an internal business application - focus on functional dashboard layouts
- **Avatar Placeholders**: User profile images in topbar and team views (40px circular)

## Responsive Behavior
- **Desktop First**: Optimized for 1920x1080+ workflows
- **Mobile**: Collapsible sidebar, stacked cards, scrollable tables
- **Breakpoints**: Mobile (<768px), Tablet (768-1024px), Desktop (1024px+)