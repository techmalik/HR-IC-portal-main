import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import {
  Users,
  Clock,
  Shield,
  Activity,
  UserPlus,
  ArrowRight,
  Calendar,
  FileText,
} from "lucide-react";
import type { User, ActivityLog } from "@shared/schema";
import { UserRole } from "@shared/schema";
import { format } from "date-fns";

export default function DashboardAdmin() {
  const { user, isAdmin } = useAuth();

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: activityLogs, isLoading: logsLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
    enabled: isAdmin,
  });

  const activeUsers = allUsers?.filter((u) => u.isActive);
  const icCount = allUsers?.filter((u) => u.role === UserRole.IC).length || 0;
  const adminCount = allUsers?.filter((u) => u.role === UserRole.ADMIN).length || 0;

  const recentLogs = activityLogs?.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Full visibility across all organizational data
          </p>
        </div>
        <Button asChild data-testid="button-add-user">
          <Link href="/users/new">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-total-users">
                {allUsers?.length || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {activeUsers?.length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Independent Contractors
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-ic-count">
                {icCount}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admins
            </CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-admin-count">
                {adminCount}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">User Management</CardTitle>
              <CardDescription>Recently added users</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/users" data-testid="link-all-users">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : allUsers && allUsers.length > 0 ? (
              <div className="space-y-3">
                {allUsers.slice(0, 5).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`user-${u.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {u.firstName?.[0]}
                          {u.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <StatusBadge status={u.role} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No users found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                asChild
                data-testid="button-manage-users"
              >
                <Link href="/users">
                  <Users className="w-5 h-5 mr-3 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Manage Users</p>
                    <p className="text-xs text-muted-foreground">Add, edit, or remove users</p>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                asChild
                data-testid="button-manage-roles"
              >
                <Link href="/roles">
                  <Shield className="w-5 h-5 mr-3 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Roles & Permissions</p>
                    <p className="text-xs text-muted-foreground">Configure access levels</p>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                asChild
                data-testid="button-view-timesheets"
              >
                <Link href="/all-timesheets">
                  <Clock className="w-5 h-5 mr-3 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">View All Timesheets</p>
                    <p className="text-xs text-muted-foreground">Review IC work logs</p>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                asChild
                data-testid="button-view-leaves"
              >
                <Link href="/leave-requests">
                  <Calendar className="w-5 h-5 mr-3 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Leave Requests</p>
                    <p className="text-xs text-muted-foreground">Review all OOO requests</p>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Activity Logs</CardTitle>
                <CardDescription>Recent system activity across all users</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/activity-logs" data-testid="link-all-logs">
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentLogs && recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50 text-sm"
                      data-testid={`activity-log-${log.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.details}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt!), "MMM d, h:mm a")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
