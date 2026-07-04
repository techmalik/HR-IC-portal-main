import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintClassName?: string;
  tone?: "default" | "warning";
  loading?: boolean;
  testId?: string;
}

export function StatCard({ label, value, hint, hintClassName, tone = "default", loading, testId }: StatCardProps) {
  const isWarning = tone === "warning";
  return (
    <div
      className={cn(
        "rounded-xl px-[18px] py-3.5 border-[1.5px]",
        isWarning
          ? "bg-[#FFFBEB] dark:bg-[#D97706]/10 border-[#FDE68A] dark:border-[#D97706]/30"
          : "bg-card border-card-border"
      )}
    >
      <div
        className={cn(
          "text-[9.5px] font-semibold tracking-[0.1em] uppercase mb-2",
          isWarning ? "text-[#92400E] dark:text-[#FBBF24]" : "text-muted-foreground"
        )}
      >
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-14" />
      ) : (
        <div
          className={cn(
            "text-[26px] font-bold mb-0.5",
            isWarning ? "text-[#92400E] dark:text-[#FBBF24]" : "text-foreground"
          )}
          data-testid={testId}
        >
          {value}
        </div>
      )}
      {hint && !loading && (
        <div
          className={cn(
            "text-xs",
            hintClassName || (isWarning ? "text-[#B45309] dark:text-[#FBBF24]/80" : "text-muted-foreground")
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
