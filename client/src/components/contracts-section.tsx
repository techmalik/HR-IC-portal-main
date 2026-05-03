import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Upload, Download, Trash2, AlertTriangle, Loader2, Plus } from "lucide-react";

export interface Contract {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  noticePeriodDays: number;
  fileUrl: string;
  fileName: string;
  createdAt: string | null;
}

function getContractStatus(c: Contract): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; tone: "ok" | "warn" | "expired" } {
  const now = new Date();
  const end = new Date(c.endDate);
  const days = differenceInDays(end, now);
  if (days < 0) return { label: "Expired", variant: "destructive", tone: "expired" };
  if (days <= (c.noticePeriodDays || 30)) return { label: `Expires in ${days}d`, variant: "outline", tone: "warn" };
  return { label: "Active", variant: "secondary", tone: "ok" };
}

interface ContractsSectionProps {
  userId: string;
  canManage: boolean;
}

export function ContractsSection({ userId, canManage }: ContractsSectionProps) {
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noticeDays, setNoticeDays] = useState("30");
  const [file, setFile] = useState<File | null>(null);

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts", { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/contracts?userId=${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch contracts");
      return res.json();
    },
    enabled: !!userId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("File required");
      const MAX_BYTES = 7 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        throw new Error("File exceeds 7MB limit");
      }
      const fileData: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return apiRequest("POST", "/api/contracts", {
        userId,
        title,
        startDate,
        endDate,
        noticePeriodDays: parseInt(noticeDays, 10) || 30,
        fileName: file.name,
        fileUrl: fileData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract uploaded" });
      setUploadOpen(false);
      setTitle(""); setStartDate(""); setEndDate(""); setNoticeDays("30"); setFile(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to upload contract.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete contract.", variant: "destructive" });
    },
  });

  const expiringSoon = (contracts || []).filter((c) => getContractStatus(c).tone === "warn");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Contracts</CardTitle>
          <CardDescription>
            {contracts?.length || 0} contract{(contracts?.length || 0) === 1 ? "" : "s"} on file
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setUploadOpen(true)} data-testid="button-upload-contract">
            <Plus className="w-4 h-4 mr-2" />
            Upload Contract
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {expiringSoon.length > 0 && (
          <div
            className="mb-4 flex items-start gap-2 p-3 rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm"
            data-testid="contract-expiring-banner"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              {expiringSoon.length} contract{expiringSoon.length === 1 ? "" : "s"} approaching renewal — review and renew before expiration.
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !contracts || contracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No contracts on file</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => {
              const status = getContractStatus(c);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-md bg-muted/50 gap-3"
                  data-testid={`contract-${c.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.startDate), "MMM d, yyyy")} – {format(new Date(c.endDate), "MMM d, yyyy")}
                        <span className="ml-2">• {c.noticePeriodDays}d notice</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={status.variant}
                      className={
                        status.tone === "warn"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40"
                          : ""
                      }
                      data-testid={`contract-status-${c.id}`}
                    >
                      {status.label}
                    </Badge>
                    {c.fileUrl && (
                      <Button variant="ghost" size="icon" asChild data-testid={`button-download-contract-${c.id}`}>
                        <a href={c.fileUrl} download={c.fileName} title="Download contract">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(c.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-contract-${c.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Contract</DialogTitle>
            <DialogDescription>
              Add a new contract for this contractor. PDFs, DOCs, and images are supported.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="contract-title">Title</Label>
              <Input
                id="contract-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Services Agreement 2026"
                data-testid="input-contract-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="contract-start">Start date</Label>
                <Input
                  id="contract-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-contract-start"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contract-end">End date</Label>
                <Input
                  id="contract-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-contract-end"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="contract-notice">Notice period (days)</Label>
              <Input
                id="contract-notice"
                type="number"
                min={1}
                value={noticeDays}
                onChange={(e) => setNoticeDays(e.target.value)}
                data-testid="input-contract-notice"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contract-file">Contract file</Label>
              <Input
                id="contract-file"
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                data-testid="input-contract-file"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} data-testid="button-cancel-contract">
              Cancel
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={
                uploadMutation.isPending ||
                !title.trim() ||
                !startDate ||
                !endDate ||
                !file
              }
              data-testid="button-submit-contract"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
