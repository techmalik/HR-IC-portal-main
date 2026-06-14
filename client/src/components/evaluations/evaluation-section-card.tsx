import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { User, ClipboardList } from "lucide-react";
import type { EvaluationSection } from "@shared/schema";

const RATING_LABELS = [
  { value: 1, label: "Unsatisfactory", color: "bg-red-500" },
  { value: 2, label: "Needs Improvement", color: "bg-orange-500" },
  { value: 3, label: "Meets Expectations", color: "bg-yellow-500" },
  { value: 4, label: "Exceeds Expectations", color: "bg-emerald-500" },
  { value: 5, label: "Exceptional", color: "bg-green-600" },
];

interface RatingSelectorProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  displayNumber: number;
  prefix: string;
}

function RatingSelector({ value, onChange, disabled, displayNumber, prefix }: RatingSelectorProps) {
  return (
    <div className="flex gap-1">
      {RATING_LABELS.map((rating) => (
        <button
          key={rating.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(rating.value)}
          className={`
            w-8 h-8 rounded-md text-sm font-medium transition-all
            ${value === rating.value ? `${rating.color} text-white` : "bg-muted hover-elevate"}
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
}

interface EvaluationSectionCardProps {
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
}

export function EvaluationSectionCard({
  section,
  displayNumber,
  previousSection,
  canICEdit,
  canManagerEdit,
  sectionData,
  onFieldChange,
}: EvaluationSectionCardProps) {
  const selfRating = sectionData?.selfRating ?? section.selfRating ?? 0;
  const selfDocumentation = sectionData?.selfDocumentation ?? section.selfDocumentation ?? "";
  const improvementGoal = sectionData?.improvementGoal ?? section.improvementGoal ?? "";
  const managerRating = sectionData?.managerRating ?? section.managerRating ?? 0;
  const managerFeedback = sectionData?.managerFeedback ?? section.managerFeedback ?? "";
  const founderFeedback = sectionData?.founderFeedback ?? section.founderFeedback ?? "";

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
            {previousSection &&
              (previousSection.selfRating || previousSection.managerRating) && (
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
                  displayNumber={displayNumber}
                  prefix="self"
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
                  displayNumber={displayNumber}
                  prefix="mgr"
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
                <label className="text-sm text-muted-foreground">
                  Founder/Domain Lead Feedback
                </label>
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
