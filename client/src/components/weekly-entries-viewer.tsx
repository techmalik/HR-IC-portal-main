import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeeklyGroup } from "@/hooks/use-weekly-entries";

interface WeeklyEntriesViewerProps {
  isLoading: boolean;
  weeklyGroups: WeeklyGroup[];
  collapsedWeeks: Set<number>;
  onToggleWeek: (weekNum: number) => void;
  expandedEntries?: Set<string>;
  onToggleEntry?: (entryId: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function WeeklyEntriesViewer({
  isLoading,
  weeklyGroups,
  collapsedWeeks,
  onToggleWeek,
  expandedEntries,
  onToggleEntry,
  emptyMessage = "No entries found",
  className = "space-y-2",
}: WeeklyEntriesViewerProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (weeklyGroups.length === 0) {
    return <p className="text-muted-foreground text-center py-4">{emptyMessage}</p>;
  }

  return (
    <div className={className}>
      {weeklyGroups.map((group) => (
        <Collapsible
          key={group.weekNum}
          open={!collapsedWeeks.has(group.weekNum)}
          onOpenChange={() => onToggleWeek(group.weekNum)}
        >
          <CollapsibleTrigger asChild>
            <div
              className="flex items-center justify-between p-3 rounded-md bg-muted cursor-pointer hover-elevate min-w-0"
              data-testid={`week-header-${group.weekNum}`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {collapsedWeeks.has(group.weekNum) ? (
                  <ChevronRight className="w-4 h-4 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 shrink-0" />
                )}
                <span className="font-medium text-sm truncate">
                  Week of {format(group.weekStart, "MMM d")}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({group.entries.length} {group.entries.length === 1 ? "day" : "days"})
                </span>
              </div>
              <span className="font-semibold text-sm shrink-0 ml-2">{group.totalHours}h</span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pl-6 pt-2 space-y-1">
              {group.entries.map((entry) => {
                const expanded = expandedEntries?.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    className={`p-2 rounded-md bg-muted/30 ${onToggleEntry ? "cursor-pointer hover-elevate" : ""}`}
                    data-testid={`entry-${entry.id}`}
                    onClick={onToggleEntry ? () => onToggleEntry(entry.id) : undefined}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {format(new Date(entry.date), "EEEE, MMM d")}
                        </p>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className="font-medium text-sm">{entry.hours}h</p>
                      </div>
                    </div>
                    <p
                      className={`text-xs text-muted-foreground mt-1 ${
                        onToggleEntry ? (expanded ? "whitespace-pre-wrap" : "truncate") : "truncate"
                      }`}
                    >
                      {entry.activityLog || "No activity log"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
