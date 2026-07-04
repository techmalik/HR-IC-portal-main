import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { FileText, Clock } from "lucide-react";
import type { Timesheet, DailyEntry, User } from "@shared/schema";

interface TimesheetWithUser extends Timesheet {
  user?: User;
}

export default function ApprovedTimesheetsPage() {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedTimesheet, setSelectedTimesheet] = useState<string | null>(null);

  const { data: timesheets, isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/team/timesheets", "approved"],
    queryFn: async () => {
      const res = await fetch("/api/team/timesheets?status=approved", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch approved timesheets");
      return res.json();
    },
  });

  const { data: users } = useQuery<{ id: string; firstName: string; lastName: string; jobTitle: string | null; role: string }[]>({
    queryKey: ["/api/users/basic"],
  });

  const { data: dailyEntries } = useQuery<DailyEntry[]>({
    queryKey: ["/api/timesheets", selectedTimesheet, "entries"],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets/${selectedTimesheet}/entries`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch entries");
      return res.json();
    },
    enabled: !!selectedTimesheet,
  });

  const approvedTimesheets = timesheets || [];

  const filteredTimesheets = approvedTimesheets.filter(t => {
    if (selectedMonth !== "all" && t.month !== parseInt(selectedMonth)) return false;
    if (selectedYear && t.year !== parseInt(selectedYear)) return false;
    return true;
  });

  type BasicUser = { id: string; firstName: string; lastName: string; jobTitle: string | null; role: string };
  const getUser = (userId: string): BasicUser | undefined => {
    return users?.find(u => u.id === userId);
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  const selectedTimesheetData = filteredTimesheets.find(t => t.id === selectedTimesheet);
  const selectedUser = selectedTimesheetData ? getUser(selectedTimesheetData.userId) : null;

  return (
    <div className="p-6 flex flex-col gap-[18px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-normal text-neutral-900 dark:text-neutral-50 font-serif mb-0.5">Approved timesheets report</h1>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            View approved timesheets with detailed daily hours
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl px-[18px] py-3.5">
        <div className="text-[11px] font-bold text-neutral-400 tracking-[0.08em] uppercase mb-2.5">Filter</div>
        <div className="flex gap-3 flex-wrap">
          <div className="w-48">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger data-testid="select-filter-month">
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger data-testid="select-filter-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
              <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">Approved timesheets</div>
              <div className="text-[11.5px] text-neutral-400">{filteredTimesheets.length} approved timesheet(s)</div>
            </div>
            {filteredTimesheets.length === 0 ? (
              <div className="px-[18px] py-14 text-center">
                <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No approved timesheets found</p>
              </div>
            ) : (
              <div>
                {filteredTimesheets.map((timesheet, i) => {
                  const user = getUser(timesheet.userId);
                  const isSelected = selectedTimesheet === timesheet.id;

                  return (
                    <div
                      key={timesheet.id}
                      onClick={() => setSelectedTimesheet(timesheet.id)}
                      className={`px-[18px] py-3 flex items-center justify-between gap-3 cursor-pointer border-b border-neutral-50 dark:border-white/5 last:border-b-0 ${
                        isSelected
                          ? "bg-[#ECFDF5] dark:bg-[#059669]/10"
                          : i % 2
                          ? "bg-neutral-50/50 dark:bg-white/[0.02] hover-elevate"
                          : "hover-elevate"
                      }`}
                      data-testid={`timesheet-${timesheet.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50 truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-[11.5px] text-neutral-400">
                          {format(new Date(timesheet.year, timesheet.month - 1), "MMMM yyyy")}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50 tabular-nums">{timesheet.totalHours}h</p>
                        <StatusBadge status="approved" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="px-[18px] py-3.5 border-b border-neutral-100 dark:border-white/10">
              <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}, daily hours` : "Daily hours breakdown"}
              </div>
              <div className="text-[11.5px] text-neutral-400">
                {selectedTimesheetData
                  ? `${format(new Date(selectedTimesheetData.year, selectedTimesheetData.month - 1), "MMMM yyyy")}. Total: ${selectedTimesheetData.totalHours} hours`
                  : "Select a timesheet to view daily breakdown"}
              </div>
            </div>
            {!selectedTimesheet ? (
              <div className="px-[18px] py-14 text-center">
                <Clock className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Select a timesheet to view details</p>
              </div>
            ) : !dailyEntries || dailyEntries.length === 0 ? (
              <div className="px-[18px] py-14 text-center">
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No daily entries found</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-[1fr_70px_1.5fr] px-[18px] py-2.5 bg-[#F9FAFB] dark:bg-white/5 border-b border-neutral-200 dark:border-white/10 text-[10px] font-bold text-neutral-400 tracking-[0.08em] uppercase sticky top-0">
                  <span>Date</span>
                  <span className="text-right">Hours</span>
                  <span>Activity</span>
                </div>
                {dailyEntries
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((entry, i) => (
                    <div
                      key={entry.id}
                      className={`grid grid-cols-[1fr_70px_1.5fr] px-[18px] py-2.5 items-center border-b border-neutral-50 dark:border-white/5 last:border-b-0 ${i % 2 ? "bg-neutral-50/50 dark:bg-white/[0.02]" : ""}`}
                      data-testid={`entry-${entry.id}`}
                    >
                      <span className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50">
                        {format(new Date(entry.date), "EEE, MMM d")}
                      </span>
                      <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50 text-right tabular-nums">
                        {entry.hours}h
                      </span>
                      <span className="text-[12px] text-neutral-500 dark:text-neutral-400 truncate">
                        {entry.activityLog || "No activity recorded"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
