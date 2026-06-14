import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Award, ChevronDown } from "lucide-react";
import { SENIORITY_SCALE } from "@shared/schema";

interface SeniorityScaleTableProps {
  currentExperienceLevel?: number | null;
}

export function SeniorityScaleTable({ currentExperienceLevel }: SeniorityScaleTableProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4" />
                Seniority Scale Reference
              </CardTitle>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
            <CardDescription>
              7-level competency guide for experience level assessment
            </CardDescription>
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
                    <TableHead>Collaboration &amp; Leadership</TableHead>
                    <TableHead>Input Required</TableHead>
                    <TableHead>Value Creation Awareness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SENIORITY_SCALE.map((level) => (
                    <TableRow
                      key={level.level}
                      className={currentExperienceLevel === level.level ? "bg-primary/10" : ""}
                    >
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
  );
}
