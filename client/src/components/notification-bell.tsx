import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import type { Notification } from "@shared/schema";

function getDeepLink(n: Notification): string | null {
  const { entityType, entityId, type } = n;
  if ((entityType === "ooo" || entityType === "ooo_request") && entityId) return `/ooo-requests?highlight=${entityId}`;
  if ((entityType === "timesheet" || entityType === "timesheet_entry")) {
    // Timesheet reminders use a synthetic period-key entityId (e.g.
    // "ts-reminder:2026-05") which doesn't correspond to a real record;
    // route those to the page without a highlight.
    if (entityId && !entityId.startsWith("ts-reminder:")) return `/timesheets?highlight=${entityId}`;
    return "/timesheets";
  }
  if (entityType === "invoice" && entityId) return `/invoices?highlight=${entityId}`;
  if ((entityType === "overtime" || entityType === "overtime_request") && entityId) return `/overtime-approvals?highlight=${entityId}`;
  if (entityType === "evaluation" && entityId) return `/evaluations?highlight=${entityId}`;
  if (entityType === "expense" && entityId) return `/expenses?highlight=${entityId}`;
  if (entityType === "user" && entityId) return `/team/${entityId}`;
  if (type.startsWith("ooo_")) return "/ooo-requests";
  if (type.startsWith("timesheet_")) return "/timesheets";
  if (type.startsWith("invoice_")) return "/invoices";
  if (type.startsWith("overtime_")) return "/overtime-approvals";
  if (type.startsWith("expense_")) return "/expenses";
  if (type.startsWith("evaluation_") || type === "feedback_requested") return "/evaluations";
  return null;
}

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, isMarkingAsRead } = useNotifications();

  const recent = notifications.slice(0, 30);

  const grouped = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of recent) {
      const label = dayLabel(new Date(n.createdAt));
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(n);
    }
    return Array.from(map.entries());
  }, [recent]);

  const getNotificationIcon = (type: string) => {
    if (type.includes("approved") || type.includes("processed")) return "text-green-600 dark:text-green-400";
    if (type.includes("rejected")) return "text-red-600 dark:text-red-400";
    if (type.includes("submitted") || type.includes("uploaded")) return "text-blue-600 dark:text-blue-400";
    if (type.includes("reminder") || type.includes("unlocked") || type.includes("requested")) return "text-yellow-600 dark:text-yellow-400";
    return "text-foreground";
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) markAsRead(n.id);
    const link = getDeepLink(n);
    if (link) {
      setLocation(link);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-0.5 right-0.5 h-4 w-4 min-w-0 flex items-center justify-center p-0 text-[10px] leading-none rounded-full"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0 max-w-[calc(100vw-1rem)]" align="end">
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAsRead}
              className="h-7 text-xs"
              data-testid="button-mark-all-read"
            >
              {isMarkingAsRead ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="w-3 h-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : recent.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div>
              {grouped.map(([label, items]) => (
                <div key={label}>
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground border-b">
                    {label}
                  </div>
                  <div className="divide-y">
                    {items.map((notification) => {
                      const hasLink = !!getDeepLink(notification);
                      return (
                        <div
                          key={notification.id}
                          role={hasLink ? "button" : undefined}
                          tabIndex={hasLink ? 0 : undefined}
                          className={`p-3 hover-elevate ${hasLink ? "cursor-pointer" : ""} ${
                            !notification.isRead ? "bg-muted/50" : ""
                          }`}
                          onClick={() => handleClick(notification)}
                          onKeyDown={(e) => {
                            if (hasLink && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              handleClick(notification);
                            }
                          }}
                          data-testid={`notification-item-${notification.id}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                              !notification.isRead ? "bg-primary" : "bg-transparent"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${getNotificationIcon(notification.type)}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                data-testid={`button-mark-read-${notification.id}`}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
