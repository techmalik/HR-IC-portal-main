import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ExternalLink, Building2, Swords } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type PageStatus = "draft" | "published";

interface IndustryPage {
  slug: string;
  name: string;
  shortName: string;
  heroTitle: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  painPoints: string[];
  useCases: { title: string; description: string }[];
  faqs: { q: string; a: string }[];
  updatedDate: string;
  status?: PageStatus;
}

interface CompetitorPage {
  slug: string;
  competitorName: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  positioning: string;
  competitorWeaknesses: string[];
  teamflowStrengths: string[];
  comparison: { feature: string; teamflow: string; competitor: string }[];
  pricingNote: string;
  faqs: { q: string; a: string }[];
  updatedDate: string;
  status?: PageStatus;
}

function StatusBadge({ status }: { status?: PageStatus }) {
  const s = status ?? "published";
  const cls = s === "published"
    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{s === "published" ? "Published" : "Draft"}</span>;
}

const today = () => new Date().toISOString().slice(0, 10);

function IndustryEditor({
  page,
  onSuccess,
  onCancel,
}: {
  page?: IndustryPage;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!page;
  const [form, setForm] = useState<IndustryPage>(
    page ?? {
      slug: "",
      name: "",
      shortName: "",
      heroTitle: "",
      metaTitle: "",
      metaDescription: "",
      intro: "",
      painPoints: [""],
      useCases: [{ title: "", description: "" }],
      faqs: [{ q: "", a: "" }],
      updatedDate: today(),
      status: "draft",
    }
  );

  const mutation = useMutation({
    mutationFn: async (v: IndustryPage) => {
      const cleaned: IndustryPage = {
        ...v,
        painPoints: v.painPoints.filter((p) => p.trim()),
        useCases: v.useCases.filter((u) => u.title.trim()),
        faqs: v.faqs.filter((f) => f.q.trim()),
        updatedDate: today(),
      };
      return isEdit
        ? apiRequest("PUT", `/api/admin/seo/industries/${page!.slug}`, cleaned)
        : apiRequest("POST", `/api/admin/seo/industries`, cleaned);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/seo/industries"] });
      toast({ title: isEdit ? "Industry updated" : "Industry created" });
      onSuccess();
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Slug</label>
          <Input
            value={form.slug}
            disabled={isEdit}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="marketing-agencies"
          />
          <p className="text-xs text-muted-foreground mt-1">URL: /contractor-management-for-{form.slug || "your-slug"}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Industry name</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="marketing agencies" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Short name</label>
          <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="agencies" />
        </div>
        <div>
          <label className="text-sm font-medium">Hero title (H1)</label>
          <Input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Meta title</label>
        <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
      </div>

      <div>
        <label className="text-sm font-medium">Meta description</label>
        <Textarea
          rows={2}
          value={form.metaDescription}
          onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">{form.metaDescription.length}/200</p>
      </div>

      <div>
        <label className="text-sm font-medium">Intro paragraph</label>
        <Textarea rows={4} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} />
      </div>

      <div>
        <label className="text-sm font-medium">Pain points (one per line)</label>
        <Textarea
          rows={4}
          value={form.painPoints.join("\n")}
          onChange={(e) => setForm({ ...form, painPoints: e.target.value.split("\n") })}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Use cases (Title :: Description, one per line)</label>
        <Textarea
          rows={5}
          value={form.useCases.map((u) => `${u.title} :: ${u.description}`).join("\n")}
          onChange={(e) =>
            setForm({
              ...form,
              useCases: e.target.value.split("\n").map((line) => {
                const [title, ...rest] = line.split("::");
                return { title: (title ?? "").trim(), description: rest.join("::").trim() };
              }),
            })
          }
        />
      </div>

      <div>
        <label className="text-sm font-medium">FAQs (Question :: Answer, one per line)</label>
        <Textarea
          rows={5}
          value={form.faqs.map((f) => `${f.q} :: ${f.a}`).join("\n")}
          onChange={(e) =>
            setForm({
              ...form,
              faqs: e.target.value.split("\n").map((line) => {
                const [q, ...rest] = line.split("::");
                return { q: (q ?? "").trim(), a: rest.join("::").trim() };
              }),
            })
          }
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4 mt-2">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Status</label>
          <select
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={form.status ?? "published"}
            onChange={(e) => setForm({ ...form, status: e.target.value as PageStatus })}
            data-testid="industry-status-select"
          >
            <option value="draft">Draft (not visible publicly)</option>
            <option value="published">Published (live)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
          {isEdit && (form.status ?? "published") === "draft" && (
            <Button
              variant="secondary"
              onClick={() => mutation.mutate({ ...form, status: "published" })}
              disabled={mutation.isPending}
              data-testid="industry-publish-btn"
            >
              Save & Publish
            </Button>
          )}
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : (form.status === "published" ? "Create & Publish" : "Save as Draft")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompetitorEditor({
  page,
  onSuccess,
  onCancel,
}: {
  page?: CompetitorPage;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!page;
  const [form, setForm] = useState<CompetitorPage>(
    page ?? {
      slug: "",
      competitorName: "",
      metaTitle: "",
      metaDescription: "",
      intro: "",
      positioning: "",
      competitorWeaknesses: [""],
      teamflowStrengths: [""],
      comparison: [{ feature: "", teamflow: "", competitor: "" }],
      pricingNote: "",
      faqs: [{ q: "", a: "" }],
      updatedDate: today(),
      status: "draft",
    }
  );

  const mutation = useMutation({
    mutationFn: async (v: CompetitorPage) => {
      const cleaned: CompetitorPage = {
        ...v,
        competitorWeaknesses: v.competitorWeaknesses.filter((p) => p.trim()),
        teamflowStrengths: v.teamflowStrengths.filter((p) => p.trim()),
        comparison: v.comparison.filter((c) => c.feature.trim()),
        faqs: v.faqs.filter((f) => f.q.trim()),
        updatedDate: today(),
      };
      return isEdit
        ? apiRequest("PUT", `/api/admin/seo/competitors/${page!.slug}`, cleaned)
        : apiRequest("POST", `/api/admin/seo/competitors`, cleaned);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/seo/competitors"] });
      toast({ title: isEdit ? "Competitor page updated" : "Competitor page created" });
      onSuccess();
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Slug (must end with -alternative)</label>
          <Input
            value={form.slug}
            disabled={isEdit}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="deel-alternative"
          />
          <p className="text-xs text-muted-foreground mt-1">URL: /{form.slug || "your-slug"}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Competitor name</label>
          <Input value={form.competitorName} onChange={(e) => setForm({ ...form, competitorName: e.target.value })} placeholder="Deel" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Meta title</label>
        <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
      </div>

      <div>
        <label className="text-sm font-medium">Meta description</label>
        <Textarea
          rows={2}
          value={form.metaDescription}
          onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">{form.metaDescription.length}/200</p>
      </div>

      <div>
        <label className="text-sm font-medium">Intro paragraph</label>
        <Textarea rows={4} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} />
      </div>

      <div>
        <label className="text-sm font-medium">Positioning statement</label>
        <Textarea rows={3} value={form.positioning} onChange={(e) => setForm({ ...form, positioning: e.target.value })} />
      </div>

      <div>
        <label className="text-sm font-medium">Competitor weaknesses (one per line)</label>
        <Textarea
          rows={4}
          value={form.competitorWeaknesses.join("\n")}
          onChange={(e) => setForm({ ...form, competitorWeaknesses: e.target.value.split("\n") })}
        />
      </div>

      <div>
        <label className="text-sm font-medium">TeamFlow strengths (one per line)</label>
        <Textarea
          rows={4}
          value={form.teamflowStrengths.join("\n")}
          onChange={(e) => setForm({ ...form, teamflowStrengths: e.target.value.split("\n") })}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Comparison rows (Feature :: TeamFlow :: Competitor, one per line)</label>
        <Textarea
          rows={6}
          value={form.comparison.map((c) => `${c.feature} :: ${c.teamflow} :: ${c.competitor}`).join("\n")}
          onChange={(e) =>
            setForm({
              ...form,
              comparison: e.target.value.split("\n").map((line) => {
                const parts = line.split("::").map((p) => p.trim());
                return { feature: parts[0] ?? "", teamflow: parts[1] ?? "", competitor: parts[2] ?? "" };
              }),
            })
          }
        />
      </div>

      <div>
        <label className="text-sm font-medium">Pricing note</label>
        <Textarea rows={3} value={form.pricingNote} onChange={(e) => setForm({ ...form, pricingNote: e.target.value })} />
      </div>

      <div>
        <label className="text-sm font-medium">FAQs (Question :: Answer, one per line)</label>
        <Textarea
          rows={5}
          value={form.faqs.map((f) => `${f.q} :: ${f.a}`).join("\n")}
          onChange={(e) =>
            setForm({
              ...form,
              faqs: e.target.value.split("\n").map((line) => {
                const [q, ...rest] = line.split("::");
                return { q: (q ?? "").trim(), a: rest.join("::").trim() };
              }),
            })
          }
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4 mt-2">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Status</label>
          <select
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={form.status ?? "published"}
            onChange={(e) => setForm({ ...form, status: e.target.value as PageStatus })}
            data-testid="competitor-status-select"
          >
            <option value="draft">Draft (not visible publicly)</option>
            <option value="published">Published (live)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
          {isEdit && (form.status ?? "published") === "draft" && (
            <Button
              variant="secondary"
              onClick={() => mutation.mutate({ ...form, status: "published" })}
              disabled={mutation.isPending}
              data-testid="competitor-publish-btn"
            >
              Save & Publish
            </Button>
          )}
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : (form.status === "published" ? "Create & Publish" : "Save as Draft")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function IndustriesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<IndustryPage | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery<IndustryPage[]>({ queryKey: ["/api/admin/seo/industries"] });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => apiRequest("DELETE", `/api/admin/seo/industries/${slug}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/seo/industries"] });
      toast({ title: "Industry deleted" });
      setDeleting(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Industry Pages</CardTitle>
            <CardDescription>
              Pages live at <code>/contractor-management-for-:slug</code>. Edits are reflected immediately without a code deploy.
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />New Industry</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !items?.length ? (
          <p className="text-center py-8 text-muted-foreground">No industry pages yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Industry</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.slug}>
                  <TableCell className="font-medium max-w-[240px] truncate">{i.heroTitle}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{i.slug}</TableCell>
                  <TableCell><StatusBadge status={i.status} /></TableCell>
                  <TableCell className="text-sm">{i.updatedDate}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Preview">
                        <a href={`/contractor-management-for-${i.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(i)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(i.slug)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Industry Page</DialogTitle>
            <DialogDescription>Create a new programmatic industry SEO page.</DialogDescription>
          </DialogHeader>
          <IndustryEditor onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Industry Page</DialogTitle>
            <DialogDescription>Update the content for this industry page.</DialogDescription>
          </DialogHeader>
          {editing && <IndustryEditor page={editing} onSuccess={() => setEditing(null)} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this industry page?</AlertDialogTitle>
            <AlertDialogDescription>This removes the live page at /contractor-management-for-{deleting}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteMutation.mutate(deleting)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function CompetitorsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CompetitorPage | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery<CompetitorPage[]>({ queryKey: ["/api/admin/seo/competitors"] });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => apiRequest("DELETE", `/api/admin/seo/competitors/${slug}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/seo/competitors"] });
      toast({ title: "Competitor page deleted" });
      setDeleting(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Swords className="w-5 h-5" />Competitor Comparison Pages</CardTitle>
            <CardDescription>
              Pages live at <code>/:slug</code> (e.g. /deel-alternative). Edits are reflected immediately.
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />New Competitor</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !items?.length ? (
          <p className="text-center py-8 text-muted-foreground">No competitor pages yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.slug}>
                  <TableCell className="font-medium">{c.competitorName}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{c.slug}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-sm">{c.updatedDate}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Preview">
                        <a href={`/${c.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(c)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(c.slug)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Competitor Page</DialogTitle>
            <DialogDescription>Create a new programmatic competitor comparison page.</DialogDescription>
          </DialogHeader>
          <CompetitorEditor onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Competitor Page</DialogTitle>
            <DialogDescription>Update the content for this competitor comparison page.</DialogDescription>
          </DialogHeader>
          {editing && <CompetitorEditor page={editing} onSuccess={() => setEditing(null)} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this competitor page?</AlertDialogTitle>
            <AlertDialogDescription>This removes the live page at /{deleting}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteMutation.mutate(deleting)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function AdminSeoPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SEO Content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage programmatic SEO pages — industry guides and competitor comparison pages. Changes go live immediately.
        </p>
      </div>
      <Tabs defaultValue="industries">
        <TabsList>
          <TabsTrigger value="industries" className="flex items-center gap-2"><Building2 className="w-4 h-4" />Industries</TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2"><Swords className="w-4 h-4" />Competitors</TabsTrigger>
        </TabsList>
        <TabsContent value="industries" className="mt-4"><IndustriesTab /></TabsContent>
        <TabsContent value="competitors" className="mt-4"><CompetitorsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
