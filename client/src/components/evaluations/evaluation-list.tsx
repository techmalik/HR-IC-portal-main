import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Calendar, ChevronRight } from "lucide-react";
import type { Evaluation, User as UserType } from "@shared/schema";
import { EVALUATION_OUTCOMES } from "@shared/schema";

interface EvaluationListProps {
  evaluations: Evaluation[];
  onSelect: (e: Evaluation) => void;
  getUserById: (id: string) => UserType | undefined;
  getStatusBadge: (status: string) => JSX.Element;
}

export function EvaluationList({
  evaluations,
  onSelect,
  getUserById,
  getStatusBadge,
}: EvaluationListProps) {
  if (evaluations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No evaluations yet</p>
        <p className="mt-1">Evaluations will appear here once created</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {evaluations.map((evaluation) => {
        const ic = getUserById(evaluation.icId);
        return (
          <div
            key={evaluation.id}
            className="p-4 rounded-md bg-muted/30 hover-elevate cursor-pointer flex items-center justify-between gap-4"
            onClick={() => onSelect(evaluation)}
            data-testid={`evaluation-${evaluation.id}`}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {ic?.firstName?.[0]}
                  {ic?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {ic?.firstName} {ic?.lastName}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(new Date(evaluation.periodStart), "MMM d, yyyy")} -{" "}
                    {format(new Date(evaluation.periodEnd), "MMM d, yyyy")}
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
              {evaluation.status === "completed" &&
                evaluation.outcomes &&
                evaluation.outcomes.length > 0 && (
                  <>
                    {evaluation.outcomes.slice(0, 2).map((outcomeValue) => {
                      const outcome = EVALUATION_OUTCOMES.find((o) => o.value === outcomeValue);
                      return outcome ? (
                        <Badge
                          key={outcomeValue}
                          variant="secondary"
                          className="text-xs"
                          data-testid={`badge-list-outcome-${outcomeValue}`}
                        >
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
              {getStatusBadge(evaluation.status)}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
