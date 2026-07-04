import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", data);
    } finally {
      setIsLoading(false);
      // Always show the same success state, regardless of outcome — the
      // server intentionally returns a generic response either way so this
      // page can't be used to enumerate which emails have accounts.
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-[380px]">
        <a href="/" className="flex items-center gap-2.5 no-underline mb-8 justify-center">
          <span className="text-foreground text-lg font-bold tracking-tight">Axle</span>
        </a>

        {submitted ? (
          <div className="text-center space-y-4" data-testid="forgot-password-success">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an account with that email exists, we've sent a link to reset your password. The link expires in 1 hour.
            </p>
            <a href="/login" className="text-sm text-primary font-medium no-underline">
              Back to sign in
            </a>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1.5">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Enter your email and we'll send you a link to reset it.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-[18px]">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@company.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full" disabled={isLoading} data-testid="button-send-reset-link">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
              <a href="/login" className="text-primary font-medium no-underline">
                Back to sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
