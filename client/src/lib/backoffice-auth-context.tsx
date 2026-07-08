import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";

interface BackofficeUser extends Omit<User, "password"> {
  isPlatformAdmin?: boolean;
}

interface BackofficeAuthContextType {
  user: BackofficeUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const BackofficeAuthContext = createContext<BackofficeAuthContextType | undefined>(undefined);

export function BackofficeAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackofficeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backoffice/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch("/api/backoffice/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || "Invalid credentials. Please try again." };
      }
      const data = await res.json();
      setUser(data);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/backoffice/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setUser(null);
  };

  return (
    <BackofficeAuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </BackofficeAuthContext.Provider>
  );
}

export function useBackofficeAuth() {
  const context = useContext(BackofficeAuthContext);
  if (!context) {
    throw new Error("useBackofficeAuth must be used within BackofficeAuthProvider");
  }
  return context;
}
