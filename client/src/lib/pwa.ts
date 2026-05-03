export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best effort — failures are non-fatal.
    });
  });
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l(true));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((l) => l(false));
    try {
      const events = JSON.parse(
        localStorage.getItem("teamflow.analytics") || "[]"
      );
      events.push({ event: "pwa_installed", at: Date.now() });
      localStorage.setItem("teamflow.analytics", JSON.stringify(events));
    } catch {}
  });
}

export function subscribeInstallAvailability(cb: (available: boolean) => void) {
  listeners.add(cb);
  cb(!!deferredPrompt);
  return () => listeners.delete(cb);
}

export async function triggerInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((l) => l(false));
  return choice.outcome;
}

interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as IOSNavigator;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
