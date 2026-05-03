import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserPlus, MoreHorizontal, KeyRound, Trash2, Loader2, Search, Users, Upload, FileSpreadsheet, Pencil, Copy, Check, ShieldAlert, Ban, RotateCcw } from "lucide-react";
import type { User } from "@shared/schema";
import { UserRole } from "@shared/schema";
import { useRef } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Please select a role"),
  supervisorId: z.string().optional(),
  jobTitle: z.string().optional(),
  currency: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

type EditedUserData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  role: string;
  supervisorId: string;
  isActive: boolean;
  currency: string;
};

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedUsers, setEditedUsers] = useState<Map<string, EditedUserData>>(new Map());
  const [generatedTempPassword, setGeneratedTempPassword] = useState<{ password: string; userName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: supervisors } = useQuery<User[]>({
    queryKey: ["/api/users/supervisors"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      role: "ic",
      supervisorId: "",
      jobTitle: "",
      currency: "USD",
    },
  });

  const enterEditMode = () => {
    if (!users) return;
    const editMap = new Map<string, EditedUserData>();
    users.filter(u => u.isActive).forEach(u => {
      editMap.set(u.id, {
        id: u.id,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email,
        jobTitle: u.jobTitle || "",
        role: u.role,
        supervisorId: u.supervisorId || "",
        isActive: u.isActive,
        currency: (u as User & { currency?: string }).currency || "USD",
      });
    });
    setEditedUsers(editMap);
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setEditedUsers(new Map());
    setIsEditMode(false);
    setFailedUserIds(new Set());
  };

  const updateUserField = (userId: string, field: keyof EditedUserData, value: string | boolean) => {
    setEditedUsers(prev => {
      const next = new Map(prev);
      const userData = next.get(userId);
      if (userData) {
        next.set(userId, { ...userData, [field]: value });
      }
      return next;
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [failedUserIds, setFailedUserIds] = useState<Set<string>>(new Set());

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const saveChanges = async () => {
    if (!users) return;
    
    const changedUsers: EditedUserData[] = [];
    const validationErrors: string[] = [];
    
    editedUsers.forEach((editedData, userId) => {
      const originalUser = users.find(u => u.id === userId);
      if (!originalUser) return;
      
      const originalCurrency = (originalUser as User & { currency?: string }).currency || "USD";
      const hasChanges = 
        editedData.firstName !== (originalUser.firstName || "") ||
        editedData.lastName !== (originalUser.lastName || "") ||
        editedData.email !== originalUser.email ||
        editedData.jobTitle !== (originalUser.jobTitle || "") ||
        editedData.role !== originalUser.role ||
        editedData.supervisorId !== (originalUser.supervisorId || "") ||
        editedData.isActive !== originalUser.isActive ||
        editedData.currency !== originalCurrency;
      
      if (hasChanges) {
        if (editedData.supervisorId === userId) {
          validationErrors.push(`${editedData.firstName} ${editedData.lastName} cannot be their own supervisor.`);
          return;
        }
        if (!emailRegex.test(editedData.email)) {
          validationErrors.push(`${editedData.firstName} ${editedData.lastName} has an invalid email address.`);
          return;
        }
        changedUsers.push(editedData);
      }
    });
    
    if (validationErrors.length > 0) {
      toast({
        title: "Validation errors",
        description: validationErrors.join(" "),
        variant: "destructive",
      });
      return;
    }
    
    if (changedUsers.length === 0) {
      setIsEditMode(false);
      setEditedUsers(new Map());
      setFailedUserIds(new Set());
      return;
    }
    
    setIsSaving(true);
    let successCount = 0;
    const newFailedIds = new Set<string>();
    
    for (const userData of changedUsers) {
      try {
        await apiRequest("PATCH", `/api/users/${userData.id}`, {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          jobTitle: userData.jobTitle,
          role: userData.role,
          supervisorId: userData.supervisorId || undefined,
          isActive: userData.isActive,
          currency: userData.currency || "USD",
        });
        successCount++;
      } catch (error) {
        newFailedIds.add(userData.id);
        console.error(`Failed to update user ${userData.id}:`, error);
      }
    }
    
    setIsSaving(false);
    setFailedUserIds(newFailedIds);
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    
    if (newFailedIds.size > 0) {
      toast({
        title: "Partial save",
        description: `Updated ${successCount} user(s). ${newFailedIds.size} update(s) failed — rows highlighted in red.`,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Changes saved",
      description: `Successfully updated ${successCount} user(s).`,
    });
    
    setIsEditMode(false);
    setEditedUsers(new Map());
    setFailedUserIds(new Set());
  };

  const bulkUploadMutation = useMutation({
    mutationFn: async (users: Partial<UserFormData>[]) => {
      return apiRequest("POST", "/api/users/bulk", { users });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Users imported",
        description: "Users have been imported successfully.",
      });
      setIsCsvDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import users. Please check your CSV format.",
        variant: "destructive",
      });
    },
  });

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      toast({
        title: "Invalid CSV",
        description: "CSV must have a header row and at least one data row.",
        variant: "destructive",
      });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['firstname', 'lastname', 'email', 'username', 'password', 'role'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      toast({
        title: "Missing columns",
        description: `Missing required columns: ${missingHeaders.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    const usersToImport: Partial<UserFormData>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const user: any = {};
      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        if (header === 'firstname') user.firstName = value;
        else if (header === 'lastname') user.lastName = value;
        else if (header === 'email') user.email = value;
        else if (header === 'username') user.username = value;
        else if (header === 'password') user.password = value;
        else if (header === 'role') user.role = value.toLowerCase();
        else if (header === 'jobtitle') user.jobTitle = value;
        else if (header === 'supervisorid') user.supervisorId = value;
      });
      user.isActive = true;
      usersToImport.push(user);
    }

    if (usersToImport.length === 0) {
      toast({
        title: "No users found",
        description: "No valid users found in the CSV file.",
        variant: "destructive",
      });
      return;
    }

    bulkUploadMutation.mutate(usersToImport);
    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", {
        ...data,
        isActive: true,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User created",
        description: "New user has been added successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User removed",
        description: "User has been removed from the system.",
      });
      setUserToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (user: User) => {
      const response = await apiRequest("POST", `/api/users/${user.id}/reset-password`, undefined);
      const data = await response.json();
      return { tempPassword: data.tempPassword, userName: `${user.firstName} ${user.lastName}` };
    },
    onSuccess: (data) => {
      setUserToResetPassword(null);
      setGeneratedTempPassword({ password: data.tempPassword, userName: data.userName });
      setCopied(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PATCH", `/api/users/${userId}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User suspended",
        description: "The user's account has been suspended. They will no longer be able to log in.",
      });
      setUserToSuspend(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to suspend user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PATCH", `/api/users/${userId}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User restored",
        description: "The user's account has been restored and they can log in again.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const applyFilters = (userList: User[]) => userList.filter((u) => {
    const matchesSearch =
      u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeUsers = applyFilters(users?.filter(u => u.isActive) || []);
  const suspendedUsers = applyFilters(users?.filter(u => !u.isActive) || []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ic": return "Independent Contractor";
      case "admin": return "Administrator";
      default: return role;
    }
  };

  const renderUserRow = (u: User) => {
    const editData = editedUsers.get(u.id);
    const hasFailed = failedUserIds.has(u.id);
    return (
      <TableRow key={u.id} data-testid={`user-row-${u.id}`} className={hasFailed ? "border-l-2 border-l-red-500 bg-red-500/5" : ""}>
        <TableCell>
          {isEditMode && editData ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {editData.firstName?.[0]}{editData.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <Input
                    value={editData.firstName}
                    onChange={(e) => updateUserField(u.id, "firstName", e.target.value)}
                    placeholder="First name"
                    className="h-8 w-24"
                    data-testid={`input-firstname-${u.id}`}
                  />
                  <Input
                    value={editData.lastName}
                    onChange={(e) => updateUserField(u.id, "lastName", e.target.value)}
                    placeholder="Last name"
                    className="h-8 w-24"
                    data-testid={`input-lastname-${u.id}`}
                  />
                </div>
                <Input
                  value={editData.email}
                  onChange={(e) => updateUserField(u.id, "email", e.target.value)}
                  placeholder="Email"
                  className={`h-8 w-52 ${editData.email && !emailRegex.test(editData.email) ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  data-testid={`input-email-${u.id}`}
                />
                <Input
                  value={editData.jobTitle}
                  onChange={(e) => updateUserField(u.id, "jobTitle", e.target.value)}
                  placeholder="Job title"
                  className="h-8 w-52"
                  data-testid={`input-jobtitle-${u.id}`}
                />
                <Select
                  value={editData.currency}
                  onValueChange={(value) => updateUserField(u.id, "currency", value)}
                >
                  <SelectTrigger className="h-8 w-28" data-testid={`select-currency-${u.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{u.firstName} {u.lastName}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
                {u.jobTitle && <p className="text-xs text-muted-foreground">{u.jobTitle}</p>}
              </div>
            </div>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">{u.username}</TableCell>
        <TableCell>
          {isEditMode && editData ? (
            <Select
              value={editData.role}
              onValueChange={(value) => updateUserField(u.id, "role", value)}
            >
              <SelectTrigger className="h-8 w-32" data-testid={`select-role-${u.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ic">IC</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge status={u.role} />
          )}
        </TableCell>
        <TableCell>
          {isEditMode && editData ? (
            <Select
              value={editData.supervisorId || "none"}
              onValueChange={(value) => updateUserField(u.id, "supervisorId", value === "none" ? "" : value)}
            >
              <SelectTrigger className="h-8 w-36" data-testid={`select-supervisor-${u.id}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Supervisor</SelectItem>
                {supervisors?.filter(s => s.id !== u.id).map((supervisor) => (
                  <SelectItem key={supervisor.id} value={supervisor.id}>
                    {supervisor.firstName} {supervisor.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">
              {u.supervisorId
                ? supervisors?.find(s => s.id === u.supervisorId)?.firstName + " " + supervisors?.find(s => s.id === u.supervisorId)?.lastName
                : "-"
              }
            </span>
          )}
        </TableCell>
        <TableCell>
          <span className="text-sm text-emerald-600">Active</span>
        </TableCell>
        <TableCell>
          {!isEditMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-actions-${u.id}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setUserToResetPassword(u)}
                  data-testid={`button-reset-password-${u.id}`}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Reset Password
                </DropdownMenuItem>
                {u.id !== currentUser?.id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setUserToSuspend(u)}
                      className="text-amber-600 focus:text-amber-600"
                      data-testid={`button-suspend-${u.id}`}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Suspend User
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setUserToDelete(u)}
                      className="text-destructive focus:text-destructive"
                      data-testid={`button-delete-${u.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove User
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Add, edit, and manage system users
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-upload">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Bulk Import Users</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import multiple users at once
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Your CSV file should have the following columns:</p>
                  <code className="block p-3 bg-muted rounded-md text-xs">
                    firstName,lastName,email,username,password,role,jobTitle
                  </code>
                  <p className="text-xs">
                    Required: firstName, lastName, email, username, password, role<br/>
                    Optional: jobTitle, supervisorId<br/>
                    Role values: ic, admin
                  </p>
                </div>
                <div
                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload CSV file
                  </p>
                </div>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  data-testid="input-csv"
                />
                {bulkUploadMutation.isPending && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing users...
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user">
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account in the system
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-first-name" />
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
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-last-name" />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe" {...field} data-testid="input-username" />
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} data-testid="input-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Frontend Engineer" {...field} data-testid="input-job-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ic">Independent Contractor</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supervisorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supervisor (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-supervisor">
                                <SelectValue placeholder="Select supervisor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supervisors?.map((supervisor) => (
                                <SelectItem key={supervisor.id} value={supervisor.id}>
                                  {supervisor.firstName} {supervisor.lastName}
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
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "USD"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-new-user-currency">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code} — {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-create-user"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create User"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-base">All Users</CardTitle>
                <CardDescription>{activeUsers.length} active user{activeUsers.length !== 1 ? "s" : ""}</CardDescription>
              </div>
              {isEditMode ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditMode}
                    disabled={isSaving}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveChanges}
                    disabled={isSaving}
                    data-testid="button-save-edit"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={enterEditMode}
                  disabled={isLoading || !activeUsers.length}
                  data-testid="button-edit-mode"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search"
                  disabled={isEditMode}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter} disabled={isEditMode}>
                <SelectTrigger className="w-40" data-testid="select-role-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ic">ICs</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : activeUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map(renderUserRow)}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No users found</p>
              <p className="mt-1">
                {searchQuery || roleFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Add your first user to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {suspendedUsers.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Ban className="w-4 h-4" />
                Suspended Users
              </CardTitle>
              <CardDescription>
                {suspendedUsers.length} suspended account{suspendedUsers.length !== 1 ? "s" : ""} — these users cannot log in
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspendedUsers.map((u) => (
                  <TableRow key={u.id} data-testid={`suspended-user-row-${u.id}`} className="opacity-70">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                          {u.jobTitle && <p className="text-xs text-muted-foreground">{u.jobTitle}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.username}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.role} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {u.supervisorId
                          ? supervisors?.find(s => s.id === u.supervisorId)?.firstName + " " + supervisors?.find(s => s.id === u.supervisorId)?.lastName
                          : "-"
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-amber-600 dark:text-amber-400">Suspended</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-suspended-${u.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => restoreMutation.mutate(u.id)}
                            data-testid={`button-restore-${u.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setUserToDelete(u)}
                            className="text-destructive focus:text-destructive"
                            data-testid={`button-delete-suspended-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!userToSuspend} onOpenChange={() => setUserToSuspend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend {userToSuspend?.firstName} {userToSuspend?.lastName}?
              Their account will be blocked and they will not be able to log in. You can restore their access at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-suspend">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToSuspend && suspendMutation.mutate(userToSuspend.id)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="button-confirm-suspend"
            >
              {suspendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Suspend User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove {userToDelete?.firstName} {userToDelete?.lastName}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToResetPassword} onOpenChange={() => setUserToResetPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for {userToResetPassword?.firstName} {userToResetPassword?.lastName}?
              A temporary password will be generated that you can share with the user.
              They will be required to change it on their next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToResetPassword && resetPasswordMutation.mutate(userToResetPassword)}
              data-testid="button-confirm-reset"
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Reset Password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!generatedTempPassword} onOpenChange={() => setGeneratedTempPassword(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Temporary Password Generated
            </DialogTitle>
            <DialogDescription>
              A temporary password has been generated for {generatedTempPassword?.userName}.
              Please share this password securely with the user. They will be required to change it on their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Temporary Password</label>
              <div className="flex gap-2">
                <Input
                  value={generatedTempPassword?.password || ""}
                  readOnly
                  className="font-mono"
                  data-testid="input-temp-password"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (generatedTempPassword?.password) {
                      navigator.clipboard.writeText(generatedTempPassword.password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      toast({
                        title: "Copied",
                        description: "Password copied to clipboard",
                      });
                    }
                  }}
                  data-testid="button-copy-password"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
              Important: This password will only be shown once. Make sure to copy it before closing this dialog.
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setGeneratedTempPassword(null)} data-testid="button-close-temp-password">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
