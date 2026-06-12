import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Clock, FileText, Receipt, Calendar, User, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeQueue } from "@/lib/offline-queue";

const TABS = [
  { href: "/timesheets-overview", label: "Hours", icon: Clock, match: ["/timesheets", "/timesheets-overview"] },
  { href: "/invoices", label: "Invoices", icon: FileText, match: ["/invoices"] },
  { href: "/expenses", label: "Expenses", icon: Receipt, match: ["/expenses"] },
  { href: "/ooo-requests", label: "Time Off", icon: Calendar, match: ["/ooo-requests"] },
  { href: "/profile", label: "Profile", icon: User, match: ["/profile"] },
];

export function MobileBottomTabs() {
  const [location] = useLocation();
  const path = location.split("?")[0];
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeQueue((count) => setPending(count));
    return () => { unsubscribe(); };
  }, []);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur",
        "md:hidden",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      data-testid="mobile-bottom-tabs"
    >
      {pending > 0 && (
        <div
          className="flex items-center justify-center gap-2 py-1 text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-b border-amber-500/30"
          role="status"
          aria-live="polite"
          data-testid="offline-pending-banner"
        >
          <CloudOff className="w-3 h-3" />
          <span>
            {pending} draft{pending === 1 ? "" : "s"} waiting to sync
          </span>
        </div>
      )}
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match.some(
            (m) => path === m || path.startsWith(m + "/")
          );
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                data-testid={`bottom-tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "w-5 h-5",
                    isActive && "drop-shadow-sm"
                  )}
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
