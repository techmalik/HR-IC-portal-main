import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { EVALUATION_OUTCOMES } from "@shared/schema";

interface ManagerSummaryCardProps {
  canManagerEdit: boolean;
  managerSummary: string;
  onManagerSummaryChange: (v: string) => void;
  expectationsForNextReview: string;
  onExpectationsChange: (v: string) => void;
  newExperienceLevel: number;
  onExperienceLevelChange: (v: number) => void;
  currentExperienceLevel?: number | null;
  outcomes: string[];
  onOutcomesChange: (outcomes: string[]) => void;
}

export function ManagerSummaryCard({
  canManagerEdit,
  managerSummary,
  onManagerSummaryChange,
  expectationsForNextReview,
  onExpectationsChange,
  newExperienceLevel,
  onExperienceLevelChange,
  currentExperienceLevel,
  outcomes,
  onOutcomesChange,
}: ManagerSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manager Summary &amp; Next Steps</CardTitle>
        <CardDescription>
          Overall assessment and expectations for the next review period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Manager Summary</label>
          <Textarea
            placeholder="Provide an overall summary of the IC's performance during this period..."
            value={managerSummary}
            onChange={(e) => onManagerSummaryChange(e.target.value)}
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
            onChange={(e) => onExpectationsChange(e.target.value)}
            disabled={!canManagerEdit}
            className="resize-none min-h-[120px]"
            data-testid="input-expectations"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <label className="text-sm font-medium">New Experience Level Assignment</label>
          <p className="text-sm text-muted-foreground">
            Current level: {currentExperienceLevel || 1} / 7. Use the Seniority Scale reference
            above to assign the appropriate level.
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((level) => (
              <button
                key={level}
                type="button"
                disabled={!canManagerEdit}
                onClick={() => onExperienceLevelChange(level)}
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
                      onOutcomesChange(outcomes.filter((o) => o !== outcome.value));
                    } else {
                      onOutcomesChange([...outcomes, outcome.value]);
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
              {outcomes.map((outcomeValue) => {
                const outcome = EVALUATION_OUTCOMES.find((o) => o.value === outcomeValue);
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
  );
}
