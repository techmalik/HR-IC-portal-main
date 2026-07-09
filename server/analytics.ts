import { storage } from "./storage";
import type { User } from "@shared/schema";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export interface AnalyticsFilters {
  startMonth: YearMonth;
  endMonth: YearMonth;
  userId?: string;
  team?: string;
  currency?: string;
  displayCurrency: string;
}

export interface MonthKey extends YearMonth {
  label: string; // "YYYY-MM"
}

// ---------------------------------------------------------------------------
// Currency conversion (static reference rates relative to USD)
// ---------------------------------------------------------------------------
// Used when callers ask for spend in a single display currency. These are
// static reference rates, suitable for analytics overviews. Override at the
// org level via the `currency_rates` storage hook if/when it ships.
//
// STALE BY DESIGN, NOT LIVE: hand-set once (~2025) and never refreshed
// automatically — do not use these for anything invoiced or billed (Paystack
// charges use Paystack's own rate at transaction time; the landing page's
// pricing calculator uses Axle's real published local prices, not this
// table). If analytics accuracy starts to matter for FX-sensitive decisions,
// replace this with a fetched-and-cached rate source instead of hand-editing
// the numbers below.
const FX_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  AUD: 0.66,
  INR: 0.012,
  JPY: 0.0067,
  BRL: 0.2,
  MXN: 0.058,
  PHP: 0.018,
};

function fxConvert(amountInCents: number, from: string, to: string): number {
  const fromRate = FX_RATES_TO_USD[from.toUpperCase()] ?? 1;
  const toRate = FX_RATES_TO_USD[to.toUpperCase()] ?? 1;
  if (toRate === 0) return amountInCents;
  return Math.round((amountInCents * fromRate) / toRate);
}

// ---------------------------------------------------------------------------
// Filter parsing
// ---------------------------------------------------------------------------
export function parseFilters(query: Record<string, unknown>): AnalyticsFilters {
  const now = new Date();
  const defaultEnd: YearMonth = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const defaultStart = subtractMonths(defaultEnd, 11);

  const startStr = typeof query.startMonth === "string" ? query.startMonth : "";
  const endStr = typeof query.endMonth === "string" ? query.endMonth : "";
  const displayStr = typeof query.displayCurrency === "string" ? query.displayCurrency : "";
  const userStr = typeof query.userId === "string" ? query.userId : "";
  const teamStr = typeof query.team === "string" ? query.team : "";
  const currencyStr = typeof query.currency === "string" ? query.currency : "";

  return {
    startMonth: parseYearMonth(startStr) ?? defaultStart,
    endMonth: parseYearMonth(endStr) ?? defaultEnd,
    userId: userStr.length > 0 ? userStr : undefined,
    team: teamStr.length > 0 ? teamStr : undefined,
    currency: currencyStr.length > 0 ? currencyStr.toUpperCase() : undefined,
    displayCurrency: displayStr.length > 0 ? displayStr.toUpperCase() : "USD",
  };
}

function parseYearMonth(s: string): YearMonth | null {
  const m = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function subtractMonths(ym: YearMonth, n: number): YearMonth {
  let y = ym.year;
  let m = ym.month - n;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}

export function buildMonthKeys(start: YearMonth, end: YearMonth): MonthKey[] {
  const keys: MonthKey[] = [];
  let y = start.year;
  let m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    keys.push({ year: y, month: m, label: `${y}-${String(m).padStart(2, "0")}` });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (keys.length > 600) break; // safety
  }
  return keys;
}

function inRange(year: number, month: number, f: AnalyticsFilters): boolean {
  const v = year * 100 + month;
  const s = f.startMonth.year * 100 + f.startMonth.month;
  const e = f.endMonth.year * 100 + f.endMonth.month;
  return v >= s && v <= e;
}

function dateInRange(date: Date, f: AnalyticsFilters): boolean {
  return inRange(date.getUTCFullYear(), date.getUTCMonth() + 1, f);
}

function teamLabel(team: string | null | undefined): string {
  return team && team.length > 0 ? team : "(unassigned)";
}

function applyUserFilter(users: User[], f: AnalyticsFilters): User[] {
  let list = users;
  if (f.userId) list = list.filter((u) => u.id === f.userId);
  if (f.team) list = list.filter((u) => u.team === f.team);
  return list;
}

