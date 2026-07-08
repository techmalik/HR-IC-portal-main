import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getMarketingOrigin } from "@/lib/subdomain";

export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

declare global {
  interface Window {
    __authFetchInstalled?: boolean;
  }
}

let unauthorizedHandled = false;

// Endpoints that legitimately return 401 as a normal response (e.g. probing
// whether the user has a session) — those must NOT trigger a redirect.
const UNAUTHORIZED_IGNORE_PATHS = [
  "/api/auth/me",
  "/api/auth/login",
  "/api/backoffice/auth/me",
  "/api/backoffice/auth/login",
];

function shouldIgnore401For(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return UNAUTHORIZED_IGNORE_PATHS.some((p) => u.pathname === p);
  } catch {
    return UNAUTHORIZED_IGNORE_PATHS.some((p) => url.includes(p));
  }
}

function handleUnauthorized() {
  // Avoid redirect loops on the login/signup pages, and avoid firing twice
  // for parallel queries that all 401 at once.
  if (unauthorizedHandled) return;
  const currentPath = window.location.pathname;
  if (currentPath === "/login" || currentPath === "/signup") return;
  // Back-office 401s redirect to /back-office/login, not the main app login.
  if (currentPath === "/back-office/login") return;
  unauthorizedHandled = true;

  if (currentPath.startsWith("/back-office")) {
    window.location.href = "/back-office/login";
    return;
  }

  // Notify the auth context (and anyone else who cares) so client state can
  // be cleared before we redirect.
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));

  const params = new URLSearchParams();
  params.set("expired", "1");
  if (currentPath && currentPath !== "/") {
    params.set("redirect", currentPath + window.location.search + window.location.hash);
  }
  window.location.href = `${getMarketingOrigin()}/login?${params.toString()}`;
}

// Install a global fetch interceptor so ANY fetch in the app — including
// ad-hoc page-level queryFns that don't go through `apiRequest` or
// `getQueryFn` — gets the same 401 -> redirect-to-login behavior.
if (typeof window !== "undefined" && !window.__authFetchInstalled) {
  const originalFetch: typeof fetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    if (response.status === 401) {
      const reqUrl =
        typeof input === "string"
          ? input
          : input instanceof Request
          ? input.url
          : input.toString();
      if (!shouldIgnore401For(reqUrl)) {
        handleUnauthorized();
      }
    }
    return response;
  };
  window.__authFetchInstalled = true;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("Session expired. Please log in again.");
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      handleUnauthorized();
      throw new Error("Session expired. Please log in again.");
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
