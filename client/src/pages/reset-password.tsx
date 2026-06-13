import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Layers } from "lucide-react";

const schema = z.object({
  newPassword: z.string().min(12, "Password must be at least 12 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      toast({ title: "Invalid link", description: "No reset token found in URL.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Reset failed", description: body.error ?? "Please try again.", variant: "destructive" });
      } else {
        setDone(true);
      }
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-xl mb-4 bg-primary flex items-center justify-center">
            <Layers className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">TeamFlow</h1>
          <p className="text-muted-foreground mt-1">Set a new password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription>
              Must be at least 12 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your password has been reset. You can now log in with your new password.
                </p>
                <a href="/login" className="text-sm text-primary hover:underline font-medium">
                  Go to login
                </a>
              </div>
            ) : !token ? (
              <p className="text-sm text-destructive">
                This link is invalid or expired. <a href="/forgot-password" className="underline">Request a new one</a>.
              </p>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="At least 12 characters"
                            autoComplete="new-password"
                            {...field}
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
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Repeat your new password"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Set new password"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
