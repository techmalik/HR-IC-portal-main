import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Plus, CalendarIcon, Loader2, Clock, Edit2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OOORequest, User } from "@shared/schema";
import { OnboardingTour, oooTourConfig } from "@/components/onboarding-tour";

const today = startOfDay(new Date());

const oooFormSchema = z.object({
  startDate: z.date({ required_error: "Start date is required" }).refine(
    (d) => d >= today,
    { message: "Start date cannot be in the past" }
  ),
  endDate: z.date({ required_error: "End date is required" }),
  managerId: z.string().min(1, "Please select a manager"),
  oooType: z.enum(["full_day", "half_day"]),
  reason: z.string().optional().default(""),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type OOOFormData = z.infer<typeof oooFormSchema>;

const REASON_MAX = 500;

export default function OOORequestsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<OOORequest | null>(null);
  const [showTour, setShowTour] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { user, sessionToken, updateUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const completedOnboarding = (user.completedOnboarding as Record<string, boolean>) || {};
    if (completedOnboarding.ooo !== true) {
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const { data: requests, isLoading, isFetching, refetch } = useQuery<OOORequest[]>({
    queryKey: ["/api/ooo-requests", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/ooo-requests?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("mentalyc_session_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: managers } = useQuery<User[]>({
    queryKey: ["/api/users/managers"],
  });

  const form = useForm<OOOFormData>({
    resolver: zodResolver(oooFormSchema),
    defaultValues: {
      reason: "",
      managerId: user?.supervisorId || "",
      oooType: "full_day",
    },
  });

  const reasonValue = form.watch("reason") || "";

  const createMutation = useMutation({
    mutationFn: async (data: OOOFormData) => {
      return apiRequest("POST", "/api/ooo-requests", {
        ...data,
        userId: user?.id,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        oooType: data.oooType,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ooo-requests"] });
      toast({
        title: "Request submitted",
        description: "Your out of office request has been submitted for approval.",
      });
      setIsDialogOpen(false);
      form.reset();
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OOOFormData & { id: string }) => {
      return apiRequest("PATCH", `/api/ooo-requests/${data.id}`, {
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        managerId: data.managerId,
        oooType: data.oooType,
        reason: data.reason,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ooo-requests"] });
      toast({
        title: "Request updated",
        description: "Your out of office request has been updated and resubmitted for approval.",
      });
      setIsDialogOpen(false);
      setEditingRequest(null);
      form.reset();
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OOOFormData) => {
    if (editingRequest) {
      updateMutation.mutate({ ...data, id: editingRequest.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditRequest = (request: OOORequest) => {
    setEditingRequest(request);
    form.reset({
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      managerId: request.managerId,
      oooType: request.oooType as "full_day" | "half_day",
      reason: request.reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleNewRequest = () => {
    setEditingRequest(null);
    form.reset({
      reason: "",
      managerId: user?.supervisorId || "",
      oooType: "full_day",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRequest(null);
    form.reset();
  };

  const isEditingRejected = editingRequest?.status === "rejected";

  const sortedRequests = requests?.sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Out of Office Requests</h1>
          <p className="text-muted-foreground mt-1">
            Request time off and view your OOO history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-ooo"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button onClick={handleNewRequest} data-testid="tour-target-ooo-new">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingRequest
                  ? isEditingRejected
                    ? "Resubmit Request"
                    : "Edit Request"
                  : "Request Time Off"}
              </DialogTitle>
              <DialogDescription>
                {editingRequest 
                  ? "Update your out of office request. Changes will reset approval status."
                  : "Submit a new out of office request for manager approval"
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="input-start-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < today}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="input-end-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < today}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="oooType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Leave Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                          data-testid="radio-ooo-type"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="full_day" id="full_day" />
                            <label htmlFor="full_day" className="text-sm font-medium cursor-pointer">
                              Full Day (8 hours blocked)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="half_day" id="half_day" />
                            <label htmlFor="half_day" className="text-sm font-medium cursor-pointer">
                              Half Day (4 hours max)
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approving Manager</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-manager">
                            <SelectValue placeholder="Select a manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {managers?.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.firstName} {manager.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the reason for your time off..."
                          className="resize-none"
                          rows={3}
                          maxLength={REASON_MAX}
                          {...field}
                          data-testid="input-reason"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground text-right">
                        {reasonValue.length} / {REASON_MAX}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-request"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingRequest ? "Saving..." : "Submitting..."}
                      </>
                    ) : editingRequest ? (
                      isEditingRejected ? "Resubmit Request" : "Update Request"
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : sortedRequests.length > 0 ? (
        <Card data-testid="tour-target-ooo-list" ref={listRef}>
          <CardHeader>
            <CardTitle className="text-base">All Requests</CardTitle>
            <CardDescription>Your out of office request history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedRequests.map((request, index) => {
                const bgClass = request.status === "approved" 
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : request.status === "rejected"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-amber-500/5 border-amber-500/20";

                return (
                  <div
                    key={request.id}
                    className={`flex items-center justify-between p-4 rounded-md border ${bgClass}`}
                    data-testid={`request-${request.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {format(new Date(request.startDate), "MMM d")} -{" "}
                          {format(new Date(request.endDate), "MMM d, yyyy")}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {request.oooType === "half_day" ? "Half Day" : "Full Day"}
                        </Badge>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {request.reason}
                        </p>
                      )}
                      {request.reviewNote && request.status === "rejected" && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                          Note: {request.reviewNote}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2" data-testid={index === 0 ? "tour-target-ooo-status" : undefined}>
                      <StatusBadge status={request.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRequest(request)}
                        data-testid={`button-edit-${request.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="tour-target-ooo-list" ref={listRef}>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground" data-testid="tour-target-ooo-status">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No time off requests yet</p>
              <p className="mt-1">Submit your first request to get started</p>
              <Button
                className="mt-4"
                onClick={handleNewRequest}
                data-testid="button-first-request"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {showTour && (
        <OnboardingTour
          tourId="ooo"
          steps={oooTourConfig.steps}
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}
    </div>
  );
}
