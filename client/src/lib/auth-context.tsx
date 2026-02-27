import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { ForcePasswordChangeModal } from "@/components/force-password-change-modal";

interface AuthUser extends Omit<User, 'mustChangePassword'> {
  sessionToken?: string;
  hasDirectReports?: boolean;  // Dynamic supervisor flag
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  sessionToken: string | null;
  isLoading: boolean;
  isSupervisor: boolean;  // IC with direct reports (has team members)
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("mentalyc_user");
    const savedToken = localStorage.getItem("mentalyc_session_token");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedToken) {
      setSessionToken(savedToken);
    }
    setIsLoading(false);
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
        localStorage.setItem("mentalyc_user", JSON.stringify(userData));
        localStorage.setItem("mentalyc_session_token", token);
        return true;
      }
      return false;
    } catch {
      return false;
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
    localStorage.removeItem("mentalyc_user");
    localStorage.removeItem("mentalyc_session_token");
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem("mentalyc_user", JSON.stringify(updatedUser));
    }
  };

  const handlePasswordChangeSuccess = () => {
    updateUser({ mustChangePassword: false });
  };

  // Derived authorization flags
  const isAdmin = user?.role === "admin";
  // isSupervisor: IC with direct reports (team members assigned to them) OR Admin
  const isSupervisor = isAdmin || (user?.hasDirectReports ?? false);

  return (
    <AuthContext.Provider value={{ user, sessionToken, isLoading, isSupervisor, isAdmin, login, logout, updateUser }}>
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
