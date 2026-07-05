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
import { Loader2 } from "lucide-react";

function LogoMark({ size = 28, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className="shrink-0">
      <circle cx="14" cy="14" r="11.5" stroke={color} strokeWidth="2" />
      <circle cx="14" cy="14" r="4" fill={color} />
    </svg>
  );
}

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  organizationName: z.string().min(1, "Organization name is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  usePageMeta({
    title: "Start your free trial | Axle",
    description: "Create your Axle account and start managing independent contractors with timesheets, invoices, and performance reviews. Free plan available.",
    canonical: "https://axle.run/signup",
  });

  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      organizationName: "",
    },
  });

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    const result = await register(data.firstName, data.lastName, data.email, data.password, data.organizationName);
    setIsLoading(false);

    if (result.success) {
      setLocation("/");
    } else {
      toast({
        title: "Registration failed",
        description: result.error || "Something went wrong. Please try again.",
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
            <em>without the spreadsheets.</em>
          </h2>
          <p className="text-[15px] text-gray-500 leading-relaxed mb-10 max-w-[360px]">
            Set up your organization in minutes. Invite contractors, configure approvals, and start tracking time on day one.
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
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight mb-1.5">Get started</h1>
          <p className="text-sm text-gray-500 mb-8">Set up your organization and start managing your team.</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-[18px]">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-medium text-gray-700">First name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          className="h-auto border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm text-gray-900"
                          {...field}
                          data-testid="input-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-medium text-gray-700">Last name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          className="h-auto border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm text-gray-900"
                          {...field}
                          data-testid="input-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-medium text-gray-700">Work email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@company.com"
                        className="h-auto border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm text-gray-900"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-medium text-gray-700">Organization name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Inc."
                        className="h-auto border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm text-gray-900"
                        {...field}
                        data-testid="input-organization"
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
                    <FormLabel className="text-[13px] font-medium text-gray-700">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="At least 6 characters"
                        className="h-auto border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-medium text-gray-700">Confirm password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat your password"
                        className="h-auto border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
                        {...field}
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={isLoading} data-testid="button-signup">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </Form>

          <p className="text-[12.5px] text-gray-400 text-center mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-primary font-medium no-underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
