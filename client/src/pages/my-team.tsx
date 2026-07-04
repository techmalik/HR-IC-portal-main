import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { Users, ChevronRight } from "lucide-react";
import type { User } from "@shared/schema";
import { getInitialsFromParts } from "@/lib/initials";

// StatusBadge renders approval/workflow statuses (pending/approved/etc.), not
// user roles — reuse its pill shape but with a role-appropriate label/color.
function RoleBadge({ role }: { role: string }) {
  if (role === "admin" || role === "owner") {
    return (
      <span className="text-[11.5px] font-medium bg-[#111827] text-white px-[9px] py-[3px] rounded-full whitespace-nowrap w-fit">
        {role === "owner" ? "Owner" : "Admin"}
      </span>
    );
  }
  return (
    <span className="text-[11.5px] font-medium bg-muted text-muted-foreground px-[9px] py-[3px] rounded-full whitespace-nowrap w-fit">
      Contractor
    </span>
  );
}

export default function MyTeamPage() {
  const { user } = useAuth();

  const { data: teamMembers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/team/members"],
    enabled: !!user?.id,
  });

  return (
    <div className="p-6 flex flex-col gap-[18px]">
      <div>
        <h1 className="text-xl font-normal text-neutral-900 dark:text-neutral-50 font-serif mb-0.5">Team members</h1>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          {isLoading ? "Loading..." : `${teamMembers?.length ?? 0} contractors assigned to you`}
        </p>
      </div>

      <div className="bg-white dark:bg-card border-[1.5px] border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col">
        <div className="grid grid-cols-[1fr_1fr_140px_36px] px-[18px] py-2.5 bg-[#F9FAFB] dark:bg-white/5 border-b border-neutral-200 dark:border-white/10 text-[10px] font-bold text-neutral-400 tracking-[0.08em] uppercase">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span />
        </div>

        {isLoading ? (
          <div className="p-[18px] space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : teamMembers && teamMembers.length > 0 ? (
          teamMembers.map((member, i) => (
            <Link
              key={member.id}
              href={`/team/${member.id}`}
              className={`grid grid-cols-[1fr_1fr_140px_36px] px-[18px] py-3 items-center gap-3 border-b border-neutral-50 dark:border-white/5 last:border-b-0 hover-elevate ${i % 2 ? "bg-neutral-50/50 dark:bg-white/[0.02]" : ""}`}
              data-testid={`team-member-${member.id}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#111827] text-white text-[10px] font-bold">
                    {getInitialsFromParts(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50 truncate">
                    {member.firstName} {member.lastName}
                  </div>
                  {member.jobTitle && (
                    <div className="text-[11.5px] text-neutral-400 truncate">{member.jobTitle}</div>
                  )}
                </div>
              </div>
              <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400 truncate">{member.email}</span>
              <RoleBadge role={member.role} />
              <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 justify-self-end" />
            </Link>
          ))
        ) : (
          <div className="px-[18px] py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No direct reports assigned</p>
            <p className="text-[12px] text-neutral-400 mt-1">
              Team members will appear here once they are assigned to you by an administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
