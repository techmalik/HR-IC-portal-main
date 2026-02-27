import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Activity, User, Calendar, FileText, Clock, Shield } from "lucide-react";
import type { ActivityLog } from "@shared/schema";
import { useState } from "react";

type BasicUser = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  role: string;
};

export default function ActivityLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
  });

  const { data: basicUsers } = useQuery<BasicUser[]>({
    queryKey: ["/api/users/basic"],
  });

  const userMap = new Map<string, BasicUser>();
  basicUsers?.forEach((u) => userMap.set(u.id, u));

  const getUserDisplay = (userId: string) => {
    const u = userMap.get(userId);
    if (u) return { name: `${u.firstName} ${u.lastName}`, initials: `${u.firstName[0]}${u.lastName[0]}` };
    return { name: `User #${userId.slice(-4)}`, initials: "U" };
  };

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.entityType === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const getActionIcon = (entityType: string | null) => {
    switch (entityType) {
      case "user":
        return <User className="w-4 h-4" />;
      case "ooo_request":
        return <Calendar className="w-4 h-4" />;
      case "timesheet":
        return <Clock className="w-4 h-4" />;
      case "invoice":
        return <FileText className="w-4 h-4" />;
      case "evaluation":
        return <Shield className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">
          Complete audit trail of all system activity
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base">System Activity</CardTitle>
              <CardDescription>{logs?.length || 0} logged activities</CardDescription>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-logs"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40" data-testid="select-action-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="ooo_request">OOO Requests</SelectItem>
                  <SelectItem value="timesheet">Timesheets</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="evaluation">Evaluations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const userDisplay = getUserDisplay(log.userId);
                  return (
                    <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                      <TableCell>
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {getActionIcon(log.entityType)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {log.entityType?.replace("_", " ") || "System"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {log.details || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {userDisplay.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{userDisplay.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(log.createdAt!), "MMM d, yyyy h:mm a")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No activity logs found</p>
              <p className="mt-1">
                {searchQuery || actionFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "System activity will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
