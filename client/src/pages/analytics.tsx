import { useMemo, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Users,
  Clock,
  AlertTriangle,
  CalendarOff,
  Activity,
  Briefcase,
  DollarSign,
  type LucideProps,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatMoney, SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { User } from "@shared/schema";

// ---------------------------------------------------------------------------
// Types matching server payloads
// ---------------------------------------------------------------------------
interface SpendSeriesPoint { month: string; currency: string; amount: number }
interface SpendConvertedPoint { month: string; amount: number }
interface SpendCurrencyTotal { currency: string; amount: number; amountInDisplay: number }
interface SpendResult {
  displayCurrency: string;
  months: string[];
  currencies: string[];
  series: SpendSeriesPoint[];
  convertedSeries: SpendConvertedPoint[];
  totalsByCurrency: SpendCurrencyTotal[];
  totalInDisplay: number;
}
interface HoursPerICPoint {
  userId: string;
  name: string;
  team: string;
  monthlyCap: number | null;
  totalHours: number;
  monthsCounted: number;
  utilizationPct: number | null;
}
interface HoursTeamPoint { team: string; totalHours: number; contractors: number }
interface HoursTrendPoint { month: string; totalHours: number }
interface HoursResult {
  months: string[];
  perIC: HoursPerICPoint[];
  perTeam: HoursTeamPoint[];
  trend: HoursTrendPoint[];
}
interface OvertimePerICPoint {
  userId: string;
  name: string;
  team: string;
  approvedHours: number;
  pendingHours: number;
  requests: number;
}
interface OvertimeTeamPoint { team: string; approvedHours: number; pendingHours: number; requests: number }
interface OvertimeTrendPoint { month: string; approvedHours: number }
interface OvertimeResult {
  months: string[];
  perIC: OvertimePerICPoint[];
  perTeam: OvertimeTeamPoint[];
  trend: OvertimeTrendPoint[];
}
interface OOOPerICPoint { userId: string; name: string; team: string; totalDays: number; requests: number }
interface OOOTeamPoint { team: string; totalDays: number; contractors: number }
interface OOOTrendPoint { month: string; totalDays: number }
interface UpcomingOOO {
  id: string;
  userId: string;
  name: string;
  team: string;
  startDate: string;
  endDate: string;
  oooType: string;
  status: string;
}
interface OOOResult {
  months: string[];
  perIC: OOOPerICPoint[];
  perTeam: OOOTeamPoint[];
  trend: OOOTrendPoint[];
  upcoming: UpcomingOOO[];
}
interface SLABucket {
  type: "timesheet" | "invoice" | "expense" | "ooo";
  label: string;
  decided: number;
  pending: number;
  medianHours: number | null;
  p90Hours: number | null;
  avgHours: number | null;
}
interface SLAResult { buckets: SLABucket[] }
interface HeadcountTeam { team: string; count: number }
interface HeadcountStatus { status: string; count: number }
interface HeadcountRenewal { contractId: string; userId: string; name: string; title: string; endDate: string; daysToEnd: number }
interface HeadcountExpired { contractId: string; userId: string; name: string; title: string; endDate: string }
interface HeadcountChurn { userId: string; name: string; team: string; status: string }
interface HeadcountResult {
  activeContractors: number;
  totalContractors: number;
  byTeam: HeadcountTeam[];
  byStatus: HeadcountStatus[];
  upcomingRenewals: HeadcountRenewal[];
  expiredInRange: HeadcountExpired[];
  churnUsers: HeadcountChurn[];
}

type IconComponent = ComponentType<LucideProps>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function previousYearMonth(year: number, month: number, monthsBack: number) {
  let y = year;
  let m = month - monthsBack;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}

function ymLabel(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const CHART_COLORS = [
  "#2a78d6",
  "#059669",
  "#e34948",
  "#eda100",
  "#0891b2",
  "#eb6834",
  "#e87ba4",
];

function downloadFromUrl(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function formatMonthLabel(ym: unknown): string {
  const s = String(ym);
  const [y, m] = s.split("-").map(Number);
  if (!y || !m) return s;
  return format(new Date(y, m - 1, 1), "MMM yy");
}

function formatHoursReadable(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [rangeMonths, setRangeMonths] = useState<number>(12);
  const [userId, setUserId] = useState<string>("all");
  const [team, setTeam] = useState<string>("all");
  const [currency, setCurrency] = useState<string>("all");
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");

  const start = previousYearMonth(currentYear, currentMonth, rangeMonths - 1);
  const end = { year: currentYear, month: currentMonth };

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("startMonth", ymLabel(start.year, start.month));
    params.set("endMonth", ymLabel(end.year, end.month));
    params.set("displayCurrency", displayCurrency);
    if (userId !== "all") params.set("userId", userId);
    if (team !== "all") params.set("team", team);
    if (currency !== "all") params.set("currency", currency);
    return params.toString();
  }, [rangeMonths, userId, team, currency, displayCurrency]);

  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const teams = useMemo(() => {
    const set = new Set<string>();
    (users ?? []).forEach((u) => {
      if (u.team) set.add(u.team);
    });
    return Array.from(set).sort();
  }, [users]);

  const fetcher = async <T,>(section: string): Promise<T> => {
    const res = await fetch(`/api/analytics/${section}?${filterParams}`, { credentials: "include" });
    if (!res.ok) throw new Error(`Failed to load ${section}`);
    return res.json() as Promise<T>;
  };

  const spend = useQuery<SpendResult>({ queryKey: ["/api/analytics/spend", filterParams], queryFn: () => fetcher<SpendResult>("spend") });
  const hours = useQuery<HoursResult>({ queryKey: ["/api/analytics/hours", filterParams], queryFn: () => fetcher<HoursResult>("hours") });
  const overtime = useQuery<OvertimeResult>({ queryKey: ["/api/analytics/overtime", filterParams], queryFn: () => fetcher<OvertimeResult>("overtime") });
  const ooo = useQuery<OOOResult>({ queryKey: ["/api/analytics/ooo", filterParams], queryFn: () => fetcher<OOOResult>("ooo") });
  const sla = useQuery<SLAResult>({ queryKey: ["/api/analytics/sla", filterParams], queryFn: () => fetcher<SLAResult>("sla") });
  const headcount = useQuery<HeadcountResult>({ queryKey: ["/api/analytics/headcount", filterParams], queryFn: () => fetcher<HeadcountResult>("headcount") });

  const exportCSV = (section: string) => {
    const params = new URLSearchParams(filterParams);
    params.set("format", "csv");
    downloadFromUrl(`/api/analytics/${section}?${params.toString()}`);
  };

  // Spend chart pivot: row per month, column per currency (native amounts)
  const spendChartData = useMemo(() => {
    if (!spend.data) return [] as Array<Record<string, string | number>>;
    const out = new Map<string, Record<string, string | number>>();
    for (const m of spend.data.months) out.set(m, { month: m });
    for (const p of spend.data.series) {
      const row = out.get(p.month) ?? { month: p.month };
      const existing = typeof row[p.currency] === "number" ? (row[p.currency] as number) : 0;
      row[p.currency] = existing + p.amount;
      out.set(p.month, row);
    }
    return spend.data.months.map((m) => out.get(m) ?? { month: m });
  }, [spend.data]);

  const topHours = useMemo(() => (hours.data?.perIC ?? []).slice(0, 5), [hours.data]);
  const bottomHours = useMemo(() => {
    const list = hours.data?.perIC ?? [];
    return [...list].sort((a, b) => a.totalHours - b.totalHours).slice(0, 5);
  }, [hours.data]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-serif text-[28px] font-normal text-neutral-900">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Operating metrics across spend, hours, overtime, OOO, approvals, and headcount.
        </p>
      </div>

      {/* Global filters */}
      <Card className="border-[1.5px] border-neutral-200 rounded-xl">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Time range</label>
              <Select value={String(rangeMonths)} onValueChange={(v) => setRangeMonths(Number(v))}>
                <SelectTrigger data-testid="select-analytics-range"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Last 3 months</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                  <SelectItem value="24">Last 24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Contractor</label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger data-testid="select-analytics-user"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All contractors</SelectItem>
                  {(users ?? [])
                    .filter((u) => u.role === "ic")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Team</label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger data-testid="select-analytics-team"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Spend filter currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="select-analytics-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Display currency</label>
              <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
                <SelectTrigger data-testid="select-analytics-display-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          icon={Users}
          label="Active contractors"
          value={headcount.isLoading ? "…" : `${headcount.data?.activeContractors ?? 0}`}
          sub={headcount.data ? `${headcount.data.totalContractors} total` : undefined}
          testId="kpi-active-contractors"
        />
        <KPI
          icon={Clock}
          label="Hours logged"
          value={hours.isLoading ? "…" : `${(hours.data?.trend ?? []).reduce((s, p) => s + p.totalHours, 0).toLocaleString()}h`}
          sub="across selected range"
          testId="kpi-total-hours"
        />
        <KPI
          icon={AlertTriangle}
          label="Overtime hours"
          value={overtime.isLoading ? "…" : `${(overtime.data?.trend ?? []).reduce((s, p) => s + p.approvedHours, 0).toLocaleString()}h`}
          sub="approved overtime"
          testId="kpi-overtime"
        />
        <KPI
          icon={CalendarOff}
          label="OOO days"
          value={ooo.isLoading ? "…" : `${(ooo.data?.trend ?? []).reduce((s, p) => s + p.totalDays, 0).toLocaleString()}`}
          sub="approved time off"
          testId="kpi-ooo"
        />
      </div>

      {/* Spend */}
      <SectionCard
        icon={DollarSign}
        title="Spend"
        description={`Approved + paid invoices, native + converted to ${displayCurrency}.`}
        onExport={() => exportCSV("spend")}
        loading={spend.isLoading}
        empty={!spend.isLoading && (spend.data?.series.length ?? 0) === 0}
      >
        {spend.data && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="px-3 py-2 rounded-md bg-primary/10 border border-primary/20" data-testid="spend-total-display">
                <div className="text-xs text-muted-foreground">Total ({spend.data.displayCurrency})</div>
                <div className="text-base font-semibold">
                  {formatMoney(spend.data.totalInDisplay, spend.data.displayCurrency)}
                </div>
              </div>
              {spend.data.totalsByCurrency.map((t) => (
                <div
                  key={t.currency}
                  className="px-3 py-2 rounded-md bg-muted/50"
                  data-testid={`spend-total-${t.currency}`}
                >
                  <div className="text-xs text-muted-foreground">{t.currency}</div>
                  <div className="text-base font-semibold">{formatMoney(t.amount, t.currency)}</div>
                  {t.currency !== spend.data.displayCurrency && (
                    <div className="text-xs text-muted-foreground">
                      ≈ {formatMoney(t.amountInDisplay, spend.data.displayCurrency)}
                    </div>
                  )}
                </div>
              ))}
              {spend.data.totalsByCurrency.length === 0 && (
                <span className="text-sm text-muted-foreground">No invoices in range.</span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-[280px] -mx-2">
                <div className="text-xs font-medium ml-2 mb-1">By month, native currency (stacked)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatMoney(Number(value), name), name]}
                      labelFormatter={formatMonthLabel}
                    />
                    <Legend />
                    {spend.data.currencies.map((cur, idx) => (
                      <Bar
                        key={cur}
                        dataKey={cur}
                        stackId="spend"
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[280px] -mx-2">
                <div className="text-xs font-medium ml-2 mb-1">By month, converted to {spend.data.displayCurrency}</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spend.data.convertedSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value: number) => formatMoney(Number(value), spend.data!.displayCurrency)}
                      labelFormatter={formatMonthLabel}
                    />
                    <Line type="monotone" dataKey="amount" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Hours & utilization */}
      <SectionCard
        icon={Clock}
        title="Hours & utilization"
        description="Hours logged per contractor, by team, and over time."
        onExport={() => exportCSV("hours")}
        loading={hours.isLoading}
        empty={!hours.isLoading && (hours.data?.perIC.length ?? 0) === 0}
      >
        {hours.data && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="h-[240px] -mx-2">
                <div className="text-xs font-medium ml-2 mb-1">Hours by month</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hours.data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip labelFormatter={formatMonthLabel} />
                    <Line type="monotone" dataKey="totalHours" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[240px] -mx-2">
                <div className="text-xs font-medium ml-2 mb-1">Hours by team</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hours.data.perTeam}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="team" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="totalHours" fill={CHART_COLORS[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RankedList
                title="Top 5 hours"
                rows={topHours}
                testId="hours-top"
                renderRight={(r) => `${r.totalHours}h${r.utilizationPct !== null ? ` · ${r.utilizationPct}%` : ""}`}
              />
              <RankedList
                title="Bottom 5 hours"
                rows={bottomHours}
                testId="hours-bottom"
                renderRight={(r) => `${r.totalHours}h${r.utilizationPct !== null ? ` · ${r.utilizationPct}%` : ""}`}
              />
            </div>
          </>
        )}
      </SectionCard>

      {/* Overtime */}
      <SectionCard
        icon={AlertTriangle}
        title="Overtime"
        description="Approved overtime by IC, by team, and over time."
        onExport={() => exportCSV("overtime")}
        loading={overtime.isLoading}
        empty={!overtime.isLoading && (overtime.data?.perIC.length ?? 0) === 0}
      >
        {overtime.data && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="h-[220px] -mx-2">
                <div className="text-xs font-medium ml-2 mb-1">Overtime by month</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overtime.data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip labelFormatter={formatMonthLabel} />
                    <Bar dataKey="approvedHours" fill={CHART_COLORS[3]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[220px] -mx-2">
                <div className="text-xs font-medium ml-2 mb-1">Overtime by team</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overtime.data.perTeam}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="team" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approvedHours" stackId="ot" fill={CHART_COLORS[3]} />
                    <Bar dataKey="pendingHours" stackId="ot" fill={CHART_COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-2">
              {overtime.data.perIC.slice(0, 8).map((r) => (
                <div
                  key={r.userId}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/40"
                  data-testid={`overtime-row-${r.userId}`}
                >
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.team}</div>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">{r.approvedHours}h</span>
                    <span className="text-muted-foreground"> approved</span>
                    {r.pendingHours > 0 && (
                      <Badge variant="outline" className="ml-2">{r.pendingHours}h pending</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* OOO */}
      <SectionCard
        icon={CalendarOff}
        title="Out of office"
        description="Approved time off by month, team distribution, and upcoming calendar."
        onExport={() => exportCSV("ooo")}
        loading={ooo.isLoading}
        empty={!ooo.isLoading && (ooo.data?.perIC.length ?? 0) === 0 && (ooo.data?.upcoming.length ?? 0) === 0}
      >
        {ooo.data && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="h-[220px] -mx-2">
                <div className="text-xs font-medium ml-2 mb-1">OOO days by month</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ooo.data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip labelFormatter={formatMonthLabel} />
                    <Bar dataKey="totalDays" fill={CHART_COLORS[4]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[220px] -mx-2">
                <div className="text-xs font-medium ml-2 mb-1">OOO days by team</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ooo.data.perTeam}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="team" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="totalDays" fill={CHART_COLORS[4]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RankedList
                title="Most days off"
                rows={ooo.data.perIC.slice(0, 8)}
                testId="ooo-perIC"
                renderRight={(r) => `${r.totalDays} days · ${r.requests} req`}
              />
              <div>
                <div className="text-sm font-medium mb-2">Upcoming OOO (next 90 days)</div>
                <div className="space-y-2 max-h-[260px] overflow-auto">
                  {ooo.data.upcoming.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No upcoming time off.</div>
                  ) : (
                    ooo.data.upcoming.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm"
                        data-testid={`ooo-upcoming-${u.id}`}
                      >
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.team} · {format(new Date(u.startDate), "MMM d")} – {format(new Date(u.endDate), "MMM d, yyyy")}
                          </div>
                        </div>
                        {u.oooType === "half_day" && <Badge variant="outline">½ day</Badge>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* SLA */}
      <SectionCard
        icon={Activity}
        title="Approvals SLA"
        description="Median and p90 hours from submission to decision."
        onExport={() => exportCSV("sla")}
        loading={sla.isLoading}
        empty={false}
      >
        {sla.data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sla.data.buckets.map((b) => (
              <div
                key={b.type}
                className="p-3 rounded-md border"
                data-testid={`sla-${b.type}`}
              >
                <div className="text-sm font-medium">{b.label}</div>
                <div className="mt-1 text-2xl font-semibold">
                  {b.medianHours === null ? "-" : formatHoursReadable(b.medianHours)}
                </div>
                <div className="text-xs text-muted-foreground">median time to decision</div>
                <div className="text-xs mt-2 text-muted-foreground">
                  p90: {b.p90Hours === null ? "-" : formatHoursReadable(b.p90Hours)} ·{" "}
                  {b.decided} decided · {b.pending} pending
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Headcount */}
      <SectionCard
        icon={Briefcase}
        title="Headcount & contracts"
        description="Active contractors, breakdown, renewals, and churn."
        onExport={() => exportCSV("headcount")}
        loading={headcount.isLoading}
        empty={false}
      >
        {headcount.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-2">By team</div>
              <div className="space-y-1">
                {headcount.data.byTeam.length === 0 && (
                  <div className="text-sm text-muted-foreground">No team data.</div>
                )}
                {headcount.data.byTeam.map((t) => (
                  <div
                    key={t.team}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm"
                    data-testid={`headcount-team-${t.team}`}
                  >
                    <span>{t.team}</span>
                    <span className="font-semibold">{t.count}</span>
                  </div>
                ))}
              </div>

              <div className="text-sm font-medium mt-4 mb-2">By status</div>
              <div className="flex flex-wrap gap-2">
                {headcount.data.byStatus.map((s) => (
                  <Badge key={s.status} variant="secondary" data-testid={`headcount-status-${s.status}`}>
                    {s.status}: {s.count}
                  </Badge>
                ))}
              </div>

              {headcount.data.churnUsers.length > 0 && (
                <>
                  <div className="text-sm font-medium mt-4 mb-2">Churn</div>
                  <div className="space-y-1">
                    {headcount.data.churnUsers.slice(0, 8).map((c) => (
                      <div
                        key={c.userId}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm"
                        data-testid={`headcount-churn-${c.userId}`}
                      >
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.team}</div>
                        </div>
                        <Badge variant="outline">{c.status}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Upcoming renewals (90 days)</div>
              <div className="space-y-2 max-h-[260px] overflow-auto">
                {headcount.data.upcomingRenewals.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No renewals in the next 90 days.</div>
                ) : (
                  headcount.data.upcomingRenewals.map((r) => (
                    <div
                      key={r.contractId}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm"
                      data-testid={`headcount-renewal-${r.contractId}`}
                    >
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.title}</div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{format(new Date(r.endDate), "MMM d, yyyy")}</div>
                        <div>{r.daysToEnd}d</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {headcount.data.expiredInRange.length > 0 && (
                <>
                  <div className="text-sm font-medium mt-4 mb-2">Expired in range</div>
                  <div className="space-y-1">
                    {headcount.data.expiredInRange.slice(0, 8).map((r) => (
                      <div key={r.contractId} className="flex justify-between text-sm">
                        <span>{r.name}</span>
                        <span className="text-muted-foreground">{format(new Date(r.endDate), "MMM d, yyyy")}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------
function KPI({
  icon: Icon,
  label,
  value,
  sub,
  testId,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  sub?: string;
  testId?: string;
}) {
  return (
    <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase">{label}</div>
        <Icon className="w-3.5 h-3.5 text-neutral-300" />
      </div>
      <div className="text-[26px] font-bold text-neutral-900 mb-0.5" data-testid={testId}>{value}</div>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  onExport,
  loading,
  empty,
  children,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  onExport: () => void;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-[1.5px] border-neutral-200 rounded-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-[13.5px] font-semibold text-neutral-900 flex items-center gap-2">
            <Icon className="w-4 h-4 text-neutral-400" /> {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          data-testid={`export-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : empty ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No data for the selected filters.
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

interface RankedRow {
  userId: string;
  name: string;
  team: string;
}

function RankedList<T extends RankedRow>({
  title,
  rows,
  renderRight,
  testId,
}: {
  title: string;
  rows: T[];
  renderRight: (r: T) => string;
  testId?: string;
}) {
  return (
    <div data-testid={testId}>
      <div className="text-sm font-medium mb-2">{title}</div>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No data.</div>
      ) : (
        <div className="space-y-1">
          {rows.map((r) => (
            <div
              key={r.userId}
              className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm"
            >
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.team}</div>
              </div>
              <div className="text-sm font-medium">{renderRight(r)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
