import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

interface TrialExpiredOverlayProps {
  isAdmin: boolean;
  onLogout: () => void;
}

// Blocking, non-dismissible overlay shown once an org's 7-day free trial has
// ended without a paid subscription. Mirrors ForcePasswordChangeModal's
// pattern. Only /billing (to subscribe) and /profile (to log out) are usable
// while this is up — everywhere else stays frozen behind it.
export function TrialExpiredOverlay({ isAdmin, onLogout }: TrialExpiredOverlayProps) {
  const [location, setLocation] = useLocation();

  if (location === "/billing" || location === "/profile") {
    return null;
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Your 7-day trial has ended
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Subscribe to keep using Axle — your team's data is safe and everything picks back up the moment you're on a paid plan."
              : "Ask your admin or owner to subscribe to keep using Axle. Your data is safe and everything picks back up the moment your organization is on a paid plan."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {isAdmin && (
            <Button className="w-full" onClick={() => setLocation("/billing")} data-testid="button-go-to-billing">
              Go to Billing
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={onLogout} data-testid="button-trial-expired-logout">
            Log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
