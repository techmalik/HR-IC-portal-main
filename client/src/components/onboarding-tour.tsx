import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface OnboardingTourProps {
  tourId: "portal" | "timesheets" | "invoices" | "ooo" | "supervisor" | "owner";
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTour({ tourId, steps, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [isSearching, setIsSearching] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const handleRepositionRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const targetFoundRef = useRef(false);
  const { user, updateUser } = useAuth();

  const step = steps[currentStep];

  const cleanupAll = useCallback(() => {
    isMountedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (handleRepositionRef.current) {
      window.removeEventListener("resize", handleRepositionRef.current);
      window.removeEventListener("scroll", handleRepositionRef.current, true);
      handleRepositionRef.current = null;
    }
  }, []);

  const updatePosition = useCallback((stepIndex: number, targetId: string) => {
    if (!isMountedRef.current || !targetId) return false;
    
    const element = document.querySelector(`[data-testid="${targetId}"]`);
    if (!element || !document.body.contains(element)) {
      setTargetRect(null);
      setIsSearching(true);
      targetFoundRef.current = false;
      return false;
    }
    
    setIsSearching(false);
    targetFoundRef.current = true;
    
    // Scroll into view only once per step
    if (!hasScrolledRef.current) {
      hasScrolledRef.current = true;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Capture current step placement for the timeout
    const placement = step?.placement || "bottom";
    
    // Delay measuring to allow scroll to complete
    timeoutRef.current = setTimeout(() => {
      // Verify we're still on the same step
      if (!isMountedRef.current) return;
      
      // Re-verify element still exists after delay
      const currentElement = document.querySelector(`[data-testid="${targetId}"]`);
      if (!currentElement || !document.body.contains(currentElement)) {
        setTargetRect(null);
        setIsSearching(true);
        return;
      }
      
      const rect = currentElement.getBoundingClientRect();
      setTargetRect(rect);
      
      const popoverWidth = 320;
      const popoverHeight = 180;
      const gap = 12;
      
      let top = 0;
      let left = 0;
      
      switch (placement) {
        case "top":
          top = rect.top - popoverHeight - gap;
          left = rect.left + rect.width / 2 - popoverWidth / 2;
          break;
        case "bottom":
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - popoverWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - popoverHeight / 2;
          left = rect.left - popoverWidth - gap;
          break;
        case "right":
          top = rect.top + rect.height / 2 - popoverHeight / 2;
          left = rect.right + gap;
          break;
      }
      
      left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - popoverHeight - 16));
      
      setPopoverPosition({ top, left });
    }, 100);
    
    return true;
  }, [step?.placement]);

  useEffect(() => {
    // Capture current step info for closures
    const stepIndex = currentStep;
    const targetId = step?.target || "";
    
    // Mark as mounted
    isMountedRef.current = true;
    
    // Reset state for new step
    hasScrolledRef.current = false;
    targetFoundRef.current = false;
    setTargetRect(null);
    setIsSearching(true);
    
    // Try to find target immediately
    updatePosition(stepIndex, targetId);
    
    // Use light polling to detect when async-loaded elements appear/disappear
    // Always re-validate position to handle React element replacements
    const pollInterval = setInterval(() => {
      if (isMountedRef.current) {
        const element = document.querySelector(`[data-testid="${targetId}"]`);
        const elementExists = element && document.body.contains(element);
        
        if (elementExists) {
          // Always update position to handle element replacements
          updatePosition(stepIndex, targetId);
        } else if (!elementExists && targetFoundRef.current) {
          // Element disappeared - reset state
          setTargetRect(null);
          setIsSearching(true);
          targetFoundRef.current = false;
        }
      }
    }, 300);
    
    // Handle resize and scroll
    handleRepositionRef.current = () => {
      if (isMountedRef.current) {
        updatePosition(stepIndex, targetId);
      }
    };
    window.addEventListener("resize", handleRepositionRef.current);
    window.addEventListener("scroll", handleRepositionRef.current, true);
    
    return () => {
      clearInterval(pollInterval);
      cleanupAll();
    };
  }, [updatePosition, currentStep, step?.target, cleanupAll]);

  const saveTourCompletion = async (completed: boolean) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/users/${user.id}/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ tour: tourId, completed }),
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        updateUser({ completedOnboarding: updatedUser.completedOnboarding });
      }
    } catch (error) {
      console.error("Failed to save tour completion:", error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    cleanupAll();
    await saveTourCompletion(true);
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = async () => {
    cleanupAll();
    await saveTourCompletion(true);
    setIsVisible(false);
    onSkip?.();
  };

  if (!isVisible) return null;

  // Show backdrop with highlight only if we have a valid target rect
  const backdropContent = targetRect ? (
    <div className="fixed inset-0 z-[9998]" data-testid="tour-backdrop">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id={`tour-mask-${tourId}`}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - 4}
              y={targetRect.top - 4}
              width={targetRect.width + 8}
              height={targetRect.height + 8}
              rx="6"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask={`url(#tour-mask-${tourId})`}
        />
      </svg>
      <div
        className="absolute border-2 border-primary rounded-md pointer-events-none"
        style={{
          left: targetRect.left - 4,
          top: targetRect.top - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />
    </div>
  ) : (
    <div className="fixed inset-0 z-[9998] bg-black/50" data-testid="tour-backdrop" />
  );

  // Calculate centered popover position when no target
  const centeredPosition = {
    top: window.innerHeight / 2 - 90,
    left: window.innerWidth / 2 - 160,
  };
  const currentPosition = targetRect ? popoverPosition : centeredPosition;

  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed z-[9999]"
      style={{
        top: currentPosition.top,
        left: currentPosition.left,
        width: 320,
      }}
      data-testid="tour-popover"
    >
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{step.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSkip}
              data-testid="button-tour-skip"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground">{step.description}</p>
          {isSearching && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Loading content...</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-2 pt-0">
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                data-testid="button-tour-previous"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              data-testid="button-tour-next"
            >
              {currentStep === steps.length - 1 ? "Done" : "Next"}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );

  return createPortal(
    <>
      {backdropContent}
      {popoverContent}
    </>,
    document.body
  );
}

export interface TourConfig {
  tourId: "portal" | "timesheets" | "invoices" | "ooo" | "supervisor" | "owner";
  steps: TourStep[];
}

export const portalTourConfig: TourConfig = {
  tourId: "portal",
  steps: [
    {
      target: "tour-target-welcome",
      title: "Welcome to TeamFlow",
      description: "This is your central hub for managing timesheets, time off requests, invoices, and more. Let's take a quick tour!",
      placement: "bottom",
    },
    {
      target: "tour-target-sidebar",
      title: "Navigation Sidebar",
      description: "Use the sidebar to navigate between different sections like Timesheets, Out of Office requests, and Invoices.",
      placement: "right",
    },
    {
      target: "tour-target-dashboard",
      title: "Your Dashboard",
      description: "This is your dashboard where you can see an overview of your pending tasks, recent activity, and quick actions.",
      placement: "bottom",
    },
    {
      target: "tour-target-profile",
      title: "Profile & Settings",
      description: "Access your profile settings and preferences from here. You can update your information and notification preferences.",
      placement: "left",
    },
  ],
};

export const timesheetsTourConfig: TourConfig = {
  tourId: "timesheets",
  steps: [
    {
      target: "tour-target-timesheet-calendar",
      title: "Timesheet Calendar",
      description: "Click on any day to log your work hours and activities. Green days indicate completed entries. Fill out your timesheet daily - you can submit it for payment whenever you're ready.",
      placement: "bottom",
    },
    {
      target: "tour-target-timesheet-status",
      title: "Timesheet Status",
      description: "Track your timesheet status: Draft (in progress), Submitted (with invoice for review), or Approved (locked and processed).",
      placement: "left",
    },
    {
      target: "tour-target-timesheet-submit",
      title: "Submit with Invoice",
      description: "Your timesheet is automatically submitted when you create an invoice. Once approved, both become locked and sync to our records.",
      placement: "top",
    },
  ],
};

export const invoicesTourConfig: TourConfig = {
  tourId: "invoices",
  steps: [
    {
      target: "tour-target-invoice-new",
      title: "Submit Invoice for Payment",
      description: "Click here to submit an invoice. Your timesheet will be automatically submitted for review alongside it. You can upload an existing invoice or generate one from your hours.",
      placement: "bottom",
    },
    {
      target: "tour-target-invoice-list",
      title: "Your Invoices",
      description: "Track all your invoices here. Your supervisor will review both your invoice and timesheet together before approval.",
      placement: "top",
    },
    {
      target: "tour-target-invoice-status",
      title: "Invoice Status",
      description: "Pending Review: awaiting supervisor approval. Approved: locked and synced to records. Rejected: see the reason and resubmit with corrections.",
      placement: "left",
    },
  ],
};

export const oooTourConfig: TourConfig = {
  tourId: "ooo",
  steps: [
    {
      target: "tour-target-ooo-new",
      title: "Request Time Off",
      description: "Click here to submit a new out-of-office request. Select your dates and specify the reason.",
      placement: "bottom",
    },
    {
      target: "tour-target-ooo-list",
      title: "Your Requests",
      description: "This is where your time off requests will appear. You can track pending approvals and view past requests.",
      placement: "top",
    },
    {
      target: "tour-target-ooo-status",
      title: "Request Status",
      description: "Each request shows its status: Pending (awaiting approval), Approved (confirmed), or Rejected. Check reviewer notes for details.",
      placement: "left",
    },
  ],
};

export const supervisorApprovalsTourConfig: TourConfig = {
  tourId: "supervisor",
  steps: [
    {
      target: "tour-target-supervisor-welcome",
      title: "Welcome, Supervisor!",
      description: "As a supervisor, you can review and approve requests from your team. Let's walk through how to manage your team's approvals.",
      placement: "bottom",
    },
    {
      target: "tour-target-team-approvals",
      title: "Team Approvals Overview",
      description: "This section shows all items requiring your review - leave requests, invoices, and timesheets. The numbers indicate how many are waiting for your action.",
      placement: "bottom",
    },
    {
      target: "tour-target-pending-leaves-card",
      title: "Pending Leave Requests",
      description: "Here you can see leave requests from your team members. Click 'View All' to see the full list and take action on each request.",
      placement: "right",
    },
    {
      target: "tour-target-pending-timesheets-card",
      title: "Invoice & Timesheet Review",
      description: "When contractors submit invoices, review both the invoice and linked timesheet together. Approving locks both documents and syncs them to records.",
      placement: "left",
    },
    {
      target: "tour-target-approval-actions",
      title: "Approve or Reject",
      description: "For each request, you can approve it or reject it with a message. Rejected invoices can be corrected and resubmitted by the contractor.",
      placement: "top",
    },
  ],
};

export const ownerTourConfig: TourConfig = {
  tourId: "owner",
  steps: [
    {
      target: "tour-target-welcome",
      title: "Welcome to TeamFlow!",
      description: "Congratulations on setting up your organization! Let's walk you through the key steps to get your team up and running.",
      placement: "bottom",
    },
    {
      target: "tour-target-sidebar",
      title: "Invite Your Contractors",
      description: "Head to the Users section in the sidebar to add your team members. You can invite contractors, assign supervisors, and set hourly rates.",
      placement: "right",
    },
    {
      target: "tour-target-dashboard",
      title: "Set Up Your First Timesheet",
      description: "Once your contractors are added, they can start logging hours in Timesheets. You'll be able to review and approve their work right from your dashboard.",
      placement: "bottom",
    },
    {
      target: "tour-target-profile",
      title: "Customize Your Organization",
      description: "Visit your profile to update organization details, manage billing, and configure notification preferences. You're all set to go!",
      placement: "left",
    },
  ],
};

export function useTour(tourId: "portal" | "timesheets" | "invoices" | "ooo" | "supervisor" | "owner") {
  const { user } = useAuth();
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!user || hasChecked) return;
    
    const completedOnboarding = (user.completedOnboarding as Record<string, boolean>) || {};
    const isCompleted = completedOnboarding[tourId] === true;
    setShouldShowTour(!isCompleted);
    setHasChecked(true);
  }, [user, tourId, hasChecked]);

  const resetTour = useCallback(() => {
    setShouldShowTour(true);
  }, []);

  const completeTour = useCallback(() => {
    setShouldShowTour(false);
  }, []);

  return { shouldShowTour, resetTour, completeTour };
}
