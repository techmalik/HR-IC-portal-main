import { useState } from "react";
import { useMutation, type Query } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UseReviewActionOptions<TItem, TAction extends string> {
  mutationFn: (vars: { item: TItem; action: TAction; note: string }) => Promise<unknown>;
  invalidateKeys?: string[];
  invalidatePredicate?: (query: Query) => boolean;
  noteRequiredForActions?: TAction[];
  getToast: (action: TAction, item: TItem) => { title: string; description?: string };
  errorMessage?: string;
  getErrorMessage?: (error: unknown) => string;
  onSuccess?: (action: TAction, item: TItem) => void;
}

export function useReviewAction<TItem, TAction extends string = "approve" | "reject">(
  options: UseReviewActionOptions<TItem, TAction>
) {
  const [item, setItem] = useState<TItem | null>(null);
  const [action, setAction] = useState<TAction | null>(null);
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const close = () => {
    setItem(null);
    setAction(null);
    setNote("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item || !action) throw new Error("No item or action selected");
      return options.mutationFn({ item, action, note });
    },
    onSuccess: () => {
      options.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      if (options.invalidatePredicate) {
        queryClient.invalidateQueries({ predicate: options.invalidatePredicate });
      }
      const { title, description } = options.getToast(action as TAction, item as TItem);
      toast({ title, description });
      options.onSuccess?.(action as TAction, item as TItem);
      close();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          options.getErrorMessage?.(error) ||
          options.errorMessage ||
          "Failed to process request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const noteRequired = action ? !!options.noteRequiredForActions?.includes(action) : false;
  const canConfirm = !!item && !!action && (!noteRequired || note.trim().length > 0);

  return {
    item,
    action,
    note,
    setNote,
    isOpen: !!item,
    noteRequired,
    canConfirm,
    isPending: mutation.isPending,
    start: (i: TItem, a: TAction) => {
      setItem(i);
      setAction(a);
      setNote("");
    },
    close,
    confirm: () => mutation.mutate(),
  };
}
