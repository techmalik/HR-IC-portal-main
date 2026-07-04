import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive" | "outline" | "ghost";
  confirmClassName?: string;
  isPending: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  contentClassName?: string;
  children?: ReactNode;
}

export function ReviewDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  confirmClassName,
  isPending,
  confirmDisabled,
  onConfirm,
  onCancel,
  contentClassName,
  children,
}: ReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-review">
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            className={confirmClassName}
            onClick={onConfirm}
            disabled={isPending || confirmDisabled}
            data-testid="button-confirm-action"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ReviewNoteFieldProps {
  label: ReactNode;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

export function ReviewNoteField({
  label,
  required,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
}: ReviewNoteFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {required && <p className="text-xs text-destructive">Required</p>}
      <Textarea
        value={value}
        onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-none"
        data-testid="input-review-note"
      />
      {maxLength && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  );
}
