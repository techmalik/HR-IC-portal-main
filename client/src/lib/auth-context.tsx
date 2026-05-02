import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { ForcePasswordChangeModal } from "@/components/force-password-change-modal";

interface AuthUser extends Omit<User, 'mustChangePassword'> {
  sessionToken?: string;
  hasDirectReports?: boolean;  // Dynamic supervisor flag
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
    if (sessionToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken }),
        });
      } catch {
      }
    }
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem("teamflow_user");
    localStorage.removeItem("teamflow_session_token");
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

  // Derived authorization flags
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  // isSupervisor: IC with direct reports (team members assigned to them) OR Admin
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
