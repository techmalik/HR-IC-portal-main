import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  isIOS,
  isStandalone,
  subscribeInstallAvailability,
  triggerInstallPrompt,
} from "@/lib/pwa";
import { trackEvent } from "@/lib/analytics";

const SEEN_KEY = "axle.install-hint.seen";
const VISIT_KEY = "axle.install-hint.visits";

// One-time migration from old key names (pre-rename).
if (typeof window !== "undefined") {
  try {
    const oldSeen = localStorage.getItem("teamflow.install-hint.seen");
    if (oldSeen !== null && localStorage.getItem(SEEN_KEY) === null) localStorage.setItem(SEEN_KEY, oldSeen);
    localStorage.removeItem("teamflow.install-hint.seen");
    const oldVisit = localStorage.getItem("teamflow.install-hint.visits");
    if (oldVisit !== null && localStorage.getItem(VISIT_KEY) === null) localStorage.setItem(VISIT_KEY, oldVisit);
    localStorage.removeItem("teamflow.install-hint.visits");
  } catch {}
}

function getVisitCount(): number {
  try {
    return parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function bumpVisitCount(): number {
  const next = getVisitCount() + 1;
  try {
    localStorage.setItem(VISIT_KEY, String(next));
  } catch {}
  return next;
}

export function InstallPwaHint() {
  const isMobile = useIsMobile();
  const [available, setAvailable] = useState(false);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const visit = bumpVisitCount();
    if (isStandalone()) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (dismissed) return;
    if (visit < 1) return; // show starting on the second visit
    if (isIOS()) {
      // iOS never fires beforeinstallprompt — show manual instructions.
      setIosHint(true);
      setShow(true);
      return;
    }
    const unsub = subscribeInstallAvailability((avail) => {
      setAvailable(avail);
      if (avail) setShow(true);
    });
    // If the browser hasn't fired beforeinstallprompt by visit #2 (e.g. some
    // Android browsers, desktops, or PWAs already partly installed), still
    // surface the hint as a generic "add to home screen" nudge so we don't
    // miss the funnel — but only from the second visit onward.
    let timeout: number | undefined;
    if (visit >= 1) {
      timeout = window.setTimeout(() => {
        setShow(true);
      }, 4000);
    }
    return () => {
      unsub();
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, []);

  if (!isMobile || !show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    trackEvent("pwa_install_hint_dismissed");
  };

  const onInstall = async () => {
    trackEvent("pwa_install_hint_clicked");
    const outcome = await triggerInstallPrompt();
    if (outcome === "accepted") {
      trackEvent("pwa_install_accepted");
    }
    dismiss();
  };

  return (
    <div
      role="dialog"
      aria-label="Install Axle"
      data-testid="install-pwa-hint"
      className="fixed bottom-[72px] inset-x-3 z-50 md:hidden rounded-lg border bg-card text-card-foreground shadow-lg p-3 flex items-start gap-3"
    >
      <div className="rounded-md bg-primary/10 p-2 text-primary shrink-0">
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Install Axle</p>
        {iosHint ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap <Share className="inline w-3 h-3 mx-0.5" /> Share, then "Add to Home Screen".
          </p>
        ) : available ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            Add to your home screen for quick one-tap access.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            Open your browser menu and choose "Add to home screen" for one-tap access.
          </p>
        )}
        {!iosHint && available && (
          <Button
            size="sm"
            className="mt-2 h-9"
            onClick={onInstall}
            data-testid="button-install-pwa"
          >
            Install
          </Button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss install hint"
        onClick={dismiss}
        data-testid="button-dismiss-install-hint"
        className="p-2 -m-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
