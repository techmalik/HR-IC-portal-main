import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Star,
  Loader2,
  Send,
  FileText,
  CheckCircle2,
  ClipboardList,
  User,
  Calendar,
  Hash,
  Briefcase,
  Users,
  Award,
} from "lucide-react";
import type { Evaluation, EvaluationSection, IcResponsibility, User as UserType } from "@shared/schema";
import { EVALUATION_OUTCOMES } from "@shared/schema";
import type { AuthUser } from "@/lib/auth-context";
import { STATUS_CONFIG } from "./evaluation-status-config";
import { SeniorityScaleTable } from "./seniority-scale-table";
import { EvaluationSectionCard } from "./evaluation-section-card";
import { ManagerSummaryCard } from "./manager-summary-card";

interface EvaluationDetailViewProps {
  evaluation: Evaluation;
  onBack: () => void;
  currentUser: AuthUser;
  getUserById: (id: string) => UserType | undefined;
}

export function EvaluationDetailView({
  evaluation,
  onBack,
  currentUser,
  getUserById,
}: EvaluationDetailViewProps) {
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
      const res = await fetch(`/api/ic-responsibilities?icId=${evaluation.icId}`, {
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
      return apiRequest(
        "POST",
        `/api/evaluations/${evaluation.id}/sections/bulk-update`,
        updates
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/evaluations", evaluation.id, "sections"],
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (finalizeAs: "ic" | "manager") => {
      const sortedSections = sections
        ? [...sections].sort((a, b) => a.sectionNumber - b.sectionNumber)
        : [];
      const sectionUpdates = sortedSections.map((section) => {
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
      queryClient.invalidateQueries({
        queryKey: ["/api/evaluations", evaluation.id, "sections"],
      });
      toast({ title: "Evaluation submitted", description: "Your evaluation has been finalized." });
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

  const [expectationsForNextReview, setExpectationsForNextReview] = useState(
    evaluation.expectationsForNextReview || ""
  );
  const [managerSummary, setManagerSummary] = useState(evaluation.managerSummary || "");
  const [newExperienceLevel, setNewExperienceLevel] = useState(
    evaluation.newExperienceLevel || ic?.experienceLevel || 1
  );
  const [outcomes, setOutcomes] = useState<string[]>(evaluation.outcomes || []);

  const isICOwner = currentUser.id === evaluation.icId;
  const isManagerOwner = currentUser.id === evaluation.managerId;
  const canICEdit = isICOwner && evaluation.status === "draft";
  const canManagerEdit =
    isManagerOwner &&
    (evaluation.status === "ic_submitted" || evaluation.status === "manager_submitted");
  const isCompleted = evaluation.status === "completed";

  const completedSections =
    sections?.filter((s) => {
      if (canICEdit) return s.selfRating && s.selfDocumentation;
      else if (canManagerEdit) return s.managerRating && s.managerFeedback;
      return (s.selfRating && s.selfDocumentation) && (s.managerRating && s.managerFeedback);
    }).length || 0;
  const totalSections = sections?.length || 6;
  const progressPercent = (completedSections / totalSections) * 100;

  const sortedSections = sections
    ? [...sections].sort((a, b) => a.sectionNumber - b.sectionNumber)
    : [];

  const [sectionData, setSectionData] = useState<
    Record<
      string,
      {
        selfRating: number;
        selfDocumentation: string;
        improvementGoal: string;
        managerRating: number;
        managerFeedback: string;
        founderFeedback: string;
      }
    >
  >({});

  const handleSectionChange = (sectionId: string, field: string, value: string | number) => {
    setSectionData((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [field]: value },
    }));
  };

  const handleSaveAllSections = () => {
    const updates = sortedSections.map((section) => {
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
              <Badge variant="default" className="gap-1 bg-green-600">
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
                  {evaluation.outcomes.map((outcomeValue) => {
                    const outcome = EVALUATION_OUTCOMES.find(
                      (o) => o.value === outcomeValue
                    );
                    return outcome ? (
                      <Badge
                        key={outcomeValue}
                        variant="secondary"
                        data-testid={`badge-outcome-display-${outcomeValue}`}
                      >
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
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {ic?.firstName?.[0]}
                  {ic?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>
                  {ic?.firstName} {ic?.lastName}
                </CardTitle>
                <CardDescription>{ic?.jobTitle || "Independent Contractor"}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  STATUS_CONFIG[evaluation.status as keyof typeof STATUS_CONFIG]?.variant ||
                  "secondary"
                }
              >
                {STATUS_CONFIG[evaluation.status as keyof typeof STATUS_CONFIG]?.label ||
                  evaluation.status}
              </Badge>
              <Badge variant="outline">
                {format(new Date(evaluation.periodStart), "MMM yyyy")} -{" "}
                {format(new Date(evaluation.periodEnd), "MMM yyyy")}
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
                <p className="font-medium">
                  {lastEvaluation?.overallManagerRating?.toFixed(1) || "N/A"}
                </p>
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
                <p className="font-medium">
                  {lastEvaluation
                    ? format(
                        new Date(lastEvaluation.completedAt || lastEvaluation.createdAt),
                        "MMM d, yyyy"
                      )
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Last Eval Period</span>
                <p className="font-medium">
                  {lastEvaluation
                    ? `${format(new Date(lastEvaluation.periodStart), "MMM yyyy")} - ${format(new Date(lastEvaluation.periodEnd), "MMM yyyy")}`
                    : "N/A"}
                </p>
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
                <p className="font-medium">
                  {manager?.firstName} {manager?.lastName}
                </p>
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
                <Badge variant="outline" className="capitalize">
                  {ic?.contractorStatus || "engaged"}
                </Badge>
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
              <span className="font-medium">
                {completedSections}/{totalSections} sections
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <SeniorityScaleTable currentExperienceLevel={ic?.experienceLevel} />

      {sectionsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSections.map((section, index) => {
            const prevSection = lastEvaluationSections?.find(
              (s) => s.sectionNumber === section.sectionNumber
            );
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
        <ManagerSummaryCard
          canManagerEdit={canManagerEdit}
          managerSummary={managerSummary}
          onManagerSummaryChange={setManagerSummary}
          expectationsForNextReview={expectationsForNextReview}
          onExpectationsChange={setExpectationsForNextReview}
          newExperienceLevel={newExperienceLevel}
          onExperienceLevelChange={setNewExperienceLevel}
          currentExperienceLevel={ic?.experienceLevel}
          outcomes={outcomes}
          onOutcomesChange={setOutcomes}
        />
      )}

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
