import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "axle:chunk-reload-attempted";

/**
 * Wraps React.lazy() so a stale-chunk 404 after a deploy (the imported hash
 * no longer exists on the server) reloads the page once to pick up the new
 * build, instead of permanently white-screening the route. Falls through to
 * a normal thrown error (caught by RouteErrorBoundary) if the reload doesn't
 * fix it, so a genuinely broken import doesn't reload forever.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_FLAG);
      return mod;
    } catch (error) {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        // Reload is in flight — never resolve so nothing renders in the meantime.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
