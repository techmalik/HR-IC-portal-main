import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { FileText, Download, Clock } from "lucide-react";
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Approved Timesheets Report</h1>
          <p className="text-muted-foreground mt-1">
            View approved timesheets with detailed daily hours
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Timesheets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
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
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approved Timesheets</CardTitle>
              <CardDescription>
                {filteredTimesheets.length} approved timesheet(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTimesheets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No approved timesheets found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTimesheets.map(timesheet => {
                    const user = getUser(timesheet.userId);
                    const isSelected = selectedTimesheet === timesheet.id;

                    return (
                      <div
                        key={timesheet.id}
                        onClick={() => setSelectedTimesheet(timesheet.id)}
                        className={`p-4 rounded-md cursor-pointer border transition-all ${
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover-elevate"
                        }`}
                        data-testid={`timesheet-${timesheet.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(timesheet.year, timesheet.month - 1), "MMMM yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{timesheet.totalHours}h</p>
                            <Badge variant="outline" className="text-emerald-600">
                              Approved
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedUser ? (
                  <span>{selectedUser.firstName} {selectedUser.lastName} - Daily Hours</span>
                ) : (
                  <span>Daily Hours Breakdown</span>
                )}
              </CardTitle>
              <CardDescription>
                {selectedTimesheetData ? (
                  <span>
                    {format(new Date(selectedTimesheetData.year, selectedTimesheetData.month - 1), "MMMM yyyy")} - 
                    Total: {selectedTimesheetData.totalHours} hours
                  </span>
                ) : (
                  <span>Select a timesheet to view daily breakdown</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedTimesheet ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a timesheet to view details</p>
                </div>
              ) : !dailyEntries || dailyEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No daily entries found</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead>Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyEntries
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map(entry => (
                          <TableRow key={entry.id} data-testid={`entry-${entry.id}`}>
                            <TableCell className="font-medium">
                              {format(new Date(entry.date), "EEE, MMM d")}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {entry.hours}h
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-muted-foreground">
                              {entry.activityLog || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