// ---------------------------------------------------------------------------
// Spend
// ---------------------------------------------------------------------------
export interface SpendSeriesPoint {
  month: string;
  currency: string;
  amount: number; // cents in source currency
}

export interface SpendConvertedPoint {
  month: string;
  amount: number; // cents in display currency
}

export interface SpendCurrencyTotal {
  currency: string;
  amount: number; // cents in source currency
  amountInDisplay: number; // cents converted to displayCurrency
}

export interface SpendResult {
  filters: AnalyticsFilters;
  displayCurrency: string;
  months: string[];
  currencies: string[];
  series: SpendSeriesPoint[]; // native amounts per month per currency
  convertedSeries: SpendConvertedPoint[]; // single curve in display currency
  totalsByCurrency: SpendCurrencyTotal[];
  totalInDisplay: number;
}

export async function getSpend(orgId: string, f: AnalyticsFilters): Promise<SpendResult> {
  const [invoices, users] = await Promise.all([
    storage.getAllInvoices(orgId),
    storage.getAllUsers(orgId),
  ]);
  const allowedUsers = new Set(applyUserFilter(users, f).map((u) => u.id));

  const months = buildMonthKeys(f.startMonth, f.endMonth);
  const monthLabels = months.map((m) => m.label);

  const counted = invoices.filter((inv) => {
    if (!allowedUsers.has(inv.userId)) return false;
    if (inv.status !== "approved" && inv.status !== "paid") return false;
    if (!inRange(inv.year, inv.month, f)) return false;
    if (f.currency && (inv.currency || "USD").toUpperCase() !== f.currency) return false;
    return true;
  });

  const nativeByMonthCurrency = new Map<string, Map<string, number>>();
  const currencies = new Set<string>();
  for (const inv of counted) {
    const monthLabel = `${inv.year}-${String(inv.month).padStart(2, "0")}`;
    const cur = (inv.currency || "USD").toUpperCase();
    currencies.add(cur);
    if (!nativeByMonthCurrency.has(monthLabel)) nativeByMonthCurrency.set(monthLabel, new Map());
    const inner = nativeByMonthCurrency.get(monthLabel)!;
    inner.set(cur, (inner.get(cur) || 0) + Number(inv.amount || 0));
  }

  const currencyList = Array.from(currencies).sort();
  const series: SpendSeriesPoint[] = [];
  for (const m of monthLabels) {
    const inner = nativeByMonthCurrency.get(m);
    for (const cur of currencyList) {
      series.push({ month: m, currency: cur, amount: inner?.get(cur) || 0 });
    }
  }

  const convertedByMonth = new Map<string, number>();
  const totalsByCurrencyMap = new Map<string, number>();
  for (const p of series) {
    totalsByCurrencyMap.set(p.currency, (totalsByCurrencyMap.get(p.currency) || 0) + p.amount);
    if (p.amount === 0) continue;
    const converted = fxConvert(p.amount, p.currency, f.displayCurrency);
    convertedByMonth.set(p.month, (convertedByMonth.get(p.month) || 0) + converted);
  }

  const convertedSeries: SpendConvertedPoint[] = monthLabels.map((m) => ({
    month: m,
    amount: convertedByMonth.get(m) || 0,
  }));

  const totalsByCurrency: SpendCurrencyTotal[] = Array.from(totalsByCurrencyMap.entries())
    .map(([currency, amount]) => ({
      currency,
      amount,
      amountInDisplay: fxConvert(amount, currency, f.displayCurrency),
    }))
    .sort((a, b) => b.amountInDisplay - a.amountInDisplay);

  const totalInDisplay = convertedSeries.reduce((s, p) => s + p.amount, 0);

  return {
    filters: f,
    displayCurrency: f.displayCurrency,
    months: monthLabels,
    currencies: currencyList,
    series,
    convertedSeries,
    totalsByCurrency,
    totalInDisplay,
  };
}

// ---------------------------------------------------------------------------
// Hours & utilization
// ---------------------------------------------------------------------------
export interface HoursPerICPoint {
  userId: string;
  name: string;
  team: string;
  monthlyCap: number | null;
  totalHours: number;
  monthsCounted: number;
  utilizationPct: number | null;
}

