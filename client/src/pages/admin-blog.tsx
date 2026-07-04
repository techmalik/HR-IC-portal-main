import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ExternalLink, FileText, BarChart2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface BlogArticle {
  slug: string;
  title: string;
  metaDescription: string;
  publishedDate: string;
  updatedDate: string;
  readingMinutes: number;
  excerpt: string;
  bodyHtml: string;
}

interface ArticleAnalytics {
  slug: string;
  title: string;
  publishedDate: string;
  views: number;
  referrers: Record<string, number>;
}

const articleSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1, "Title is required"),
  metaDescription: z.string().min(1, "Meta description is required").max(160, "Meta description should be under 160 characters"),
  publishedDate: z.string().min(1, "Published date is required"),
  updatedDate: z.string().min(1, "Updated date is required"),
  readingMinutes: z.coerce.number().int().min(1, "Reading time must be at least 1 minute"),
  excerpt: z.string().min(1, "Excerpt is required"),
  bodyHtml: z.string().min(1, "Body HTML is required"),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

const defaultValues: ArticleFormValues = {
  slug: "",
  title: "",
  metaDescription: "",
  publishedDate: new Date().toISOString().slice(0, 10),
  updatedDate: new Date().toISOString().slice(0, 10),
  readingMinutes: 5,
  excerpt: "",
  bodyHtml: "",
};

function ArticleForm({
  article,
  onSuccess,
  onCancel,
}: {
  article?: BlogArticle;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEditing = !!article;

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: article
      ? {
          slug: article.slug,
          title: article.title,
          metaDescription: article.metaDescription,
          publishedDate: article.publishedDate,
          updatedDate: article.updatedDate,
          readingMinutes: article.readingMinutes,
          excerpt: article.excerpt,
          bodyHtml: article.bodyHtml,
        }
      : defaultValues,
  });

  const mutation = useMutation({
    mutationFn: async (values: ArticleFormValues) => {
      if (isEditing) {
        return apiRequest("PUT", `/api/admin/blog/${article!.slug}`, values);
      }
      return apiRequest("POST", "/api/admin/blog", values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/blog-analytics"] });
      toast({
        title: isEditing ? "Article updated" : "Article created",
        description: isEditing
          ? "The article has been updated successfully."
          : "The new article has been published.",
      });
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to save article",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="my-article-title" {...field} disabled={isEditing} />
                </FormControl>
                <FormDescription>URL: /blog/your-slug</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="readingMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reading Time (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Article title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="metaDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meta Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Short description for search engines (under 160 chars)" rows={2} {...field} />
              </FormControl>
              <FormDescription>{field.value.length}/160 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Excerpt</FormLabel>
              <FormControl>
                <Textarea placeholder="Short preview shown on the blog index page" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="publishedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Published Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="updatedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Updated Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bodyHtml"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Body HTML</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="<h2>Section heading</h2><p>Article content as HTML...</p>"
                  rows={14}
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Write the article body as HTML. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;strong&gt;, etc.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Publish Article"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function TopReferrers({ referrers }: { referrers: Record<string, number> }) {
  const entries = Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (entries.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([source, count]) => (
        <Badge key={source} variant="secondary" className="text-xs font-normal">
          {source} ({count})
        </Badge>
      ))}
    </div>
  );
}

function AnalyticsTab() {
  const { data: analytics, isLoading } = useQuery<ArticleAnalytics[]>({
    queryKey: ["/api/admin/blog-analytics"],
  });

  const totalViews = analytics?.reduce((sum, a) => sum + a.views, 0) ?? 0;

  return (
    <Card className="border-[1.5px] border-neutral-200 rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              Article View Counts
            </CardTitle>
            <CardDescription>
              Articles ranked by page views. Referral source is detected from the browser's Referer header, no cookies or user PII are collected.
            </CardDescription>
          </div>
          {totalViews > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total views</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !analytics || analytics.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No articles found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead className="w-8 text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">#</TableHead>
                <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Article</TableHead>
                <TableHead className="text-right text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Views</TableHead>
                <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Top Referrers</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((article, idx) => (
                <TableRow key={article.slug}>
                  <TableCell className="text-muted-foreground text-sm font-medium">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium truncate max-w-[260px]">{article.title}</div>
                    <div className="text-xs text-muted-foreground font-mono">{article.slug}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold">{article.views.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <TopReferrers referrers={article.referrers} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild title="Open article">
                      <a href={`/blog/${article.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminBlogPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const { data: articles, isLoading } = useQuery<BlogArticle[]>({
    queryKey: ["/api/admin/blog"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      return apiRequest("DELETE", `/api/admin/blog/${slug}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/blog-analytics"] });
      toast({ title: "Article deleted", description: "The article has been removed." });
      setDeletingSlug(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete article",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-[28px] font-normal text-neutral-900">Blog</h1>
        <p className="text-muted-foreground mt-1">Manage articles published on the Axle blog</p>
      </div>
      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4">
          <Card className="border-[1.5px] border-neutral-200 rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Blog Articles
                  </CardTitle>
                  <CardDescription>
                    Create, edit, and delete blog articles. Changes are reflected on{" "}
                    <a href="/blog" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      /blog
                    </a>{" "}
                    immediately without a code deployment.
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Article
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !articles || articles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No articles yet. Click &ldquo;New Article&rdquo; to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                      <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Title</TableHead>
                      <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Slug</TableHead>
                      <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Published</TableHead>
                      <TableHead className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Updated</TableHead>
                      <TableHead className="text-right text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">Read Time</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((article) => (
                      <TableRow key={article.slug}>
                        <TableCell className="font-medium max-w-[260px] truncate">{article.title}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{article.slug}</TableCell>
                        <TableCell className="text-sm">{article.publishedDate}</TableCell>
                        <TableCell className="text-sm">{article.updatedDate}</TableCell>
                        <TableCell className="text-right text-sm">{article.readingMinutes} min</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Preview article"
                            >
                              <a href={`/blog/${article.slug}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingArticle(article)}
                              title="Edit article"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingSlug(article.slug)}
                              title="Delete article"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Blog Article</DialogTitle>
            <DialogDescription>
              Fill in the details below to publish a new article on the blog.
            </DialogDescription>
          </DialogHeader>
          <ArticleForm
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingArticle} onOpenChange={(open) => { if (!open) setEditingArticle(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>
              Update the article details. Changes will be live immediately.
            </DialogDescription>
          </DialogHeader>
          {editingArticle && (
            <ArticleForm
              article={editingArticle}
              onSuccess={() => setEditingArticle(null)}
              onCancel={() => setEditingArticle(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSlug} onOpenChange={(open) => { if (!open) setDeletingSlug(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the article at <strong>/blog/{deletingSlug}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSlug && deleteMutation.mutate(deletingSlug)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
