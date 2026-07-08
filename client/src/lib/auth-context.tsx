import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { ForcePasswordChangeModal } from "@/components/force-password-change-modal";
import { IdleTimeoutDialog } from "@/components/idle-timeout-dialog";
import { TrialExpiredOverlay } from "@/components/trial-expired-overlay";
import { AUTH_UNAUTHORIZED_EVENT, TRIAL_EXPIRED_EVENT } from "@/lib/queryClient";
import { getMarketingOrigin } from "@/lib/subdomain";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_DURATION_S = 2 * 60;

const ACTIVITY_EVENTS = ["click", "keydown", "mousemove", "touchstart"] as const;

interface AuthUser extends Omit<User, 'mustChangePassword'> {
  hasDirectReports?: boolean;
  mustChangePassword?: boolean;
  isPlatformAdmin?: boolean;
  trialExpired?: boolean;
}

interface RegisterResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSupervisor: boolean;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (firstName: string, lastName: string, email: string, password: string, organizationName: string) => Promise<RegisterResult>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(WARNING_DURATION_S);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningSecondsRef = useRef(WARNING_DURATION_S);
  const userRef = useRef<AuthUser | null>(null);
  const warningActiveRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearWarningInterval = useCallback(() => {
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setUser(null);
  }, []);

  const handleIdleLogout = useCallback(async () => {
    clearIdleTimer();
    clearWarningInterval();
    warningActiveRef.current = false;
    setShowIdleWarning(false);
    await doLogout();
    const { pathname, search, hash } = window.location;
    const fullPath = pathname + search + hash;
    const redirect = fullPath && pathname !== "/login" ? `?redirect=${encodeURIComponent(fullPath)}` : "";
    window.location.href = `${getMarketingOrigin()}/login${redirect}`;
  }, [clearIdleTimer, clearWarningInterval, doLogout]);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      warningSecondsRef.current = WARNING_DURATION_S;
      setWarningSecondsLeft(WARNING_DURATION_S);
      setShowIdleWarning(true);

      warningIntervalRef.current = setInterval(() => {
        warningSecondsRef.current -= 1;
        setWarningSecondsLeft(warningSecondsRef.current);
        if (warningSecondsRef.current <= 0) {
          clearWarningInterval();
          handleIdleLogout();
        }
      }, 1000);
    }, IDLE_TIMEOUT_MS);
  }, [clearIdleTimer, clearWarningInterval, handleIdleLogout]);

  const handleActivityEvent = useCallback(() => {
    if (warningActiveRef.current) return;
    if (!userRef.current) return;
    startIdleTimer();
  }, [startIdleTimer]);

  const handleStayLoggedIn = useCallback(() => {
    clearWarningInterval();
    warningActiveRef.current = false;
    setShowIdleWarning(false);
    startIdleTimer();
  }, [clearWarningInterval, startIdleTimer]);

  useEffect(() => {
    if (!user) {
      clearIdleTimer();
      clearWarningInterval();
      warningActiveRef.current = false;
      setShowIdleWarning(false);
      return;
    }

    startIdleTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivityEvent, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivityEvent);
      });
      clearIdleTimer();
      clearWarningInterval();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // When any API call returns 401, clear the in-memory user immediately so
    // the UI stops showing authenticated state. The redirect to /login is
    // handled in queryClient.ts.
    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  useEffect(() => {
    // A background API call can discover the trial expired (e.g. the org's
    // trial ends while this tab is open) before the next /api/auth/me poll —
    // flip the flag immediately so the blocking overlay shows up.
    const onTrialExpired = () => {
      setUser((current) => (current ? { ...current, trialExpired: true } : current));
    };
    window.addEventListener(TRIAL_EXPIRED_EVENT, onTrialExpired);
    return () => {
      window.removeEventListener(TRIAL_EXPIRED_EVENT, onTrialExpired);
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string, organizationName: string): Promise<RegisterResult> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, email, password, organizationName }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return { success: true };
      }

      const errorData = await response.json().catch(() => ({ error: "Registration failed" }));
      return { success: false, error: errorData.error };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    clearIdleTimer();
    clearWarningInterval();
    warningActiveRef.current = false;
    setShowIdleWarning(false);
    await doLogout();
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const handlePasswordChangeSuccess = () => {
    updateUser({ mustChangePassword: false });
  };

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isSupervisor = isAdmin || (user?.hasDirectReports ?? false);
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;

  return (
    <AuthContext.Provider value={{ user, isLoading, isSupervisor, isAdmin, isPlatformAdmin, login, register, logout, updateUser }}>
      {children}
      {user && user.mustChangePassword && (
        <ForcePasswordChangeModal
          userId={user.id}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}
      {user && !user.mustChangePassword && user.trialExpired && !isPlatformAdmin && (
        <TrialExpiredOverlay isAdmin={isAdmin} onLogout={logout} />
      )}
      {user && (
        <IdleTimeoutDialog
          open={showIdleWarning}
          secondsRemaining={warningSecondsLeft}
          onStayLoggedIn={handleStayLoggedIn}
          onLogout={handleIdleLogout}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
