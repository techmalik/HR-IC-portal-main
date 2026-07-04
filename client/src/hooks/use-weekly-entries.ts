import { useMemo, useState } from "react";
import { startOfWeek, getWeek } from "date-fns";
import type { DailyEntry } from "@shared/schema";

export interface WeeklyGroup {
  weekNum: number;
  weekStart: Date;
  entries: DailyEntry[];
  totalHours: number;
}

export interface WeeklySummaryStats {
  daysWorked: number;
  totalHours: number;
  avgHoursPerDay: string;
  maxHoursEntry: DailyEntry | undefined;
}

export function useWeeklyEntries(entries: DailyEntry[] | undefined) {
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());

  const weeklyGroups = useMemo<WeeklyGroup[]>(() => {
    if (!entries || entries.length === 0) return [];

    const groups: Map<number, WeeklyGroup> = new Map();

    entries.forEach((entry) => {
      const date = new Date(entry.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekNum = getWeek(date, { weekStartsOn: 1 });

      if (!groups.has(weekNum)) {
        groups.set(weekNum, { weekNum, weekStart, entries: [], totalHours: 0 });
      }

      const group = groups.get(weekNum)!;
      group.entries.push(entry);
      group.totalHours += entry.hours || 0;
    });

    return Array.from(groups.values())
      .sort((a, b) => a.weekNum - b.weekNum)
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      }));
  }, [entries]);

  const summaryStats = useMemo<WeeklySummaryStats | null>(() => {
    if (!entries || entries.length === 0) return null;
    const daysWorked = entries.length;
    const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const avgHoursPerDay = daysWorked > 0 ? (totalHours / daysWorked).toFixed(1) : "0";
    const maxHoursEntry = entries.reduce((max, e) => ((e.hours || 0) > (max?.hours || 0) ? e : max), entries[0]);
    return { daysWorked, totalHours, avgHoursPerDay, maxHoursEntry };
  }, [entries]);

  const toggleWeekCollapse = (weekNum: number) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) {
        next.delete(weekNum);
      } else {
        next.add(weekNum);
      }
      return next;
    });
  };

  const collapseAllWeeks = () => setCollapsedWeeks(new Set(weeklyGroups.map((g) => g.weekNum)));
  const expandAllWeeks = () => setCollapsedWeeks(new Set());

  return {
    weeklyGroups,
    summaryStats,
    collapsedWeeks,
    setCollapsedWeeks,
    toggleWeekCollapse,
    collapseAllWeeks,
    expandAllWeeks,
  };
}
