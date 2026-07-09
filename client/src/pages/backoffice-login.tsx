import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { useBackofficeAuth } from "@/lib/backoffice-auth-context";
import { getMarketingOrigin } from "@/lib/subdomain";

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="shrink-0">
      <circle cx="14" cy="14" r="11.5" stroke="white" strokeWidth="2" />
      <circle cx="14" cy="14" r="4" fill="white" />
    </svg>
  );
}

export default function BackofficeLoginPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, login } = useBackofficeAuth();

  useEffect(() => {
    let el = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
    return () => {
      el?.remove();
    };
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/back-office");
    }
  }, [authLoading, user, setLocation]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email.trim(), password);
    if (!result.ok) {
      setError(result.error || "Invalid credentials. Please try again.");
      setIsLoading(false);
      return;
    }

    window.location.replace("/back-office");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[360px]">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <LogoMark />
          <span className="text-[#F9FAFB] text-[16px] font-bold tracking-[-0.02em]">Axle</span>
          <span className="ml-1 inline-flex items-center gap-[5px] bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.2)] rounded-[5px] px-2 py-[3px]">
            <span className="w-[5px] h-[5px] bg-[#EF4444] rounded-full shrink-0 block" />
            <span className="text-[9.5px] font-bold text-[#FCA5A5] tracking-[0.08em] uppercase">Internal</span>
          </span>
        </div>

        <div className="bg-[#111827] border border-white/[0.07] rounded-xl p-8">
          <h1 className="text-[20px] font-bold text-[#F9FAFB] tracking-tight mb-1">
            Back-office access
          </h1>
          <p className="text-[13px] text-[#6B7280] mb-6">
            Platform administrators only.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 mb-5 p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
              {error.includes("Access denied") || error.includes("platform admins") ? (
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-[#FCA5A5]" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#FCA5A5]" />
              )}
              <p className="text-[13px] text-[#FCA5A5] leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#9CA3AF]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@axlehq.app"
                autoComplete="email"
                className="w-full bg-[#1C2230] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-[14px] text-[#F3F4F6] placeholder:text-[#374151] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/30 transition-colors"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#9CA3AF]">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[#1C2230] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-[14px] text-[#F3F4F6] placeholder:text-[#374151] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/30 transition-colors"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="mt-1 w-full flex items-center justify-center gap-2 bg-[#4F6EF7] hover:bg-[#3B59E4] text-white font-semibold text-[14px] py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11.5px] text-[#374151]">
          Not a platform admin?{" "}
          <a href={`${getMarketingOrigin() || ""}/login`} className="text-[#4B5563] hover:text-[#6B7280] underline transition-colors">
            Go to main login
          </a>
        </p>
      </div>
    </div>
  );
}
