import { randomBytes } from "crypto";
import { db } from "./db";
import { hashPassword } from "./storage";
import {
  users,
  timesheets,
  dailyEntries,
  overtimeRequests,
  evaluations,
  evaluationSections,
  oooRequests,
  icResponsibilities,
  DEFAULT_EVALUATION_SECTIONS,
} from "@shared/schema";

// Sample contractor seeded into every new organization so first-time users
// see a populated workspace (timesheets, an evaluation, time-off requests)
// instead of empty pages. Removed via storage.deleteDemoData / the
// "Remove sample data" banner. All records are dated relative to signup.

const DEMO_FIRST_NAME = "Aisha";
const DEMO_LAST_NAME = "Koni";

const ACTIVITY_LOGS = [
  "Implemented responsive dashboard filters and fixed layout regressions",
  "Built the CSV export flow for monthly reports; added unit tests",
  "Code review and pairing session on the billing settings page",
  "Refactored the shared form components to reduce duplication",
  "Sprint planning; scoped the notification preferences redesign",
  "Fixed cross-browser issues in the date picker and updated docs",
  "Integrated the new charting library on the analytics page",
  "Accessibility pass on the onboarding flow (keyboard nav, ARIA labels)",
  "Investigated and fixed a caching bug in the reports view",
  "Prototyped the mobile navigation; gathered feedback from design",
];

// Aligned by index with DEFAULT_EVALUATION_SECTIONS (1..6).
const SECTION_CONTENT = [
  {
    selfRating: 4,
    managerRating: 4,
    selfDocumentation:
      "Shipped the reporting dashboard (6 weeks) and the CSV export (2 weeks). The dashboard cut weekly manual reporting time for the ops team; export unblocked two enterprise onboarding requests.",
    improvementGoal: "Quantify impact earlier by defining success metrics before starting a deliverable.",
    managerFeedback: "Consistently delivers work that moves the product forward; the dashboard had clear, measurable impact.",
  },
  {
    selfRating: 4,
    managerRating: 4,
    selfDocumentation:
      "Hit 3 of 4 personal targets this period. The remaining one (mobile navigation) was descoped after priorities shifted mid-quarter.",
    improvementGoal: "Flag at-risk targets earlier in the period instead of at check-ins.",
    managerFeedback: "Good alignment with team goals; communicated the descope well once raised.",
  },
  {
    selfRating: 3,
    managerRating: 3,
    selfDocumentation:
      "Dashboard shipped one week late due to underestimated data-migration work. CSV export and accessibility pass landed on time.",
    improvementGoal: "Break estimates down past the feature level to catch hidden migration/integration work.",
    managerFeedback: "Estimation is improving; the late delivery was flagged early, which helped us re-plan.",
  },
  {
    selfRating: 4,
    managerRating: 5,
    selfDocumentation:
      "Owned the frontend of the reporting area end to end, kept the component library healthy, and stayed on top of review requests.",
    improvementGoal: "Delegate more of the routine component upkeep as the team grows.",
    managerFeedback: "Extremely reliable on core responsibilities — reviews are fast and thorough.",
  },
  {
    selfRating: 4,
    managerRating: 4,
    selfDocumentation:
      "Most deliverables needed a single review cycle. The dashboard needed two reworks on the query layer; added tests to prevent regressions.",
    improvementGoal: "Adopt the new testing patterns for data-heavy views from the start.",
    managerFeedback: "Quality is high and rework is rare; test coverage on new work has been great.",
  },
  {
    selfRating: 5,
    managerRating: 4,
    selfDocumentation:
      "Introduced the charting library evaluation, wrote the internal guide for it, and ran a knowledge-sharing session on accessibility tooling.",
    improvementGoal: "Turn the one-off sessions into a recurring format.",
    managerFeedback: "Strong initiative this period — the library guide saved the rest of the team real time.",
  },
];

