import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Clock,
  ChevronRight,
  Search,
  FileText,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { User, Timesheet } from "@shared/schema";

interface TimesheetWithUser extends Timesheet {
  userName: string;
  userEmail: string;
}

interface UserWithTimesheetSummary extends User {
  latestTimesheet: Timesheet | null;
  currentMonthHours: number;
  pendingTimesheets: number;
  totalTimesheets: number;
}

export default function AllTimesheetsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  // Fetch all ICs (team members)
  const { data: teamMembers, isLoading: membersLoading } = useQuery<User[]>({
    queryKey: ["/api/team/members"],
  });

  // Fetch all timesheets
  const { data: allTimesheets, isLoading: timesheetsLoading } = useQuery<TimesheetWithUser[]>({
    queryKey: ["/api/timesheets"],
  });

  // Calculate current month for reference
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Combine team members with timesheet summaries
  const usersWithSummary = useMemo(() => {
    if (!teamMembers || !allTimesheets) return [];

    return teamMembers.map((member): UserWithTimesheetSummary => {
      const userTimesheets = allTimesheets.filter(ts => ts.userId === member.id);
      
      // Get current month timesheet
      const currentMonthTimesheet = userTimesheets.find(
        ts => ts.month === currentMonth && ts.year === currentYear
      );
      
      // Get latest timesheet by date
      const latestTimesheet = userTimesheets.sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1);
        const dateB = new Date(b.year, b.month - 1);
        return dateB.getTime() - dateA.getTime();
      })[0] || null;
      
      // Count pending (submitted) timesheets
      const pendingTimesheets = userTimesheets.filter(ts => ts.status === "submitted").length;
      
      return {
        ...member,
        latestTimesheet,
        currentMonthHours: currentMonthTimesheet?.totalHours || 0,
        pendingTimesheets,
        totalTimesheets: userTimesheets.length,
      };
    });
  }, [teamMembers, allTimesheets, currentMonth, currentYear]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = usersWithSummary;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        user =>
          user.firstName.toLowerCase().includes(query) ||
          user.lastName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(user => {
        if (statusFilter === "pending") return user.pendingTimesheets > 0;
        if (statusFilter === "current") return user.currentMonthHours > 0;
        if (statusFilter === "none") return user.totalTimesheets === 0;
        return true;
      });
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      if (sortBy === "name") {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      if (sortBy === "hours") {
        return b.currentMonthHours - a.currentMonthHours;
      }
      if (sortBy === "pending") {
        return b.pendingTimesheets - a.pendingTimesheets;
      }
      return 0;
    });

    return result;
  }, [usersWithSummary, searchQuery, statusFilter, sortBy]);

  // Calculate overall stats
  const stats = useMemo(() => {
    if (!usersWithSummary) return { totalICs: 0, withPending: 0, withCurrentMonth: 0 };
    return {
      totalICs: usersWithSummary.length,
      withPending: usersWithSummary.filter(u => u.pendingTimesheets > 0).length,
      withCurrentMonth: usersWithSummary.filter(u => u.currentMonthHours > 0).length,
    };
  }, [usersWithSummary]);

  const handleUserClick = (userId: string) => {
    setLocation(`/team/${userId}?tab=timesheets`);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  };

  const isLoading = membersLoading || timesheetsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalICs}</div>
            <p className="text-xs text-muted-foreground">
              Independent Contractors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withPending}</div>
            <p className="text-xs text-muted-foreground">
              ICs with submitted timesheets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withCurrentMonth}</div>
            <p className="text-xs text-muted-foreground">
              ICs with hours logged in {format(new Date(), "MMMM")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-members"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="pending">Has Pending</SelectItem>
                  <SelectItem value="current">Active This Month</SelectItem>
                  <SelectItem value="none">No Timesheets</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]" data-testid="select-sort-by">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="hours">Hours (This Month)</SelectItem>
                  <SelectItem value="pending">Pending Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Click on a team member to view their detailed timesheet history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "No team members match your filters"
                : "No team members found"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => handleUserClick(member.id)}
                  data-testid={`card-member-${member.id}`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.jobTitle || member.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Current month hours */}
                    <div className="text-right hidden md:block">
                      <div className="text-sm font-medium">
                        {member.currentMonthHours}h
                      </div>
                      <div className="text-xs text-muted-foreground">
                        This month
                      </div>
                    </div>

                    {/* Latest timesheet status */}
                    <div className="hidden sm:block">
                      {member.latestTimesheet ? (
                        <div className="flex items-center gap-2">
                          <StatusBadge status={member.latestTimesheet.status} />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(member.latestTimesheet.year, member.latestTimesheet.month - 1), "MMM yyyy")}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline">No timesheets</Badge>
                      )}
                    </div>

                    {/* Pending indicator */}
                    {member.pendingTimesheets > 0 && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        {member.pendingTimesheets} pending
                      </Badge>
                    )}

                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
