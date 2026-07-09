import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Sparkles, X, Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

const DISMISS_KEY = "axle-sample-banner-dismissed";

export function SampleDataBanner() {
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "true",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const hasSampleData = !!users?.some((u) => u.isDemo);

  const removeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/demo-data", undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ooo-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({
        title: "Sample data removed",
        description: "Aisha Koni and her sample records have been removed.",
      });
      setConfirmOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove sample data. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!hasSampleData || dismissed) {
    return null;
  }

  return (
    <>
      <div
        className="flex items-start gap-3 p-4 rounded-xl border-[1.5px] border-violet-200 bg-violet-50 text-violet-900"
        data-testid="banner-sample-data"
      >
        <Sparkles className="w-5 h-5 mt-0.5 shrink-0 text-violet-500" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Aisha Koni is a sample team member</p>
          <p className="text-sm mt-0.5">
            Her timesheets, evaluation, and time-off requests are example data so you can explore Axle.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-violet-300 text-violet-700 hover:bg-violet-100"
            onClick={() => setConfirmOpen(true)}
            data-testid="button-remove-sample-data"
          >
            Remove sample data
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-violet-400 hover:text-violet-700 hover:bg-violet-100"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "true");
              setDismissed(true);
            }}
            data-testid="button-dismiss-sample-banner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove sample data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove Aisha Koni along with her sample timesheets, evaluation,
              and time-off requests. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-sample-data">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-sample-data"
            >
              {removeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remove sample data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
