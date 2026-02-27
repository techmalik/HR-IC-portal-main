import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { Users, ChevronRight, LayoutGrid, List } from "lucide-react";
import type { User } from "@shared/schema";

export default function MyTeamPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: teamMembers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/team/members"],
    enabled: !!user?.id,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team Members</h1>
        <p className="text-muted-foreground mt-1">
          View your direct reports
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Direct Reports</CardTitle>
              <CardDescription>
                {teamMembers?.length || 0} team members assigned to you
              </CardDescription>
            </div>
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode("grid")}
                data-testid="button-grid-view"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode("list")}
                data-testid="button-list-view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : teamMembers && teamMembers.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <Link
                    key={member.id}
                    href={`/team/${member.id}`}
                    className="flex items-center gap-4 p-4 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                    data-testid={`team-member-${member.id}`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.firstName?.[0]}
                        {member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </p>
                      {member.jobTitle && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {member.jobTitle}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={member.role} />
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 px-3 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b">
                  <span className="w-8" />
                  <span>Name</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span className="w-5" />
                </div>
                {teamMembers.map((member) => (
                  <Link
                    key={member.id}
                    href={`/team/${member.id}`}
                    className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 px-3 py-3 rounded-md hover-elevate cursor-pointer"
                    data-testid={`team-member-${member.id}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {member.firstName?.[0]}
                        {member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">
                        {member.firstName} {member.lastName}
                      </p>
                      {member.jobTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.jobTitle}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    <StatusBadge status={member.role} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No direct reports assigned</p>
              <p className="text-sm mt-1">
                Team members will appear here once they are assigned to you by an administrator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
