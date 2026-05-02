import { Fragment, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { ArrowLeft, HelpCircle, Compass, Clock, FileText, Calendar, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

const TOUR_ROUTES: Record<string, string> = {
  portal: "/",
  timesheets: "/timesheets",
  invoices: "/invoices",
  ooo: "/ooo-requests",
  supervisor: "/leave-requests",
};

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backHref?: string;
  backLabel?: string;
  onStartTour?: (tourId: "portal" | "timesheets" | "invoices" | "ooo" | "supervisor") => void;
  onStartTourAfterNavigation?: (tourId: "portal" | "timesheets" | "invoices" | "ooo" | "supervisor") => void;
  showSupervisorTour?: boolean;
}

export function PageHeader({ title, breadcrumbs, backHref, backLabel, onStartTour, onStartTourAfterNavigation, showSupervisorTour }: PageHeaderProps) {
  const { user, updateUser } = useAuth();
  const [location, setLocation] = useLocation();

  const handleStartTour = async (tourId: "portal" | "timesheets" | "invoices" | "ooo" | "supervisor") => {
    if (!user?.id) return;
    
    const targetRoute = TOUR_ROUTES[tourId];
    // Check if we're on the correct page, accounting for query params and subroutes
    const currentPath = location.split('?')[0];
    const isOnCorrectPage = currentPath === targetRoute || 
      (tourId === "portal" && currentPath === "/") ||
      (tourId === "supervisor" && currentPath.startsWith("/leave-requests")) ||
      (tourId === "timesheets" && currentPath.startsWith("/timesheets")) ||
      (tourId === "invoices" && currentPath.startsWith("/invoices")) ||
      (tourId === "ooo" && currentPath.startsWith("/ooo-requests"));
    
    try {
      const response = await fetch(`/api/users/${user.id}/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ tour: tourId, completed: false }),
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        updateUser({ completedOnboarding: updatedUser.completedOnboarding });
        
        if (!isOnCorrectPage && targetRoute) {
          // Set pending tour before navigation so page can activate it on mount
          onStartTourAfterNavigation?.(tourId);
          setLocation(targetRoute);
        } else {
          onStartTour?.(tourId);
        }
      }
    } catch (error) {
      console.error("Failed to reset tour:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex items-center gap-3">
        {backHref && (
          <>
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{backLabel || "Back"}</span>
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs?.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Fragment key={index}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : crumb.href ? (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <span className="text-muted-foreground">{crumb.label}</span>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              );
            }) ?? (
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-help">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Help & Tours</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleStartTour("portal")}
              data-testid="button-start-portal-tour"
            >
              <Compass className="w-4 h-4 mr-2" />
              Portal Tour
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStartTour("timesheets")}
              data-testid="button-start-timesheets-tour"
            >
              <Clock className="w-4 h-4 mr-2" />
              Timesheets Tour
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStartTour("invoices")}
              data-testid="button-start-invoices-tour"
            >
              <FileText className="w-4 h-4 mr-2" />
              Invoices Tour
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStartTour("ooo")}
              data-testid="button-start-ooo-tour"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Time Off Tour
            </DropdownMenuItem>
            {showSupervisorTour && (
              <DropdownMenuItem
                onClick={() => handleStartTour("supervisor")}
                data-testid="button-start-supervisor-tour"
              >
                <Users className="w-4 h-4 mr-2" />
                Supervisor Approvals Tour
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
