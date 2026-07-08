import { useState } from "react";
import { usePageMeta } from "@/lib/use-page-meta";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { isSubdomainMode, getAppOrigin } from "@/lib/subdomain";
import { Loader2, AlertCircle } from "lucide-react";

function LogoMark({ size = 28, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className="shrink-0">
      <circle cx="14" cy="14" r="11.5" stroke={color} strokeWidth="2" />
      <circle cx="14" cy="14" r="4" fill={color} />
    </svg>
  );
}

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  usePageMeta({
    title: "Log in — Axle",
    description: "Log in to your Axle account to manage timesheets, invoices, leave requests, and more.",
    canonical: "https://axle.run/login",
  });

  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = searchParams.get("redirect") || "/";
  const sessionExpired = searchParams.get("expired") === "1";

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    const success = await login(data.username, data.password);
    setIsLoading(false);

    if (success) {
      if (isSubdomainMode()) {
        window.location.href = `${getAppOrigin()}/`;
      } else {
        setLocation(redirectTo);
      }
    } else {
      toast({
        title: "Login failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex bg-sidebar relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='11' stroke='white' stroke-width='1.5' fill='none'/%3E%3Ccircle cx='30' cy='30' r='3.5' fill='white'/%3E%3C/svg%3E\")",
            backgroundSize: "60px 60px",
          }}
        />
        <a href="/" className="relative flex items-center gap-2.5 no-underline">
          <LogoMark size={28} color="white" />
          <span className="text-gray-50 text-lg font-bold tracking-tight">Axle</span>
        </a>

        <div className="relative">
          <h2 className="text-4xl font-serif font-normal text-gray-50 leading-[1.12] mb-5">
            Contractor ops,
            <br />
            <em>finally in order.</em>
          </h2>
          <p className="text-[15px] text-gray-500 leading-relaxed mb-10 max-w-[360px]">
            Timesheets, invoices, leave, and evaluations. One platform, zero spreadsheets.
          </p>
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-[22px] py-5">
            <p className="text-sm text-gray-400 leading-relaxed mb-3.5">
              "Axle cut our timesheet approval process from two days to about ten minutes. I can't imagine going back."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-[30px] h-[30px] rounded-full bg-[#1C2230] border border-[#2A3545] flex items-center justify-center shrink-0">
                <span className="text-[#8DAFC8] text-[10.5px] font-bold">MR</span>
              </div>
              <div>
                <div className="text-[12.5px] font-semibold text-gray-200">Marcus Rivera</div>
                <div className="text-[11.5px] text-gray-600">Head of Operations, Meridian</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative text-[11.5px] text-gray-700">axlehq.app</div>
      </div>

      {/* Right: form */}
      <div className="bg-white flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight mb-1.5">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to your Axle account</p>

          {sessionExpired && (
            <div
              className="mb-5 flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800"
              data-testid="banner-session-expired"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[13px]">Your session has expired. Please log in again to continue.</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-[18px]">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-medium text-gray-700">Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username"
                        className="h-auto border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm text-gray-900"
                        {...field}
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-[13px] font-medium text-gray-700">Password</FormLabel>
                      <span className="text-[12.5px] text-primary font-medium">Forgot password?</span>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        className="h-auto border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={isLoading} data-testid="button-login">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-[12.5px] text-gray-400">
              Don't have an account?{" "}
              <a href="/signup" className="text-primary font-medium no-underline">
                Get started free
              </a>
            </p>
            <p className="text-[12.5px] text-gray-400">Forgot password? Contact your administrator.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
