import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

let unauthorizedHandled = false;

// Endpoints that legitimately return 401 as a normal response (e.g. probing
// whether the user has a session) — those must NOT trigger a redirect.
const UNAUTHORIZED_IGNORE_PATHS = ["/api/auth/me", "/api/auth/login"];

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
  unauthorizedHandled = true;

  // Notify the auth context (and anyone else who cares) so client state can
  // be cleared before we redirect.
  try {
    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
  } catch {}

  const params = new URLSearchParams();
  params.set("expired", "1");
  if (currentPath && currentPath !== "/") {
    params.set("redirect", currentPath + window.location.search + window.location.hash);
  }
  window.location.href = `/login?${params.toString()}`;
}

// Install a global fetch interceptor so ANY fetch in the app — including
// ad-hoc page-level queryFns that don't go through `apiRequest` or
// `getQueryFn` — gets the same 401 -> redirect-to-login behavior.
if (typeof window !== "undefined" && !(window as any).__authFetchInstalled) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      const reqUrl =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof Request
          ? args[0].url
          : (args[0] as URL).toString();
      if (!shouldIgnore401For(reqUrl)) {
        handleUnauthorized();
      }
    }
    return response;
  };
  (window as any).__authFetchInstalled = true;
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
