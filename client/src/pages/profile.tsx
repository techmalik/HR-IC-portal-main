import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Bell, User, Lock } from "lucide-react";
import type { NotificationPreferences } from "@shared/schema";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

const profileFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  jobTitle: z.string().optional(),
  team: z.string().optional(),
  experienceLevel: z.number().min(1).max(7).optional(),
  contractorStatus: z.string().optional(),
  currency: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const EXPERIENCE_LEVELS = [
  { value: 1, label: "Level 1 - Entry" },
  { value: 2, label: "Level 2 - Junior" },
  { value: 3, label: "Level 3 - Mid-Level" },
  { value: 4, label: "Level 4 - Senior" },
  { value: 5, label: "Level 5 - Lead" },
  { value: 6, label: "Level 6 - Principal" },
  { value: 7, label: "Level 7 - Director" },
];

const CONTRACTOR_STATUS_OPTIONS = [
  { value: "engaged", label: "Engaged" },
  { value: "on_hold", label: "On Hold" },
  { value: "terminated", label: "Terminated" },
];

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordFormSchema>;

export default function ProfilePage() {
  const { user, updateUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: (user as any)?.username || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      jobTitle: user?.jobTitle || "",
      team: (user as any)?.team || "",
      experienceLevel: (user as any)?.experienceLevel || 1,
      contractorStatus: (user as any)?.contractorStatus || "engaged",
      currency: user?.currency || "USD",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PATCH", `/api/users/${user?.id}`, data);
    },
    onSuccess: async (response) => {
      const updatedUser = await response.json();
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      return apiRequest("PATCH", `/api/users/${user?.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      setIsEditingPassword(false);
      passwordForm.reset();
    },
    onError: (error: any) => {
      let message = "Failed to update password. Please try again.";
      try {
        const raw = error?.message || "";
        const jsonPart = raw.includes("{") ? raw.slice(raw.indexOf("{")) : "";
        if (jsonPart) {
          const parsed = JSON.parse(jsonPart);
          if (parsed.error) message = parsed.error;
        }
      } catch {}
      toast({
        title: message === "Current password is incorrect" ? "Incorrect password" : "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const getInitials = () => {
    if (!user) return "U";
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information</p>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-lg">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role === "ic" ? "Independent Contractor" : "Administrator"}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="w-full">
          <TabsTrigger value="profile" className="flex-1" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1" data-testid="tab-security">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Frontend Engineer, Product Designer"
                            {...field}
                            data-testid="input-job-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="team"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Engineering, Design, Product"
                            {...field}
                            data-testid="input-team"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="experienceLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience Level</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-experience-level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EXPERIENCE_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value.toString()}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="contractorStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contractor Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-contractor-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTRACTOR_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "USD"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code} data-testid={`option-currency-${c.code}`}>
                                {c.code} — {c.name} ({c.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingPassword ? (
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-current-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-new-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-confirm-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditingPassword(false);
                          passwordForm.reset();
                        }}
                        data-testid="button-cancel-password"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updatePasswordMutation.isPending}
                        data-testid="button-update-password"
                      >
                        {updatePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsEditingPassword(true)}
                  data-testid="button-change-password"
                >
                  Change Password
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
              <CardDescription>Your account details (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Username</span>
                <span className="font-medium" data-testid="text-username">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium" data-testid="text-role">{user?.role === "ic" ? "Independent Contractor" : "Administrator"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Account Status</span>
                <span className={`font-medium ${user?.isActive ? "text-emerald-600" : "text-red-600"}`} data-testid="text-status">
                  {user?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationPreferencesSection userId={user?.id || ""} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationPreferencesSection({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const { toast } = useToast();

  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/notification-preferences", { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/notification-preferences?userId=${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      return apiRequest("PATCH", "/api/notification-preferences", { userId, ...updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Choose which notifications you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">In-App Notifications</label>
              <p className="text-xs text-muted-foreground">Show notifications in the app</p>
            </div>
            <Switch
              checked={preferences?.inAppEnabled ?? true}
              onCheckedChange={(checked) => handleToggle("inAppEnabled", checked)}
              disabled={updateMutation.isPending}
              data-testid="switch-in-app"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Email Notifications</label>
              <p className="text-xs text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch
              checked={preferences?.emailEnabled ?? false}
              onCheckedChange={(checked) => handleToggle("emailEnabled", checked)}
              disabled={updateMutation.isPending}
              data-testid="switch-email"
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Notification Categories</h4>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">OOO Requests</label>
              <p className="text-xs text-muted-foreground">Leave request approvals and updates</p>
            </div>
            <Switch
              checked={preferences?.oooNotifications ?? true}
              onCheckedChange={(checked) => handleToggle("oooNotifications", checked)}
              disabled={updateMutation.isPending}
              data-testid="switch-ooo"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Timesheets</label>
              <p className="text-xs text-muted-foreground">Timesheet submissions and reviews</p>
            </div>
            <Switch
              checked={preferences?.timesheetNotifications ?? true}
              onCheckedChange={(checked) => handleToggle("timesheetNotifications", checked)}
              disabled={updateMutation.isPending}
              data-testid="switch-timesheets"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Overtime</label>
              <p className="text-xs text-muted-foreground">Overtime request approvals</p>
            </div>
            <Switch
              checked={preferences?.overtimeNotifications ?? true}
              onCheckedChange={(checked) => handleToggle("overtimeNotifications", checked)}
              disabled={updateMutation.isPending}
              data-testid="switch-overtime"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Invoices</label>
              <p className="text-xs text-muted-foreground">Invoice uploads and processing</p>
            </div>
            <Switch
              checked={preferences?.invoiceNotifications ?? true}
              onCheckedChange={(checked) => handleToggle("invoiceNotifications", checked)}
              disabled={updateMutation.isPending}
              data-testid="switch-invoices"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Deadline Reminders</label>
              <p className="text-xs text-muted-foreground">Reminders for upcoming deadlines</p>
            </div>
            <Switch
              checked={preferences?.deadlineReminders ?? true}
              onCheckedChange={(checked) => handleToggle("deadlineReminders", checked)}
              disabled={updateMutation.isPending}
              data-testid="switch-deadlines"
            />
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">System Alerts</label>
                <p className="text-xs text-muted-foreground">Critical system notifications (admin only)</p>
              </div>
              <Switch
                checked={preferences?.systemAlerts ?? true}
                onCheckedChange={(checked) => handleToggle("systemAlerts", checked)}
                disabled={updateMutation.isPending}
                data-testid="switch-system-alerts"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
