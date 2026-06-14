import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Loader2,
  ClipboardList,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { Evaluation, User as UserType } from "@shared/schema";
import { EvaluationList } from "@/components/evaluations/evaluation-list";
import { EvaluationDetailView } from "@/components/evaluations/evaluation-detail-view";
import { getStatusBadge } from "@/components/evaluations/evaluation-status-config";

const createEvaluationSchema = z.object({
  icId: z.string().min(1, "Please select an IC"),
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
});

type CreateEvaluationFormData = z.infer<typeof createEvaluationSchema>;

const createSelfEvaluationSchema = z.object({
  managerId: z.string().min(1, "Please select a supervisor"),
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
});

type CreateSelfEvaluationFormData = z.infer<typeof createSelfEvaluationSchema>;

export default function EvaluationsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSelfEvalDialogOpen, setIsSelfEvalDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const { user, isSupervisor, isAdmin } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();

  const isManager = isAdmin || isSupervisor;
  const isIC = user?.role === "ic";
  const canHaveOwnEvaluations = isIC;

  const urlParams = new URLSearchParams(searchString);
  const viewParam = urlParams.get("view");

  const getDefaultTab = () => {
    if (viewParam === "my") return "my";
    if (viewParam === "team" && isManager) return "team";
    if (viewParam === "all" && isManager) return "all";
    return isIC ? "my" : "team";
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  useEffect(() => {
    if (viewParam) {
      if (viewParam === "my") setActiveTab("my");
      else if (viewParam === "team" && isManager) setActiveTab("team");
      else if (viewParam === "all" && isManager) setActiveTab("all");
    }
  }, [viewParam, isManager]);

  const { data: evaluations, isLoading, isFetching, refetch } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations"],
  });

  const { data: teamMembers } = useQuery<UserType[]>({
    queryKey: ["/api/team/members"],
  });

  const { data: allUsers } = useQuery<UserType[]>({
    queryKey: ["/api/users/basic"],
  });

  const { data: supervisors } = useQuery<UserType[]>({
    queryKey: ["/api/users/supervisors"],
  });

  const form = useForm<CreateEvaluationFormData>({
    resolver: zodResolver(createEvaluationSchema),
    defaultValues: { icId: "", periodStart: "", periodEnd: "" },
  });

  const selfEvalForm = useForm<CreateSelfEvaluationFormData>({
    resolver: zodResolver(createSelfEvaluationSchema),
    defaultValues: {
      managerId: user?.supervisorId || "",
      periodStart: "",
      periodEnd: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateEvaluationFormData) => {
      return apiRequest("POST", "/api/evaluations", {
        ...data,
        managerId: user?.id,
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      toast({ title: "Evaluation created", description: "Performance evaluation has been created." });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create evaluation. Please try again.", variant: "destructive" });
    },
  });

  const createSelfEvalMutation = useMutation({
    mutationFn: async (data: CreateSelfEvaluationFormData) => {
      return apiRequest("POST", "/api/evaluations", {
        ...data,
        icId: user?.id,
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      toast({
        title: "Self-evaluation started",
        description: "Your self-evaluation has been created. Fill it out and submit it to your supervisor.",
      });
      setIsSelfEvalDialogOpen(false);
      selfEvalForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create self-evaluation. Please try again.", variant: "destructive" });
    },
  });

  const getUserById = (id: string) => allUsers?.find((u) => u.id === id);

  const myEvaluations = evaluations?.filter((e) => e.icId === user?.id) || [];
  const managedEvaluations = evaluations?.filter((e) => e.managerId === user?.id) || [];
  const allEvaluationsList = isManager ? (evaluations || []) : myEvaluations;

  const pendingICAction = myEvaluations.filter((e) => e.status === "draft");
  const pendingManagerAction = managedEvaluations.filter((e) => e.status === "ic_submitted");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Performance Evaluations</h1>
          <p className="text-muted-foreground mt-1">
            {isManager ? "Create and manage performance reviews" : "View your performance evaluations"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-evaluations"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isManager && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-evaluation">
                  <Plus className="w-4 h-4 mr-2" />
                  New Evaluation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Performance Evaluation</DialogTitle>
                  <DialogDescription>
                    Start a new evaluation cycle for a team member
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="icId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Member</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-ic">
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teamMembers?.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.firstName} {member.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="periodStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period Start</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-period-start" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="periodEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period End</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-period-end" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Evaluation"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
          {isIC && (
            <Dialog open={isSelfEvalDialogOpen} onOpenChange={setIsSelfEvalDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant={isManager ? "outline" : "default"}
                  data-testid="button-start-self-evaluation"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Self-Evaluation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Start Self-Evaluation</DialogTitle>
                  <DialogDescription>
                    Begin a new self-evaluation that you'll complete and submit to your supervisor
                  </DialogDescription>
                </DialogHeader>
                <Form {...selfEvalForm}>
                  <form
                    onSubmit={selfEvalForm.handleSubmit((data) =>
                      createSelfEvalMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={selfEvalForm.control}
                      name="managerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supervisor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-supervisor">
                                <SelectValue placeholder="Select your supervisor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supervisors
                                ?.filter((s) => s.id !== user?.id)
                                .map((supervisor) => (
                                  <SelectItem key={supervisor.id} value={supervisor.id}>
                                    {supervisor.firstName} {supervisor.lastName}
                                    {supervisor.jobTitle && ` - ${supervisor.jobTitle}`}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={selfEvalForm.control}
                        name="periodStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period Start</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-self-eval-period-start"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={selfEvalForm.control}
                        name="periodEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period End</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-self-eval-period-end"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSelfEvalDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createSelfEvalMutation.isPending}>
                        {createSelfEvalMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Start Self-Evaluation"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {(pendingICAction.length > 0 || pendingManagerAction.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingICAction.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Action Required
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  You have {pendingICAction.length} evaluation(s) awaiting your self-assessment
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEvaluation(pendingICAction[0])}
                  data-testid="button-complete-self-eval"
                >
                  Complete Self-Evaluation
                </Button>
              </CardContent>
            </Card>
          )}
          {pendingManagerAction.length > 0 && isManager && (
            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  Pending Review ({pendingManagerAction.length})
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingManagerAction.slice(0, 3).map((evalItem) => {
                  const icUser = getUserById(evalItem.icId);
                  return (
                    <div
                      key={evalItem.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-background/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {icUser?.firstName?.[0]}
                            {icUser?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {icUser?.firstName} {icUser?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {icUser?.jobTitle || "IC"} |{" "}
                            {format(new Date(evalItem.periodStart), "MMM yyyy")} -{" "}
                            {format(new Date(evalItem.periodEnd), "MMM yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEvaluation(evalItem)}
                        data-testid={`button-review-evaluation-${evalItem.id}`}
                      >
                        Review
                      </Button>
                    </div>
                  );
                })}
                {pendingManagerAction.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{pendingManagerAction.length - 3} more pending
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : selectedEvaluation ? (
        <EvaluationDetailView
          evaluation={selectedEvaluation}
          onBack={() => setSelectedEvaluation(null)}
          currentUser={user!}
          getUserById={getUserById}
        />
      ) : viewParam === "my" || (isIC && !isManager) ? (
        <Card>
          <CardContent className="pt-6">
            <EvaluationList
              evaluations={myEvaluations}
              onSelect={setSelectedEvaluation}
              getUserById={getUserById}
              getStatusBadge={getStatusBadge}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="team">Team Evaluations</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <EvaluationList
              evaluations={activeTab === "team" ? managedEvaluations : allEvaluationsList}
              onSelect={setSelectedEvaluation}
              getUserById={getUserById}
              getStatusBadge={getStatusBadge}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