const RESPONSIBILITIES = [
  "Own the frontend of the reporting and analytics area",
  "Maintain the shared UI component library",
  "Review frontend pull requests within one business day",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Calendar month `offset` months relative to `from` (month is 1-12). */
function monthAt(from: Date, offset: number): { year: number; month: number } {
  const d = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 0 = Sunday .. 6 = Saturday */
function dayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

/** First day >= `fromDay` in the month that is a Monday-Friday. */
function nextWeekday(year: number, month: number, fromDay: number): number {
  let day = fromDay;
  const last = daysInMonth(year, month);
  while (day <= last && [0, 6].includes(dayOfWeek(year, month, day))) day++;
  return Math.min(day, last);
}

export async function seedDemoData(
  organizationId: string,
  organizationSlug: string,
  ownerUserId: string,
): Promise<void> {
  const now = new Date();

  // Random throwaway password; the login route also rejects isDemo accounts.
  const password = await hashPassword(randomBytes(32).toString("hex"));
  const email = `aisha.koni+${organizationSlug}@sample.axlehq.app`;

  // Approved 2-day leave in the most recent full month (third week), so the
  // matching timesheet legitimately has two empty weekdays.
  const lastMonth = monthAt(now, -1);
  const oooStartDay = nextWeekday(lastMonth.year, lastMonth.month, 16);
  const oooEndDay = nextWeekday(lastMonth.year, lastMonth.month, oooStartDay + 1);
  const oooDates = new Set([
    isoDate(lastMonth.year, lastMonth.month, oooStartDay),
    isoDate(lastMonth.year, lastMonth.month, oooEndDay),
  ]);

  await db.transaction(async (tx) => {
    const [demoUser] = await tx
      .insert(users)
      .values({
        organizationId,
        username: email,
        password,
        email,
        firstName: DEMO_FIRST_NAME,
        lastName: DEMO_LAST_NAME,
        role: "ic",
        jobTitle: "Frontend Engineer",
        team: "Engineering",
        supervisorId: ownerUserId,
        managerId: ownerUserId,
        isActive: true,
        isDemo: true,
        experienceLevel: 4,
        contractorStatus: "engaged",
        hourlyRate: 45,
        monthlyCap: 160,
        currency: "USD",
      })
      .returning();

    // --- Timesheets: previous 3 full calendar months, approved ---
    for (let offset = -3; offset <= -1; offset++) {
      const { year, month } = monthAt(now, offset);
      const isMiddleMonth = offset === -2;

      const entries: { date: string; hours: number; activityLog: string }[] = [];
      let logIndex = 0;
      for (let day = 1; day <= daysInMonth(year, month); day++) {
        const dow = dayOfWeek(year, month, day);
        if (dow === 0 || dow === 6) continue;
        const dateStr = isoDate(year, month, day);
        if (oooDates.has(dateStr)) continue;
        // Mostly full days with the occasional shorter one.
        const hours = logIndex % 9 === 4 ? 7 : logIndex % 9 === 7 ? 6 : 8;
        entries.push({
          date: dateStr,
          hours,
          activityLog: ACTIVITY_LOGS[logIndex % ACTIVITY_LOGS.length],
        });
        logIndex++;
      }

      // One approved Saturday of weekend work in the middle month.
      let overtimeDate: string | null = null;
      if (isMiddleMonth) {
        let saturday = 8;
        while (dayOfWeek(year, month, saturday) !== 6) saturday++;
        overtimeDate = isoDate(year, month, saturday);
        entries.push({
          date: overtimeDate,
          hours: 4,
          activityLog: "Weekend release support: monitored the deploy and fixed a hotfix regression",
        });
        entries.sort((a, b) => a.date.localeCompare(b.date));
      }

      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      const monthEnd = new Date(year, month - 1, daysInMonth(year, month));
      const submittedAt = new Date(monthEnd.getTime() + 1 * 24 * 60 * 60 * 1000);
      const reviewedAt = new Date(monthEnd.getTime() + 2 * 24 * 60 * 60 * 1000);

      const [timesheet] = await tx
        .insert(timesheets)
        .values({
          organizationId,
          userId: demoUser.id,
          month,
          year,
          totalHours,
          status: "approved",
          submittedAt,
          reviewedBy: ownerUserId,
          reviewedAt,
        })
        .returning();

      await tx.insert(dailyEntries).values(
        entries.map((e) => ({
          organizationId,
          timesheetId: timesheet.id,
          date: e.date,
          hours: e.hours,
          activityLog: e.activityLog,
        })),
      );

      if (overtimeDate) {
        await tx.insert(overtimeRequests).values({
          organizationId,
          userId: demoUser.id,
          timesheetId: timesheet.id,
          date: overtimeDate,
          requestedHours: 4,
          approvedHours: 4,
          status: "approved",
          reviewedBy: ownerUserId,
          reviewedAt,
          isWeekendWork: true,
        });
      }
    }

    // --- Completed evaluation covering the previous half-year ---
    const periodStartMonth = monthAt(now, -6);
    const periodEnd = isoDate(
      lastMonth.year,
      lastMonth.month,
      daysInMonth(lastMonth.year, lastMonth.month),
    );
    const periodEndDate = new Date(lastMonth.year, lastMonth.month - 1, daysInMonth(lastMonth.year, lastMonth.month));
    const dayMs = 24 * 60 * 60 * 1000;

    const managerRatings = SECTION_CONTENT.map((s) => s.managerRating);
    const overallScore = Math.round(
      managerRatings.reduce((sum, r) => sum + r, 0) / managerRatings.length,
    );

    const [evaluation] = await tx
      .insert(evaluations)
      .values({
        organizationId,
        icId: demoUser.id,
        managerId: ownerUserId,
        periodStart: isoDate(periodStartMonth.year, periodStartMonth.month, 1),
        periodEnd,
        experienceLevelAtEval: 3,
        newExperienceLevel: 4,
        overallSelfRating: 4,
        overallManagerRating: 4,
        overallScore,
        outcomes: [
          "Promoted to Level 4",
          "Scope expanded to own the reporting and analytics area",
        ],
        expectationsForNextReview:
          "Lead a medium-sized initiative end to end, including estimation and cross-team coordination.",
        managerSummary:
          "Aisha had a strong half-year: the reporting dashboard shipped with measurable impact and her review turnaround kept the whole team moving. Estimation on larger projects is the main growth area.",
        status: "completed",
        icSubmittedAt: new Date(periodEndDate.getTime() + 2 * dayMs),
        managerSubmittedAt: new Date(periodEndDate.getTime() + 5 * dayMs),
        completedAt: new Date(periodEndDate.getTime() + 5 * dayMs),
      })
      .returning();

    await tx.insert(evaluationSections).values(
      DEFAULT_EVALUATION_SECTIONS.map((template, i) => ({
        organizationId,
        evaluationId: evaluation.id,
        sectionNumber: template.sectionNumber,
        sectionName: template.sectionName,
        question: template.question,
        ...SECTION_CONTENT[i],
      })),
    );

    await tx.insert(icResponsibilities).values(
      RESPONSIBILITIES.map((responsibility) => ({
        organizationId,
        icId: demoUser.id,
        responsibility,
        isActive: true,
      })),
    );

    // --- Time-off requests: one approved (past), one pending (upcoming) ---
    const upcoming = new Date(now.getTime() + 14 * dayMs);
    const upcomingMonth = { year: upcoming.getFullYear(), month: upcoming.getMonth() + 1 };
    const upcomingDay = nextWeekday(upcomingMonth.year, upcomingMonth.month, upcoming.getDate());
    const upcomingDate = isoDate(upcomingMonth.year, upcomingMonth.month, upcomingDay);

    await tx.insert(oooRequests).values([
      {
        organizationId,
        userId: demoUser.id,
        managerId: ownerUserId,
        startDate: isoDate(lastMonth.year, lastMonth.month, oooStartDay),
        endDate: isoDate(lastMonth.year, lastMonth.month, oooEndDay),
        oooType: "full_day",
        reason: "Family travel",
        status: "approved",
        reviewedBy: ownerUserId,
        reviewedAt: new Date(lastMonth.year, lastMonth.month - 1, Math.max(1, oooStartDay - 7)),
      },
      {
        organizationId,
        userId: demoUser.id,
        managerId: ownerUserId,
        startDate: upcomingDate,
        endDate: upcomingDate,
        oooType: "full_day",
        reason: "Medical appointment",
        status: "pending",
      },
    ]);
  });
}
