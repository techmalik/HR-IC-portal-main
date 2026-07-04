import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  Star, Plus, Loader2, Send, FileText, CheckCircle2, 
  ClipboardList, User, Calendar, ChevronRight, AlertCircle,
  ChevronDown, Hash, Briefcase, Users, Award, RefreshCw
} from "lucide-react";
import type { Evaluation, EvaluationSection, IcResponsibility, User as UserType } from "@shared/schema";
import { SENIORITY_SCALE, EVALUATION_OUTCOMES } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RATING_LABELS = [
  { value: 1, label: "Unsatisfactory", color: "bg-red-500" },
  { value: 2, label: "Needs Improvement", color: "bg-orange-500" },
  { value: 3, label: "Meets Expectations", color: "bg-yellow-500" },
  { value: 4, label: "Exceeds Expectations", color: "bg-emerald-500" },
  { value: 5, label: "Exceptional", color: "bg-green-600" },
];

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

  // In 2-role system: admins are managers, ICs with direct reports are also managers
  const isManager = isAdmin || isSupervisor;
  const isIC = user?.role === "ic";
  // All ICs can have their own evaluations (including those with direct reports)
  const canHaveOwnEvaluations = isIC;
  
  // Parse view from URL query parameter
  const urlParams = new URLSearchParams(searchString);
  const viewParam = urlParams.get("view");
  
  // Determine default tab based on URL param or user role
  const getDefaultTab = () => {
    if (viewParam === "my") return "my";
    if (viewParam === "team" && isManager) return "team";
    if (viewParam === "all" && isManager) return "all";
    return isIC ? "my" : "team";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  
  // Update tab when URL changes
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
    defaultValues: {
      icId: "",
      periodStart: "",
      periodEnd: "",
    },
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
      toast({
        title: "Evaluation created",
        description: "Performance evaluation has been created.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create evaluation. Please try again.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to create self-evaluation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getUserById = (id: string) => allUsers?.find((u) => u.id === id);

  const myEvaluations = evaluations?.filter((e) => e.icId === user?.id) || [];
  const managedEvaluations = evaluations?.filter((e) => e.managerId === user?.id) || [];
  const allEvaluationsList = isManager ? (evaluations || []) : myEvaluations;

  const pendingICAction = myEvaluations.filter((e) => e.status === "draft");
  const pendingManagerAction = managedEvaluations.filter((e) => e.status === "ic_submitted");
  const completedCount = allEvaluationsList.filter((e) => e.status === "completed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-[22px] font-normal text-foreground mb-1">Evaluations</h1>
          <p className="text-[13px] text-muted-foreground">
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
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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
                <Button variant={isManager ? "outline" : "default"} data-testid="button-start-self-evaluation">
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
                  <form onSubmit={selfEvalForm.handleSubmit((data) => createSelfEvalMutation.mutate(data))} className="space-y-4">
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
                              {supervisors?.filter(s => s.id !== user?.id).map((supervisor) => (
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
                              <Input type="date" {...field} data-testid="input-self-eval-period-start" />
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
                              <Input type="date" {...field} data-testid="input-self-eval-period-end" />
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
          <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Total evaluations</div>
          <div className="text-[26px] font-bold text-foreground leading-none">{allEvaluationsList.length}</div>
          <div className="text-xs mt-1.5 font-medium text-muted-foreground">all time</div>
        </div>
        <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
          <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Completed</div>
          <div className="text-[26px] font-bold text-foreground leading-none">{completedCount}</div>
          <div className="text-xs mt-1.5 font-medium text-[#059669]">finalized</div>
        </div>
        <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
          <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Awaiting your input</div>
          <div className="text-[26px] font-bold text-foreground leading-none">{pendingICAction.length}</div>
          <div className="text-xs mt-1.5 font-medium text-[#D97706]">{pendingICAction.length > 0 ? "self-assessment due" : "all clear"}</div>
        </div>
        <div className="bg-card border-[1.5px] border-card-border rounded-xl px-5 py-4">
          <div className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-2">Awaiting your review</div>
          <div className="text-[26px] font-bold text-foreground leading-none">{pendingManagerAction.length}</div>
          <div className="text-xs mt-1.5 font-medium text-[#D97706]">{pendingManagerAction.length > 0 ? "manager review due" : "all clear"}</div>
        </div>
      </div>

      {(pendingICAction.length > 0 || pendingManagerAction.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingICAction.length > 0 && (
            <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] rounded-xl">
              <div className="px-5 pt-4 pb-1 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#D97706]" />
                <span className="text-[13.5px] font-semibold text-foreground">Action required</span>
              </div>
              <div className="px-5 pb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  You have {pendingICAction.length} evaluation(s) awaiting your self-assessment.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEvaluation(pendingICAction[0])}
                  data-testid="button-complete-self-eval"
                >
                  Complete Self-Evaluation
                </Button>
              </div>
            </div>
          )}
          {pendingManagerAction.length > 0 && isManager && (
            <div className="bg-card border-[1.5px] border-card-border rounded-xl">
              <div className="px-5 pt-4 pb-1 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                <span className="text-[13.5px] font-semibold text-foreground">Pending review ({pendingManagerAction.length})</span>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {pendingManagerAction.slice(0, 3).map((evalItem) => {
                  const icUser = getUserById(evalItem.icId);
                  return (
                    <div key={evalItem.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#111827] text-white text-xs">
                            {icUser?.firstName?.[0]}{icUser?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{icUser?.firstName} {icUser?.lastName}</p>
                          <p className="text-xs text-muted-foreground">
                            {icUser?.jobTitle || "IC"}, {format(new Date(evalItem.periodStart), "MMM yyyy")} to {format(new Date(evalItem.periodEnd), "MMM yyyy")}
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
              </div>
            </div>
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
      ) : (viewParam === "my" || (isIC && !isManager)) ? (
        <EvaluationList
          evaluations={myEvaluations}
          onSelect={setSelectedEvaluation}
          getUserById={getUserById}
        />
      ) : (
        <div className="space-y-3.5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="team">Team Evaluations</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <EvaluationList
            evaluations={
              activeTab === "team" ? managedEvaluations :
              allEvaluationsList
            }
            onSelect={setSelectedEvaluation}
            getUserById={getUserById}
          />
        </div>
      )}
    </div>
  );
}

function EvaluationList({
  evaluations,
  onSelect,
  getUserById,
}: {
  evaluations: Evaluation[];
  onSelect: (e: Evaluation) => void;
  getUserById: (id: string) => UserType | undefined;
}) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-xl border-[1.5px] border-card-border text-center py-12 text-muted-foreground">
        <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No evaluations yet</p>
        <p className="mt-1">Evaluations will appear here once created</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-[1.5px] border-card-border overflow-hidden">
      {evaluations.map((evaluation, index) => {
        const ic = getUserById(evaluation.icId);
        const manager = getUserById(evaluation.managerId);
        return (
          <div
            key={evaluation.id}
            className={cn(
              "px-5 py-3.5 hover-elevate cursor-pointer flex items-center justify-between gap-4 border-b border-border last:border-b-0",
              index % 2 === 1 && "bg-[#FAFAFA] dark:bg-white/[0.02]"
            )}
            onClick={() => onSelect(evaluation)}
            data-testid={`evaluation-${evaluation.id}`}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[#111827] text-white">
                  {ic?.firstName?.[0]}{ic?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{ic?.firstName} {ic?.lastName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(new Date(evaluation.periodStart), "MMM d, yyyy")} to {format(new Date(evaluation.periodEnd), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {evaluation.status === "completed" && evaluation.overallScore && (
                <Badge variant="outline" className="gap-1">
                  <Star className="w-3 h-3" />
                  {evaluation.overallScore}/5
                </Badge>
              )}
              {evaluation.status === "completed" && evaluation.outcomes && evaluation.outcomes.length > 0 && (
                <>
                  {evaluation.outcomes.slice(0, 2).map(outcomeValue => {
                    const outcome = EVALUATION_OUTCOMES.find(o => o.value === outcomeValue);
                    return outcome ? (
                      <Badge key={outcomeValue} variant="secondary" className="text-xs" data-testid={`badge-list-outcome-${outcomeValue}`}>
                        {outcome.label}
                      </Badge>
                    ) : null;
                  })}
                  {evaluation.outcomes.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{evaluation.outcomes.length - 2}
                    </Badge>
                  )}
                </>
              )}
              <StatusBadge status={evaluation.status} />
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EvaluationDetailView({
  evaluation,
  onBack,
  currentUser,
  getUserById,
}: {
  evaluation: Evaluation;
  onBack: () => void;
  currentUser: UserType;
  getUserById: (id: string) => UserType | undefined;
}) {
  const { toast } = useToast();
  const ic = getUserById(evaluation.icId);
  const manager = getUserById(evaluation.managerId);

  const { data: sections, isLoading: sectionsLoading } = useQuery<EvaluationSection[]>({
    queryKey: ["/api/evaluations", evaluation.id, "sections"],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations/${evaluation.id}/sections`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch sections");
      return res.json();
    },
  });

  const { data: responsibilities } = useQuery<IcResponsibility[]>({
    queryKey: ["/api/ic-responsibilities", { icId: evaluation.icId }],
    queryFn: async () => {
      const res = await fetch(`/api/ic-responsibilities/${evaluation.icId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch responsibilities");
      return res.json();
    },
  });

  const { data: lastEvaluation } = useQuery<Evaluation | null>({
    queryKey: ["/api/users", evaluation.icId, "last-evaluation"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${evaluation.icId}/last-evaluation`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  const { data: lastEvaluationSections } = useQuery<EvaluationSection[]>({
    queryKey: ["/api/evaluations", lastEvaluation?.id, "sections"],
    enabled: !!lastEvaluation?.id && lastEvaluation.id !== evaluation.id,
    queryFn: async () => {
      const response = await fetch(`/api/evaluations/${lastEvaluation!.id}/sections`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const updateSectionsMutation = useMutation({
    mutationFn: async (updates: { sections: Partial<EvaluationSection>[] }) => {
      return apiRequest("POST", `/api/evaluations/${evaluation.id}/sections/bulk-update`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations", evaluation.id, "sections"] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/evaluations/${evaluation.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      toast({
        title: "Evaluation updated",
        description: "Your changes have been saved.",
      });
      onBack();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update evaluation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Finalize mutation - saves all sections and evaluation data in one call (no save draft required)
  const finalizeMutation = useMutation({
    mutationFn: async (finalizeAs: "ic" | "manager") => {
      const sortedSections = sections ? [...sections].sort((a, b) => a.sectionNumber - b.sectionNumber) : [];
      const sectionUpdates = sortedSections.map(section => {
        const data = sectionData[section.id] || {};
        if (finalizeAs === "ic") {
          return {
            id: section.id,
            selfRating: data.selfRating ?? section.selfRating,
            selfDocumentation: data.selfDocumentation ?? section.selfDocumentation,
            improvementGoal: data.improvementGoal ?? section.improvementGoal,
          };
        } else {
          return {
            id: section.id,
            managerRating: data.managerRating ?? section.managerRating,
            managerFeedback: data.managerFeedback ?? section.managerFeedback,
            founderFeedback: data.founderFeedback ?? section.founderFeedback,
          };
        }
      });

      const evaluationUpdates: Record<string, any> = {};
      if (finalizeAs === "manager") {
        evaluationUpdates.expectationsForNextReview = expectationsForNextReview;
        evaluationUpdates.managerSummary = managerSummary;
        evaluationUpdates.newExperienceLevel = newExperienceLevel;
        evaluationUpdates.outcomes = outcomes;
      }

      return apiRequest("POST", `/api/evaluations/${evaluation.id}/finalize`, {
        sections: sectionUpdates,
        evaluationUpdates,
        finalizeAs,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations", evaluation.id, "sections"] });
      toast({
        title: "Evaluation submitted",
        description: "Your evaluation has been finalized.",
      });
      onBack();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit evaluation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [expectationsForNextReview, setExpectationsForNextReview] = useState(evaluation.expectationsForNextReview || "");
  const [managerSummary, setManagerSummary] = useState(evaluation.managerSummary || "");
  const [newExperienceLevel, setNewExperienceLevel] = useState(evaluation.newExperienceLevel || ic?.experienceLevel || 1);
  const [seniorityScaleOpen, setSeniorityScaleOpen] = useState(false);
  const [outcomes, setOutcomes] = useState<string[]>(evaluation.outcomes || []);

  const isICOwner = currentUser.id === evaluation.icId;
  const isManagerOwner = currentUser.id === evaluation.managerId;
  const canICEdit = isICOwner && evaluation.status === "draft";
  const canManagerEdit = isManagerOwner && (evaluation.status === "ic_submitted" || evaluation.status === "manager_submitted");
  const isCompleted = evaluation.status === "completed";

  // Calculate completion based on current editing mode
  const completedSections = sections?.filter((s) => {
    if (canICEdit) {
      // IC is editing - check if IC fields are filled
      return s.selfRating && s.selfDocumentation;
    } else if (canManagerEdit) {
      // Manager is editing - check if Manager fields are filled
      return s.managerRating && s.managerFeedback;
    }
    // For completed or view-only, count sections with both IC and manager data
    return (s.selfRating && s.selfDocumentation) && (s.managerRating && s.managerFeedback);
  }).length || 0;
  const totalSections = sections?.length || 6;
  const progressPercent = (completedSections / totalSections) * 100;

  // Sort sections by sectionNumber for sequential display
  const sortedSections = sections ? [...sections].sort((a, b) => a.sectionNumber - b.sectionNumber) : [];

  const updateEvaluationMutation = useMutation({
    mutationFn: async (updates: Partial<Evaluation>) => {
      return apiRequest("PATCH", `/api/evaluations/${evaluation.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      toast({
        title: "Saved",
        description: "Evaluation details updated.",
      });
    },
  });

  const handleSaveManagerFields = () => {
    updateEvaluationMutation.mutate({
      expectationsForNextReview,
      managerSummary,
      newExperienceLevel,
    });
  };

  // Collect all section data for bulk save
  const [sectionData, setSectionData] = useState<Record<string, {
    selfRating: number;
    selfDocumentation: string;
    improvementGoal: string;
    managerRating: number;
    managerFeedback: string;
    founderFeedback: string;
  }>>({});

  const handleSectionChange = (sectionId: string, field: string, value: string | number) => {
    setSectionData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value,
      },
    }));
  };

  const handleSaveAllSections = () => {
    const updates = sortedSections.map(section => {
      const data = sectionData[section.id] || {};
      if (canICEdit) {
        return {
          id: section.id,
          selfRating: data.selfRating ?? section.selfRating,
          selfDocumentation: data.selfDocumentation ?? section.selfDocumentation,
          improvementGoal: data.improvementGoal ?? section.improvementGoal,
        };
      } else if (canManagerEdit) {
        return {
          id: section.id,
          managerRating: data.managerRating ?? section.managerRating,
          managerFeedback: data.managerFeedback ?? section.managerFeedback,
          founderFeedback: data.founderFeedback ?? section.founderFeedback,
        };
      }
      return { id: section.id };
    });
    updateSectionsMutation.mutate({ sections: updates });
  };

  const saveDraftButton = (
    <Button
      variant="outline"
      onClick={handleSaveAllSections}
      disabled={updateSectionsMutation.isPending}
      data-testid="button-save-draft"
    >
      {updateSectionsMutation.isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <FileText className="w-4 h-4 mr-2" />
      )}
      Save Draft
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={onBack} data-testid="button-back">
          Back to list
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {isCompleted && (
            <>
              <Badge variant="default" className="gap-1 bg-[#059669]">
                <CheckCircle2 className="w-3 h-3" />
                Finalized
              </Badge>
              {evaluation.overallScore && (
                <Badge variant="outline" className="gap-1">
                  <Star className="w-3 h-3" />
                  Score: {evaluation.overallScore}/5
                </Badge>
              )}
              {evaluation.outcomes && evaluation.outcomes.length > 0 && (
                <>
                  {evaluation.outcomes.map(outcomeValue => {
                    const outcome = EVALUATION_OUTCOMES.find(o => o.value === outcomeValue);
                    return outcome ? (
                      <Badge key={outcomeValue} variant="secondary" data-testid={`badge-outcome-display-${outcomeValue}`}>
                        {outcome.label}
                      </Badge>
                    ) : null;
                  })}
                </>
              )}
            </>
          )}
          {(canICEdit || canManagerEdit) && saveDraftButton}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-[#111827] text-white">
                  {ic?.firstName?.[0]}{ic?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{ic?.firstName} {ic?.lastName}</CardTitle>
                <CardDescription>{ic?.jobTitle || "Independent Contractor"}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={evaluation.status} />
              <Badge variant="outline">
                {format(new Date(evaluation.periodStart), "MMM yyyy")} - {format(new Date(evaluation.periodEnd), "MMM yyyy")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Last Eval Score</span>
                <p className="font-medium">{lastEvaluation?.overallManagerRating?.toFixed(1) || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Experience Level</span>
                <p className="font-medium">{ic?.experienceLevel || 1} / 7</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Last Eval Date</span>
                <p className="font-medium">{lastEvaluation ? format(new Date(lastEvaluation.completedAt || lastEvaluation.createdAt), "MMM d, yyyy") : "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Last Eval Period</span>
                <p className="font-medium">{lastEvaluation ? `${format(new Date(lastEvaluation.periodStart), "MMM yyyy")} - ${format(new Date(lastEvaluation.periodEnd), "MMM yyyy")}` : "N/A"}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Role</span>
                <p className="font-medium">{ic?.jobTitle || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Direct Manager</span>
                <p className="font-medium">{manager?.firstName} {manager?.lastName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Team</span>
                <p className="font-medium">{ic?.team || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Contractor Status</span>
                <Badge variant="outline" className="capitalize">{ic?.contractorStatus || "engaged"}</Badge>
              </div>
            </div>
          </div>

          {responsibilities && responsibilities.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Agreed Responsibilities</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {responsibilities.map((r) => (
                    <li key={r.id}>{r.responsibility}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Completion Progress</span>
              <span className="font-medium">{completedSections}/{totalSections} sections</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Collapsible open={seniorityScaleOpen} onOpenChange={setSeniorityScaleOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover-elevate">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Seniority Scale Reference
                </CardTitle>
                <ChevronDown className={`w-4 h-4 transition-transform ${seniorityScaleOpen ? "rotate-180" : ""}`} />
              </div>
              <CardDescription>7-level competency guide for experience level assessment</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Level</TableHead>
                      <TableHead>Review Dependency</TableHead>
                      <TableHead>Scope Ownership</TableHead>
                      <TableHead>Deadline Ownership</TableHead>
                      <TableHead>Collaboration & Leadership</TableHead>
                      <TableHead>Input Required</TableHead>
                      <TableHead>Value Creation Awareness</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SENIORITY_SCALE.map((level) => (
                      <TableRow key={level.level} className={ic?.experienceLevel === level.level ? "bg-primary/10" : ""}>
                        <TableCell className="font-medium">{level.level}</TableCell>
                        <TableCell className="text-xs">{level.reviewDependency}</TableCell>
                        <TableCell className="text-xs">{level.scopeOwnership}</TableCell>
                        <TableCell className="text-xs">{level.deadlineOwnership}</TableCell>
                        <TableCell className="text-xs">{level.collaborationLeadership}</TableCell>
                        <TableCell className="text-xs">{level.inputRequired}</TableCell>
                        <TableCell className="text-xs">{level.valueCreationAwareness}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {sectionsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSections.map((section, index) => {
            const prevSection = lastEvaluationSections?.find(s => s.sectionNumber === section.sectionNumber);
            return (
              <EvaluationSectionCard
                key={section.id}
                section={section}
                displayNumber={index + 1}
                previousSection={prevSection}
                canICEdit={canICEdit}
                canManagerEdit={canManagerEdit}
                sectionData={sectionData[section.id]}
                onFieldChange={(field, value) => handleSectionChange(section.id, field, value)}
              />
            );
          })}
        </div>
      )}

      {(canManagerEdit || isCompleted) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manager Summary & Next Steps</CardTitle>
            <CardDescription>Overall assessment and expectations for the next review period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Manager Summary</label>
              <Textarea
                placeholder="Provide an overall summary of the IC's performance during this period..."
                value={managerSummary}
                onChange={(e) => setManagerSummary(e.target.value)}
                disabled={!canManagerEdit}
                className="resize-none min-h-[100px]"
                data-testid="input-manager-summary"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Expectations by the Next Review</label>
              <Textarea
                placeholder="What should the IC focus on? What improvements are expected? What goals should be achieved by the next evaluation?"
                value={expectationsForNextReview}
                onChange={(e) => setExpectationsForNextReview(e.target.value)}
                disabled={!canManagerEdit}
                className="resize-none min-h-[120px]"
                data-testid="input-expectations"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <label className="text-sm font-medium">New Experience Level Assignment</label>
              <p className="text-sm text-muted-foreground">
                Current level: {ic?.experienceLevel || 1} / 7. Use the Seniority Scale reference above to assign the appropriate level.
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                  <button
                    key={level}
                    type="button"
                    disabled={!canManagerEdit}
                    onClick={() => setNewExperienceLevel(level)}
                    className={`
                      w-10 h-10 rounded-md text-sm font-medium transition-all
                      ${newExperienceLevel === level 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover-elevate"
                      }
                      ${!canManagerEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    data-testid={`button-level-${level}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <label className="text-sm font-medium">Evaluation Outcomes</label>
              <p className="text-sm text-muted-foreground">
                Select the outcomes resulting from this evaluation. Multiple selections allowed.
              </p>
              <div className="flex flex-wrap gap-2">
                {EVALUATION_OUTCOMES.map((outcome) => {
                  const isSelected = outcomes.includes(outcome.value);
                  return (
                    <button
                      key={outcome.value}
                      type="button"
                      disabled={!canManagerEdit}
                      onClick={() => {
                        if (isSelected) {
                          setOutcomes(outcomes.filter(o => o !== outcome.value));
                        } else {
                          setOutcomes([...outcomes, outcome.value]);
                        }
                      }}
                      className={`
                        px-3 py-1.5 rounded-md text-sm transition-all
                        ${isSelected 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted hover-elevate"
                        }
                        ${!canManagerEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      data-testid={`button-outcome-${outcome.value}`}
                    >
                      {outcome.label}
                    </button>
                  );
                })}
              </div>
              {outcomes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {outcomes.map(outcomeValue => {
                    const outcome = EVALUATION_OUTCOMES.find(o => o.value === outcomeValue);
                    return outcome ? (
                      <Badge key={outcomeValue} variant="secondary" data-testid={`badge-outcome-${outcomeValue}`}>
                        {outcome.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      )}

      {/* Bottom action buttons */}
      {(canICEdit || canManagerEdit) && (
        <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t">
          {saveDraftButton}
          <div className="flex items-center gap-2">
            {canICEdit && (
              <Button
                onClick={() => finalizeMutation.mutate("ic")}
                disabled={finalizeMutation.isPending}
                data-testid="button-submit-self-eval-bottom"
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Self-Assessment
              </Button>
            )}
            {canManagerEdit && (
              <Button
                onClick={() => finalizeMutation.mutate("manager")}
                disabled={finalizeMutation.isPending}
                data-testid="button-complete-evaluation"
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Finalize Evaluation
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EvaluationSectionCard({
  section,
  displayNumber,
  previousSection,
  canICEdit,
  canManagerEdit,
  sectionData,
  onFieldChange,
}: {
  section: EvaluationSection;
  displayNumber: number;
  previousSection?: EvaluationSection;
  canICEdit: boolean;
  canManagerEdit: boolean;
  sectionData?: {
    selfRating?: number;
    selfDocumentation?: string;
    improvementGoal?: string;
    managerRating?: number;
    managerFeedback?: string;
    founderFeedback?: string;
  };
  onFieldChange: (field: string, value: string | number) => void;
}) {
  // Use local state that syncs with sectionData or falls back to section values
  const selfRating = sectionData?.selfRating ?? section.selfRating ?? 0;
  const selfDocumentation = sectionData?.selfDocumentation ?? section.selfDocumentation ?? "";
  const improvementGoal = sectionData?.improvementGoal ?? section.improvementGoal ?? "";
  const managerRating = sectionData?.managerRating ?? section.managerRating ?? 0;
  const managerFeedback = sectionData?.managerFeedback ?? section.managerFeedback ?? "";
  const founderFeedback = sectionData?.founderFeedback ?? section.founderFeedback ?? "";

  const RatingSelector = ({
    value,
    onChange,
    disabled,
  }: {
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
  }) => (
    <div className="flex gap-1">
      {RATING_LABELS.map((rating) => (
        <button
          key={rating.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(rating.value)}
          className={`
            w-8 h-8 rounded-md text-sm font-medium transition-all
            ${value === rating.value 
              ? `${rating.color} text-white` 
              : "bg-muted hover-elevate"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
          title={rating.label}
          data-testid={`rating-${displayNumber}-${rating.value}`}
        >
          {rating.value}
        </button>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">
              {displayNumber}. {section.sectionName}
            </CardTitle>
            <CardDescription className="mt-1">{section.question}</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {previousSection && (previousSection.selfRating || previousSection.managerRating) && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Prev: {previousSection.selfRating || "-"}/{previousSection.managerRating || "-"}
              </Badge>
            )}
            {section.selfRating && (
              <Badge variant="outline" className="gap-1">
                <User className="w-3 h-3" />
                Self: {section.selfRating}/5
              </Badge>
            )}
            {section.managerRating && (
              <Badge variant="outline" className="gap-1">
                <ClipboardList className="w-3 h-3" />
                Mgr: {section.managerRating}/5
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Self-Assessment
            </h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Rating (1-5)</label>
                <RatingSelector
                  value={selfRating}
                  onChange={(v) => onFieldChange("selfRating", v)}
                  disabled={!canICEdit}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Documentation</label>
                <Textarea
                  placeholder="Document your work and achievements..."
                  value={selfDocumentation}
                  onChange={(e) => onFieldChange("selfDocumentation", e.target.value)}
                  disabled={!canICEdit}
                  className="resize-none min-h-[100px]"
                  data-testid={`input-self-doc-${displayNumber}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Improvement Goal</label>
                <Textarea
                  placeholder="What will you improve?"
                  value={improvementGoal}
                  onChange={(e) => onFieldChange("improvementGoal", e.target.value)}
                  disabled={!canICEdit}
                  className="resize-none"
                  data-testid={`input-goal-${displayNumber}`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Manager Assessment
            </h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Manager Rating (1-5)</label>
                <RatingSelector
                  value={managerRating}
                  onChange={(v) => onFieldChange("managerRating", v)}
                  disabled={!canManagerEdit}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Manager Feedback</label>
                <Textarea
                  placeholder="Provide feedback on performance..."
                  value={managerFeedback}
                  onChange={(e) => onFieldChange("managerFeedback", e.target.value)}
                  disabled={!canManagerEdit}
                  className="resize-none min-h-[100px]"
                  data-testid={`input-mgr-feedback-${displayNumber}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Founder/Domain Lead Feedback</label>
                <Textarea
                  placeholder="Additional leadership feedback..."
                  value={founderFeedback}
                  onChange={(e) => onFieldChange("founderFeedback", e.target.value)}
                  disabled={!canManagerEdit}
                  className="resize-none"
                  data-testid={`input-founder-feedback-${displayNumber}`}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
