import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { ForcePasswordChangeModal } from "@/components/force-password-change-modal";
import { IdleTimeoutDialog } from "@/components/idle-timeout-dialog";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_DURATION_S = 2 * 60;

const ACTIVITY_EVENTS = ["click", "keydown", "mousemove", "touchstart"] as const;

interface AuthUser extends Omit<User, 'mustChangePassword'> {
  sessionToken?: string;
  hasDirectReports?: boolean;
  mustChangePassword?: boolean;
}

interface RegisterResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  sessionToken: string | null;
  isLoading: boolean;
  isSupervisor: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (firstName: string, lastName: string, email: string, password: string, organizationName: string) => Promise<RegisterResult>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(WARNING_DURATION_S);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningSecondsRef = useRef(WARNING_DURATION_S);
  const userRef = useRef<AuthUser | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  // Ref-based flag so activity handler stays stable across warning open/close
  const warningActiveRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

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
    const token = sessionTokenRef.current;
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: token }),
        });
      } catch {
      }
    }
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem("teamflow_user");
    localStorage.removeItem("teamflow_session_token");
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
    window.location.href = `/login${redirect}`;
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

  // Stable handler: reads warning state via ref so its identity never changes
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

  // Register activity listeners once per user session; does NOT depend on warning state
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
    const savedToken = localStorage.getItem("teamflow_session_token");
    if (!savedToken) {
      setIsLoading(false);
      return;
    }
    fetch("/api/auth/me", {
      headers: { "Authorization": `Bearer ${savedToken}` },
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setSessionToken(savedToken);
          localStorage.setItem("teamflow_user", JSON.stringify(userData));
        } else {
          localStorage.removeItem("teamflow_user");
          localStorage.removeItem("teamflow_session_token");
        }
      })
      .catch(() => {
        localStorage.removeItem("teamflow_user");
        localStorage.removeItem("teamflow_session_token");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      if (response.ok) {
        const { sessionToken: token, ...userData } = await response.json();
        setUser(userData);
        setSessionToken(token);
        localStorage.setItem("teamflow_user", JSON.stringify(userData));
        localStorage.setItem("teamflow_session_token", token);
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
        body: JSON.stringify({ firstName, lastName, email, password, organizationName }),
      });

      if (response.ok) {
        const { sessionToken: token, ...userData } = await response.json();
        setUser(userData);
        setSessionToken(token);
        localStorage.setItem("teamflow_user", JSON.stringify(userData));
        localStorage.setItem("teamflow_session_token", token);
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
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem("teamflow_user", JSON.stringify(updatedUser));
    }
  };

  const handlePasswordChangeSuccess = () => {
    updateUser({ mustChangePassword: false });
  };

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isSupervisor = isAdmin || (user?.hasDirectReports ?? false);

  return (
    <AuthContext.Provider value={{ user, sessionToken, isLoading, isSupervisor, isAdmin, login, register, logout, updateUser }}>
      {children}
      {user && sessionToken && user.mustChangePassword && (
        <ForcePasswordChangeModal
          userId={user.id}
          sessionToken={sessionToken}
          onSuccess={handlePasswordChangeSuccess}
        />
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
