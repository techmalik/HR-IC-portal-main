import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SampleDataBanner } from "@/components/sample-data-banner";
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
  AlertTriangle,
  Receipt,
} from "lucide-react";

import type { User, ActivityLog } from "@shared/schema";
import type { Contract } from "@/components/contracts-section";
import { UserRole } from "@shared/schema";
import { format, differenceInDays } from "date-fns";

interface UsageData {
  currentSeats: number;
  maxSeats: number;
  plan: string;
  percentUsed: number;
  trialEndsAt: string | null;
  trialExpired: boolean;
  daysLeftInTrial: number | null;
  estimatedMonthlyCost: number;
}

export default function DashboardAdmin() {
  const { user, isAdmin } = useAuth();

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: activityLogs, isLoading: logsLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
    enabled: isAdmin,
  });

  const { data: expiringContracts } = useQuery<Contract[]>({
    queryKey: ["/api/contracts/expiring"],
    enabled: isAdmin,
  });

  const { data: pendingExpensesData } = useQuery<{ count: number }>({
    queryKey: ["/api/expenses/pending-count"],
    enabled: isAdmin,
  });

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/billing/usage"],
    enabled: isAdmin,
  });

  const activeUsers = allUsers?.filter((u) => u.isActive);
  const icCount = allUsers?.filter((u) => u.role === UserRole.IC).length || 0;
  const adminCount = allUsers?.filter((u) => u.role === UserRole.ADMIN).length || 0;

  const recentLogs = activityLogs?.slice(0, 10);

  const trialExpired = usage?.trialExpired ?? false;
  const daysLeftInTrial = usage?.daysLeftInTrial ?? null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-neutral-900">Admin dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Full visibility across all organizational data
          </p>
        </div>
        <Button asChild size="sm" className="bg-[#111827] hover:bg-neutral-800 text-white" data-testid="button-add-user">
          <Link href="/users/new">
            <UserPlus className="w-4 h-4 mr-2" />
            Add user
          </Link>
        </Button>
      </div>

      {trialExpired && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-[1.5px] border-red-200 bg-red-50 text-red-800" data-testid="banner-trial-expired">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Free trial ended — you can no longer add users</p>
            <p className="text-sm mt-0.5">Upgrade to a paid plan to keep adding contractors to your team.</p>
          </div>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shrink-0" asChild>
            <Link href="/billing">Upgrade now</Link>
          </Button>
        </div>
      )}

      <SampleDataBanner />

      {!trialExpired && daysLeftInTrial !== null && usage?.plan === "free" && daysLeftInTrial <= 7 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-[1.5px] border-amber-200 bg-amber-50 text-amber-800" data-testid="banner-trial-ending">
          <Clock className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {daysLeftInTrial === 0 ? "Trial expires today" : `${daysLeftInTrial} day${daysLeftInTrial === 1 ? "" : "s"} left in your free trial`}
            </p>
            <p className="text-sm mt-0.5">Upgrade before your trial ends to avoid disruption.</p>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0" asChild>
            <Link href="/billing">Upgrade now</Link>
          </Button>
        </div>
      )}

      {expiringContracts && expiringContracts.length > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl border-[1.5px] border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
          data-testid="banner-contracts-expiring"
        >
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">
              {expiringContracts.length} contract{expiringContracts.length === 1 ? "" : "s"} approaching renewal
            </p>
            <ul className="mt-1 text-xs space-y-0.5">
              {expiringContracts.slice(0, 5).map((c) => {
                const days = differenceInDays(new Date(c.endDate), new Date());
                return (
                  <li key={c.id}>
                    <Link
                      href={`/team/${c.userId}?tab=contracts`}
                      className="underline hover-elevate"
                      data-testid={`link-expiring-contract-${c.id}`}
                    >
                      {c.title}
                    </Link>
                    {" "}, expires in {days} day{days === 1 ? "" : "s"}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {pendingExpensesData && pendingExpensesData.count > 0 && (
        <Link
          href="/expenses"
          className="flex items-center justify-between gap-3 p-4 rounded-xl border-[1.5px] border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] hover-elevate"
          data-testid="banner-expenses-pending"
        >
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium text-sm">
                {pendingExpensesData.count} expense{pendingExpensesData.count === 1 ? "" : "s"} awaiting review
              </p>
              <p className="text-xs text-[#B45309]">
                Review and approve reimbursement requests across the organization.
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2">Total users</div>
          {usersLoading ? (
            <Skeleton className="h-7 w-14" />
          ) : (
            <div className="text-[26px] font-bold text-neutral-900 mb-0.5" data-testid="text-total-users">
              {allUsers?.length || 0}
            </div>
          )}
          <div className="text-xs text-neutral-500">{activeUsers?.length || 0} active</div>
        </div>

        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2">Independent contractors</div>
          {usersLoading ? (
            <Skeleton className="h-7 w-14" />
          ) : (
            <div className="text-[26px] font-bold text-neutral-900 mb-0.5" data-testid="text-ic-count">
              {icCount}
            </div>
          )}
          <div className="text-xs text-neutral-500">across the organization</div>
        </div>

        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2">Admins</div>
          {usersLoading ? (
            <Skeleton className="h-7 w-14" />
          ) : (
            <div className="text-[26px] font-bold text-neutral-900 mb-0.5" data-testid="text-admin-count">
              {adminCount}
            </div>
          )}
          <div className="text-xs text-neutral-500">with full access</div>
        </div>
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
                        <AvatarFallback className="bg-[#111827] text-white text-sm font-semibold">
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
                    <span
                      className={
                        u.role === UserRole.ADMIN || u.role === UserRole.OWNER
                          ? "text-[11.5px] font-medium bg-[#111827] text-white px-[9px] py-[3px] rounded-full whitespace-nowrap"
                          : "text-[11.5px] font-medium bg-[#F3F4F6] text-[#374151] px-[9px] py-[3px] rounded-full whitespace-nowrap"
                      }
                    >
                      {u.role === UserRole.ADMIN ? "Admin" : u.role === UserRole.OWNER ? "Owner" : "Contractor"}
                    </span>
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
