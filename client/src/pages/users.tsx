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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MoreHorizontal, KeyRound, Loader2, Search, Users, Upload, FileSpreadsheet, Pencil, Copy, Check, ShieldAlert, Ban, Plus } from "lucide-react";
import type { User } from "@shared/schema";
import { UserRole } from "@shared/schema";
import { useRef } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(10, "Password must be at least 10 characters"),
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
  const [generatedTempPassword, setGeneratedTempPassword] = useState<{ password: string; userName: string; emailSent: boolean } | null>(null);
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
        description: `Updated ${successCount} user(s). ${newFailedIds.size} update(s) failed, rows highlighted in red.`,
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
      return { tempPassword: data.tempPassword, emailSent: data.emailSent as boolean, userName: `${user.firstName} ${user.lastName}` };
    },
    onSuccess: (data) => {
      setUserToResetPassword(null);
      setGeneratedTempPassword({ password: data.tempPassword, userName: data.userName, emailSent: data.emailSent });
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

  // Users who show up as someone else's supervisor get the "Supervisor" role pill
  // instead of "Contractor" (this app has no dedicated supervisor role, it's derived
  // from having direct reports).
  const supervisorIds = new Set(
    (users || []).map((u) => u.supervisorId).filter((id): id is string => !!id)
  );

  const getRoleBadge = (u: User) => {
    if (u.role === "admin" || u.role === UserRole.OWNER) {
      return (
        <span className="text-[11.5px] font-medium bg-[#111827] text-white px-[9px] py-[3px] rounded-full whitespace-nowrap">
          {u.role === UserRole.OWNER ? "Owner" : "Admin"}
        </span>
      );
    }
    if (supervisorIds.has(u.id)) {
      return (
        <span className="text-[11.5px] font-medium bg-[#D1FAE5] text-[#065F46] px-[9px] py-[3px] rounded-full whitespace-nowrap">
          Supervisor
        </span>
      );
    }
    return (
      <span className="text-[11.5px] font-medium bg-[#F3F4F6] text-[#374151] px-[9px] py-[3px] rounded-full whitespace-nowrap">
        Contractor
      </span>
    );
  };

  const totalUsersCount = users?.length || 0;
  const contractorsCount = activeUsers.filter((u) => u.role === "ic" && !supervisorIds.has(u.id)).length;
  const supervisorsCount = activeUsers.filter((u) => supervisorIds.has(u.id)).length;

  const renderUserRow = (u: User) => {
    const editData = editedUsers.get(u.id);
    const hasFailed = failedUserIds.has(u.id);
    return (
      <TableRow
        key={u.id}
        data-testid={`user-row-${u.id}`}
        className={hasFailed ? "bg-[#FEF2F2]" : ""}
      >
        <TableCell>
          {isEditMode && editData ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={(u as any).avatarUrl || undefined} alt={`${editData.firstName} ${editData.lastName}`} />
                <AvatarFallback className="bg-[#111827] text-white text-xs font-semibold">
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
            <div className="flex items-center gap-2.5">
              <Avatar className="h-7 w-7">
                <AvatarImage src={(u as any).avatarUrl || undefined} alt={`${u.firstName} ${u.lastName}`} />
                <AvatarFallback className="bg-[#111827] text-white text-[9px] font-bold">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[12.5px] font-medium text-[#111827]">{u.firstName} {u.lastName}</p>
                <p className="text-[11.5px] text-[#9CA3AF]">{u.email}</p>
              </div>
            </div>
          )}
        </TableCell>
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
            <div className="flex items-center gap-1.5">
              {getRoleBadge(u)}
              {u.isDemo && (
                <span
                  className="text-[11.5px] font-medium bg-[#EDE9FE] text-[#6D28D9] px-[9px] py-[3px] rounded-full whitespace-nowrap"
                  data-testid={`badge-sample-${u.id}`}
                >
                  Sample
                </span>
              )}
            </div>
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
            <span className="text-[12.5px] text-[#374151]">
              {u.supervisorId
                ? supervisors?.find(s => s.id === u.supervisorId)?.firstName + " " + supervisors?.find(s => s.id === u.supervisorId)?.lastName
                : <span className="text-[#9CA3AF]">—</span>
              }
            </span>
          )}
        </TableCell>
        <TableCell>
          <StatusBadge status="active" />
        </TableCell>
        <TableCell>
          {!isEditMode && (
            <div className="flex gap-1.5 justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 gap-1 text-[11.5px] font-normal text-[#6B7280] bg-[#F9FAFB] border-[#E5E7EB] hover:bg-neutral-100"
                    data-testid={`button-actions-${u.id}`}
                  >
                    Edit
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!u.isDemo && (
                    <DropdownMenuItem
                      onClick={() => setUserToResetPassword(u)}
                      data-testid={`button-reset-password-${u.id}`}
                    >
                      <KeyRound className="w-4 h-4 mr-2" />
                      Reset Password
                    </DropdownMenuItem>
                  )}
                  {u.id !== currentUser?.id && !u.isDemo && (
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
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {u.id !== currentUser?.id && (
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-[11.5px] font-normal text-[#DC2626] bg-[#FEF2F2] border-0 hover:bg-red-100"
                  onClick={() => setUserToDelete(u)}
                  data-testid={`button-delete-${u.id}`}
                >
                  Remove
                </Button>
              )}
            </div>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-end gap-2">
          <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-bulk-upload">
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
              <Button size="sm" className="bg-[#111827] hover:bg-neutral-800 text-white" data-testid="button-add-user">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add user
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
                                {c.code} ({c.name})
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2">Total users</div>
          <div className="text-[26px] font-bold text-neutral-900 mb-0.5" data-testid="text-stat-total-users">{totalUsersCount}</div>
          <div className="text-xs text-neutral-500">{activeUsers.length} active</div>
        </div>
        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2">Contractors</div>
          <div className="text-[26px] font-bold text-neutral-900 mb-0.5" data-testid="text-stat-contractors">{contractorsCount}</div>
          <div className="text-xs text-neutral-500">independent contributors</div>
        </div>
        <div className="bg-white border-[1.5px] border-neutral-200 rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-neutral-400 tracking-[0.1em] uppercase mb-2">Supervisors</div>
          <div className="text-[26px] font-bold text-neutral-900 mb-0.5" data-testid="text-stat-supervisors">{supervisorsCount}</div>
          <div className="text-xs text-neutral-500">active</div>
        </div>
        <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] rounded-xl px-[18px] py-3.5">
          <div className="text-[9.5px] font-semibold text-[#92400E] tracking-[0.1em] uppercase mb-2">Suspended</div>
          <div className="text-[26px] font-bold text-[#92400E] mb-0.5" data-testid="text-stat-suspended">{suspendedUsers.length}</div>
          <div className="text-xs text-[#B45309]">cannot log in</div>
        </div>
      </div>

      <Card className="border-[1.5px] border-neutral-200 rounded-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-[13.5px] font-semibold text-neutral-900">All users</CardTitle>
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
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-neutral-300" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-56 h-8 text-[12.5px] bg-[#F9FAFB] border-[#E5E7EB]"
                  data-testid="input-search"
                  disabled={isEditMode}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter} disabled={isEditMode}>
                <SelectTrigger className="w-36 h-8 text-[12.5px] bg-[#F9FAFB] border-[#E5E7EB]" data-testid="select-role-filter">
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
          ) : activeUsers.length > 0 || suspendedUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                  <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Name</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Role</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Supervisor</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map(renderUserRow)}
                {suspendedUsers.map((u) => (
                  <TableRow key={u.id} data-testid={`suspended-user-row-${u.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-[#F9FAFB] border-[1.5px] border-dashed border-neutral-200 text-[#9CA3AF] text-[9px] font-bold">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[12.5px] font-medium text-[#9CA3AF]">{u.firstName} {u.lastName}</p>
                          <p className="text-[11.5px] text-[#D1D5DB]">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(u)}
                    </TableCell>
                    <TableCell>
                      <span className="text-[12.5px] text-[#9CA3AF]">
                        {u.supervisorId
                          ? supervisors?.find(s => s.id === u.supervisorId)?.firstName + " " + supervisors?.find(s => s.id === u.supervisorId)?.lastName
                          : "—"
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status="suspended" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 justify-end">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11.5px] font-normal text-[#059669] bg-[#ECFDF5] border-0 hover:bg-emerald-100"
                          onClick={() => restoreMutation.mutate(u.id)}
                          data-testid={`button-restore-${u.id}`}
                        >
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11.5px] font-normal text-[#DC2626] bg-[#FEF2F2] border-0 hover:bg-red-100"
                          onClick={() => setUserToDelete(u)}
                          data-testid={`button-delete-suspended-${u.id}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
              {generatedTempPassword?.emailSent
                ? " An email with the temporary password has been sent to the user."
                : " Please share this password securely with the user."}{" "}
              They will be required to change it on their next login.
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