export interface HoursTeamPoint {
  team: string;
  totalHours: number;
  contractors: number;
}

export interface HoursTrendPoint {
  month: string;
  totalHours: number;
}

export interface HoursResult {
  filters: AnalyticsFilters;
  months: string[];
  perIC: HoursPerICPoint[];
  perTeam: HoursTeamPoint[];
  trend: HoursTrendPoint[];
}

export async function getHours(orgId: string, f: AnalyticsFilters): Promise<HoursResult> {
  const [allTimesheets, users] = await Promise.all([
    storage.getAllTimesheets(orgId),
    storage.getAllUsers(orgId),
  ]);
  const filteredUsers = applyUserFilter(users, f);
  const allowed = new Set(filteredUsers.map((u) => u.id));

  const months = buildMonthKeys(f.startMonth, f.endMonth);
  const monthLabels = months.map((m) => m.label);

  const inScope = allTimesheets.filter(
    (t) => allowed.has(t.userId) && inRange(t.year, t.month, f)
  );

  type ICAgg = { hours: number; months: number };
  const perICMap = new Map<string, ICAgg>();
  for (const t of inScope) {
    const e: ICAgg = perICMap.get(t.userId) ?? { hours: 0, months: 0 };
    e.hours += Number(t.totalHours || 0);
    e.months += 1;
    perICMap.set(t.userId, e);
  }

  const perIC: HoursPerICPoint[] = filteredUsers.map((u) => {
    const e = perICMap.get(u.id) ?? { hours: 0, months: 0 };
    const cap = u.monthlyCap ?? null;
    const utilization = cap !== null && cap > 0 && e.months > 0
      ? (e.hours / (cap * e.months)) * 100
      : null;
    return {
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      team: teamLabel(u.team),
      monthlyCap: cap,
      totalHours: e.hours,
      monthsCounted: e.months,
      utilizationPct: utilization === null ? null : Math.round(utilization * 10) / 10,
    };
  });
  perIC.sort((a, b) => b.totalHours - a.totalHours);

  type TeamAgg = { hours: number; users: Set<string> };
  const perTeamMap = new Map<string, TeamAgg>();
  for (const r of perIC) {
    const e: TeamAgg = perTeamMap.get(r.team) ?? { hours: 0, users: new Set<string>() };
    e.hours += r.totalHours;
    e.users.add(r.userId);
    perTeamMap.set(r.team, e);
  }
  const perTeam: HoursTeamPoint[] = Array.from(perTeamMap.entries())
    .map(([team, agg]) => ({ team, totalHours: agg.hours, contractors: agg.users.size }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const trendMap = new Map<string, number>();
  for (const t of inScope) {
    const key = `${t.year}-${String(t.month).padStart(2, "0")}`;
    trendMap.set(key, (trendMap.get(key) || 0) + Number(t.totalHours || 0));
  }
  const trend: HoursTrendPoint[] = monthLabels.map((m) => ({ month: m, totalHours: trendMap.get(m) || 0 }));

  return { filters: f, months: monthLabels, perIC, perTeam, trend };
}

// ---------------------------------------------------------------------------
// Overtime
// ---------------------------------------------------------------------------
export interface OvertimePerICPoint {
  userId: string;
  name: string;
  team: string;
  approvedHours: number;
  pendingHours: number;
  requests: number;
}

export interface OvertimeTeamPoint {
  team: string;
  approvedHours: number;
  pendingHours: number;
  requests: number;
}

export interface OvertimeTrendPoint {
  month: string;
  approvedHours: number;
}

export interface OvertimeResult {
  filters: AnalyticsFilters;
  months: string[];
  perIC: OvertimePerICPoint[];
  perTeam: OvertimeTeamPoint[];
  trend: OvertimeTrendPoint[];
}

export async function getOvertime(orgId: string, f: AnalyticsFilters): Promise<OvertimeResult> {
  const [overtime, users] = await Promise.all([
    storage.getAllOvertimeRequests(orgId),
    storage.getAllUsers(orgId),
  ]);
  const filteredUsers = applyUserFilter(users, f);
  const userById = new Map(filteredUsers.map((u) => [u.id, u]));
  const allowed = new Set(filteredUsers.map((u) => u.id));

  const months = buildMonthKeys(f.startMonth, f.endMonth);
  const monthLabels = months.map((m) => m.label);

  const inScope = overtime.filter((o) => allowed.has(o.userId) && dateInRange(new Date(o.date), f));

  const trendMap = new Map<string, number>();
  type ICAgg = { approved: number; pending: number; requests: number };
  const perICMap = new Map<string, ICAgg>();
  for (const o of inScope) {
    const d = new Date(o.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const approved = o.status === "approved" ? Number(o.approvedHours ?? o.requestedHours ?? 0) : 0;
    const pending = o.status === "pending" ? Number(o.requestedHours ?? 0) : 0;
    if (approved > 0) trendMap.set(key, (trendMap.get(key) || 0) + approved);

    const e: ICAgg = perICMap.get(o.userId) ?? { approved: 0, pending: 0, requests: 0 };
    e.approved += approved;
    e.pending += pending;
    e.requests += 1;
    perICMap.set(o.userId, e);
  }

  const perIC: OvertimePerICPoint[] = Array.from(perICMap.entries())
    .map(([uid, e]) => {
      const u = userById.get(uid);
      return {
        userId: uid,
        name: u ? `${u.firstName} ${u.lastName}`.trim() : "Unknown",
        team: teamLabel(u?.team),
        approvedHours: e.approved,
        pendingHours: e.pending,
        requests: e.requests,
      };
    })
    .sort((a, b) => b.approvedHours - a.approvedHours);

  type TeamAgg = { approved: number; pending: number; requests: number };
  const perTeamMap = new Map<string, TeamAgg>();
  for (const r of perIC) {
    const e: TeamAgg = perTeamMap.get(r.team) ?? { approved: 0, pending: 0, requests: 0 };
    e.approved += r.approvedHours;
    e.pending += r.pendingHours;
    e.requests += r.requests;
    perTeamMap.set(r.team, e);
  }
  const perTeam: OvertimeTeamPoint[] = Array.from(perTeamMap.entries())
    .map(([team, e]) => ({ team, approvedHours: e.approved, pendingHours: e.pending, requests: e.requests }))
    .sort((a, b) => b.approvedHours - a.approvedHours);

  const trend: OvertimeTrendPoint[] = monthLabels.map((m) => ({ month: m, approvedHours: trendMap.get(m) || 0 }));

  return { filters: f, months: monthLabels, perIC, perTeam, trend };
}

// ---------------------------------------------------------------------------
// OOO patterns
// ---------------------------------------------------------------------------
export interface OOOPerICPoint {
  userId: string;
  name: string;
  team: string;
  totalDays: number;
  requests: number;
}

export interface OOOTeamPoint {
  team: string;
  totalDays: number;
  contractors: number;
}

export interface OOOTrendPoint {
  month: string;
  totalDays: number;
}

export interface UpcomingOOO {
  id: string;
  userId: string;
  name: string;
  team: string;
  startDate: string;
  endDate: string;
  oooType: string;
  status: string;
}

export interface OOOResult {
  filters: AnalyticsFilters;
  months: string[];
  perIC: OOOPerICPoint[];
  perTeam: OOOTeamPoint[];
  trend: OOOTrendPoint[];
  upcoming: UpcomingOOO[];
}

/**
 * Split an OOO request across each calendar month it touches.
 * Returns a map of "YYYY-MM" -> days (with half_day handling).
 * Multi-month requests are pro-rated by counting actual calendar days in
 * each month; half-day requests scale uniformly.
 */
function daysByMonth(startDate: Date, endDate: Date, oooType: string): Map<string, number> {
  const out = new Map<string, number>();
  const halfDayFactor = oooType === "half_day" ? 0.5 : 1;
  const cursor = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  ));
  const last = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  ));
  while (cursor.getTime() <= last.getTime()) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    out.set(key, (out.get(key) || 0) + halfDayFactor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export async function getOOO(orgId: string, f: AnalyticsFilters): Promise<OOOResult> {
  const [allOOO, users] = await Promise.all([
    storage.getAllOOORequests(orgId),
    storage.getAllUsers(orgId),
  ]);
  const filteredUsers = applyUserFilter(users, f);
  const userById = new Map(filteredUsers.map((u) => [u.id, u]));
  const allowed = new Set(filteredUsers.map((u) => u.id));

  const months = buildMonthKeys(f.startMonth, f.endMonth);
  const monthLabels = months.map((m) => m.label);
  const monthLabelSet = new Set(monthLabels);

  // Include any approved request whose [startDate, endDate] window overlaps
  // the selected range, then allocate days month by month.
  const rangeStart = new Date(Date.UTC(f.startMonth.year, f.startMonth.month - 1, 1));
  const rangeEnd = new Date(Date.UTC(f.endMonth.year, f.endMonth.month, 0, 23, 59, 59));

  const overlapping = allOOO.filter((o) => {
    if (!allowed.has(o.userId)) return false;
    if (o.status !== "approved") return false;
    const start = new Date(o.startDate);
    const end = new Date(o.endDate);
    return end >= rangeStart && start <= rangeEnd;
  });

  const trendMap = new Map<string, number>();
  type ICAgg = { days: number; requests: number };
  const perICMap = new Map<string, ICAgg>();
  for (const o of overlapping) {
    const start = new Date(o.startDate);
    const end = new Date(o.endDate);
    const perMonth = daysByMonth(start, end, o.oooType);

    let daysInRange = 0;
    for (const [key, days] of Array.from(perMonth.entries())) {
      if (!monthLabelSet.has(key)) continue;
      trendMap.set(key, (trendMap.get(key) || 0) + days);
      daysInRange += days;
    }

    if (daysInRange === 0) continue;
    const e: ICAgg = perICMap.get(o.userId) ?? { days: 0, requests: 0 };
    e.days += daysInRange;
    e.requests += 1;
    perICMap.set(o.userId, e);
  }

  const perIC: OOOPerICPoint[] = Array.from(perICMap.entries())
    .map(([uid, e]) => {
      const u = userById.get(uid);
      return {
        userId: uid,
        name: u ? `${u.firstName} ${u.lastName}`.trim() : "Unknown",
        team: teamLabel(u?.team),
        totalDays: Math.round(e.days * 10) / 10,
        requests: e.requests,
      };
    })
    .sort((a, b) => b.totalDays - a.totalDays);

  type TeamAgg = { days: number; users: Set<string> };
  const perTeamMap = new Map<string, TeamAgg>();
  for (const r of perIC) {
    const e: TeamAgg = perTeamMap.get(r.team) ?? { days: 0, users: new Set<string>() };
    e.days += r.totalDays;
    e.users.add(r.userId);
    perTeamMap.set(r.team, e);
  }
  const perTeam: OOOTeamPoint[] = Array.from(perTeamMap.entries())
    .map(([team, e]) => ({
      team,
      totalDays: Math.round(e.days * 10) / 10,
      contractors: e.users.size,
    }))
    .sort((a, b) => b.totalDays - a.totalDays);

  const trend: OOOTrendPoint[] = monthLabels.map((m) => ({
    month: m,
    totalDays: Math.round((trendMap.get(m) || 0) * 10) / 10,
  }));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const upcoming: UpcomingOOO[] = allOOO
    .filter((o) => {
      if (!allowed.has(o.userId)) return false;
      if (o.status !== "approved") return false;
      const start = new Date(o.startDate);
      return start >= today && start <= horizon;
    })
    .map((o) => {
      const u = userById.get(o.userId);
      return {
        id: o.id,
        userId: o.userId,
        name: u ? `${u.firstName} ${u.lastName}`.trim() : "Unknown",
        team: teamLabel(u?.team),
        startDate: String(o.startDate),
        endDate: String(o.endDate),
        oooType: o.oooType,
        status: o.status,
      };
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 50);

  return { filters: f, months: monthLabels, perIC, perTeam, trend, upcoming };
}

// ---------------------------------------------------------------------------
// Approvals SLA
// ---------------------------------------------------------------------------
export type SLAType = "timesheet" | "invoice" | "expense" | "ooo";

export interface SLABucket {
  type: SLAType;
  label: string;
  decided: number;
  pending: number;
  medianHours: number | null;
  p90Hours: number | null;
  avgHours: number | null;
}

export interface SLAResult {
  filters: AnalyticsFilters;
  buckets: SLABucket[];
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(nums: number[], p: number): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function hoursBetween(a: Date | string | null | undefined, b: Date | string | null | undefined): number | null {
  if (!a || !b) return null;
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.max(0, (db.getTime() - da.getTime()) / (1000 * 60 * 60));
}

function buildBucket(type: SLAType, label: string, decidedHours: number[], pending: number): SLABucket {
  return {
    type,
    label,
    decided: decidedHours.length,
    pending,
    medianHours: median(decidedHours),
    p90Hours: percentile(decidedHours, 90),
    avgHours: average(decidedHours),
  };
}

export async function getSLA(orgId: string, f: AnalyticsFilters): Promise<SLAResult> {
  const [timesheets, invoices, expenses, oooReqs, users] = await Promise.all([
    storage.getAllTimesheets(orgId),
    storage.getAllInvoices(orgId),
    storage.getAllExpenses(orgId),
    storage.getAllOOORequests(orgId),
    storage.getAllUsers(orgId),
  ]);
  const filteredUsers = applyUserFilter(users, f);
  const allowed = new Set(filteredUsers.map((u) => u.id));

  const tsHours: number[] = [];
  let tsPending = 0;
  for (const t of timesheets) {
    if (!allowed.has(t.userId)) continue;
    if (t.status === "submitted") {
      tsPending += 1;
      continue;
    }
    if ((t.status === "approved" || t.status === "rejected") && t.reviewedAt) {
      if (!dateInRange(new Date(t.reviewedAt), f)) continue;
      const h = hoursBetween(t.submittedAt, t.reviewedAt);
      if (h !== null) tsHours.push(h);
    }
  }

  const invHours: number[] = [];
  let invPending = 0;
  for (const inv of invoices) {
    if (!allowed.has(inv.userId)) continue;
    if (inv.status === "pending_review" || inv.status === "revision_requested") {
      invPending += 1;
      continue;
    }
    if (inv.reviewedAt) {
      if (!dateInRange(new Date(inv.reviewedAt), f)) continue;
      const h = hoursBetween(inv.uploadedAt, inv.reviewedAt);
      if (h !== null) invHours.push(h);
    }
  }

  const expHours: number[] = [];
  let expPending = 0;
  for (const e of expenses) {
    if (!allowed.has(e.userId)) continue;
    if (e.status === "pending") {
      expPending += 1;
      continue;
    }
    if (e.reviewedAt) {
      if (!dateInRange(new Date(e.reviewedAt), f)) continue;
      const h = hoursBetween(e.createdAt, e.reviewedAt);
      if (h !== null) expHours.push(h);
    }
  }

  const oooHours: number[] = [];
  let oooPending = 0;
  for (const o of oooReqs) {
    if (!allowed.has(o.userId)) continue;
    if (o.status === "pending") {
      oooPending += 1;
      continue;
    }
    if (o.reviewedAt) {
      if (!dateInRange(new Date(o.reviewedAt), f)) continue;
      const h = hoursBetween(o.createdAt, o.reviewedAt);
      if (h !== null) oooHours.push(h);
    }
  }

  const buckets: SLABucket[] = [
    buildBucket("timesheet", "Timesheets", tsHours, tsPending),
    buildBucket("invoice", "Invoices", invHours, invPending),
    buildBucket("expense", "Expenses", expHours, expPending),
    buildBucket("ooo", "Time off", oooHours, oooPending),
  ];

  return { filters: f, buckets };
}

// ---------------------------------------------------------------------------
// Headcount & contracts
// ---------------------------------------------------------------------------
export interface HeadcountTeam {
  team: string;
  count: number;
}

export interface HeadcountStatus {
  status: string;
  count: number;
}

export interface HeadcountRenewal {
  contractId: string;
  userId: string;
  name: string;
  title: string;
  endDate: string;
  daysToEnd: number;
}

export interface HeadcountExpired {
  contractId: string;
  userId: string;
  name: string;
  title: string;
  endDate: string;
}

export interface HeadcountChurn {
  userId: string;
  name: string;
  team: string;
  status: string;
}

export interface HeadcountResult {
  filters: AnalyticsFilters;
  activeContractors: number;
  totalContractors: number;
  byTeam: HeadcountTeam[];
  byStatus: HeadcountStatus[];
  upcomingRenewals: HeadcountRenewal[];
  expiredInRange: HeadcountExpired[];
  churnUsers: HeadcountChurn[];
}

export async function getHeadcount(orgId: string, f: AnalyticsFilters): Promise<HeadcountResult> {
  const [users, contracts] = await Promise.all([
    storage.getAllUsers(orgId),
    storage.getAllContracts(orgId),
  ]);
  const filteredUsers = applyUserFilter(users, f);
  const ics = filteredUsers.filter((u) => u.role === "ic");

  const active = ics.filter((u) => u.isActive && (u.contractorStatus ?? "engaged") === "engaged");

  const byTeamMap = new Map<string, number>();
  for (const u of active) {
    const t = teamLabel(u.team);
    byTeamMap.set(t, (byTeamMap.get(t) || 0) + 1);
  }

  const byStatusMap = new Map<string, number>();
  for (const u of ics) {
    const s = u.isActive ? (u.contractorStatus ?? "engaged") : "inactive";
    byStatusMap.set(s, (byStatusMap.get(s) || 0) + 1);
  }

  const userById = new Map(users.map((u) => [u.id, u]));
  const allowedUserIds = new Set(filteredUsers.map((u) => u.id));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  const upcomingRenewals: HeadcountRenewal[] = contracts
    .filter((c) => {
      if (!allowedUserIds.has(c.userId)) return false;
      const end = new Date(c.endDate);
      return end >= today && end <= horizon;
    })
    .map((c) => {
      const u = userById.get(c.userId);
      const end = new Date(c.endDate);
      return {
        contractId: c.id,
        userId: c.userId,
        name: u ? `${u.firstName} ${u.lastName}`.trim() : "Unknown",
        title: c.title,
        endDate: String(c.endDate),
        daysToEnd: Math.max(0, Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))),
      };
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  const rangeStart = new Date(Date.UTC(f.startMonth.year, f.startMonth.month - 1, 1));
  const rangeEnd = new Date(Date.UTC(f.endMonth.year, f.endMonth.month, 0, 23, 59, 59));
  const expiredInRange: HeadcountExpired[] = contracts
    .filter((c) => {
      if (!allowedUserIds.has(c.userId)) return false;
      const end = new Date(c.endDate);
      return end >= rangeStart && end <= rangeEnd && end < today;
    })
    .map((c) => {
      const u = userById.get(c.userId);
      return {
        contractId: c.id,
        userId: c.userId,
        name: u ? `${u.firstName} ${u.lastName}`.trim() : "Unknown",
        title: c.title,
        endDate: String(c.endDate),
      };
    })
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

  const churnUsers: HeadcountChurn[] = ics
    .filter((u) => u.contractorStatus === "terminated" || !u.isActive)
    .map((u) => ({
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      team: teamLabel(u.team),
      status: u.isActive ? (u.contractorStatus ?? "engaged") : "inactive",
    }));

  return {
    filters: f,
    activeContractors: active.length,
    totalContractors: ics.length,
    byTeam: Array.from(byTeamMap.entries())
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count),
    byStatus: Array.from(byStatusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    upcomingRenewals,
    expiredInRange,
    churnUsers,
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
export type CSVValue = string | number | boolean | null | undefined;

function csvEscape(v: CSVValue): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface CSVTable<T = unknown> {
  columns: string[];
  rows: readonly T[];
  /** Optional title rendered above the table when multiple sections share a CSV. */
  title?: string;
}

function readCell(row: unknown, column: string): CSVValue {
  if (row === null || row === undefined) return "";
  const v = (row as Record<string, unknown>)[column];
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}

export function tableToCSV<T>(table: CSVTable<T>): string {
  const header = table.columns.map(csvEscape).join(",");
  const body = table.rows
    .map((r) => table.columns.map((c) => csvEscape(readCell(r, c))).join(","))
    .join("\n");
  const prefix = table.title ? `${csvEscape(table.title)}\n` : "";
  return body.length > 0 ? `${prefix}${header}\n${body}\n` : `${prefix}${header}\n`;
}

export function joinCSVTables(tables: CSVTable<unknown>[]): string {
  return tables.map((t) => tableToCSV(t)).join("\n");
}
