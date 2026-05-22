import { useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseFile, isAcceptedFile, ACCEPT_STRING, type ParsedFile } from "@/lib/file-parser";
import {
  FileText, Trash2, Eye, Loader2, FileUp, CheckCircle2, AlertCircle, Plus, X, Download, Search,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const GRADES = [9, 10, 11, 12];

const AdminMaterials = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");

  // Upload form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formPublished, setFormPublished] = useState(true);
  const [formFile, setFormFile] = useState<File | null>(null);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const subjects = [...new Set(materials.map((m: any) => m.subject).filter(Boolean))];

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, description, subject, gradeTarget, isPublished }: {
      file: File; title: string; description: string; subject: string; gradeTarget: number; isPublished: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      let parsed: ParsedFile | null = null;
      try { parsed = await parseFile(file); } catch { /* non-text file */ }

      const filePath = `materials/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("platform-assets").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("platform-assets").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("materials").insert({
        title,
        description,
        subject,
        grade_target: gradeTarget,
        is_published: isPublished,
        file_url: urlData.publicUrl,
        file_type: file.name.split(".").pop()?.toLowerCase() || "unknown",
        file_size: file.size,
        extracted_text: parsed?.text || "",
        uploaded_by: user.id,
        status: (parsed?.text?.length ?? 0) > 50 ? "ready" : "ready",
      } as any);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: "Material uploaded successfully" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: "Material deleted" });
    },
  });

  const resetForm = () => {
    setFormTitle(""); setFormDescription(""); setFormSubject(""); setFormGrade(""); setFormPublished(true); setFormFile(null);
    setShowUploadForm(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFile || !formTitle || !formGrade || !formSubject) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    uploadMutation.mutate({
      file: formFile,
      title: formTitle,
      description: formDescription,
      subject: formSubject,
      gradeTarget: parseInt(formGrade),
      isPublished: formPublished,
    });
  };

  const filtered = materials.filter((m: any) => {
    if (filterGrade !== "all" && m.grade_target !== parseInt(filterGrade)) return false;
    if (filterSubject !== "all" && m.subject !== filterSubject) return false;
    if (searchQ && !m.title?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Learning Materials</h2>
            <p className="text-sm text-muted-foreground">Upload and manage grade-based learning materials.</p>
          </div>
          <Button onClick={() => setShowUploadForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Upload Material
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search materials..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Materials list */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No materials found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {m.grade_target && <Badge variant="outline" className="text-xs">Grade {m.grade_target}</Badge>}
                      {m.subject && <Badge variant="secondary" className="text-xs">{m.subject}</Badge>}
                      <span className="uppercase">{m.file_type}</span>
                      <span>·</span>
                      <span>{formatSize(m.file_size)}</span>
                    </div>
                  </div>
                  <Badge variant={m.is_published ? "default" : "outline"} className="text-xs">
                    {m.is_published ? "Published" : "Draft"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setPreviewMaterial(m)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {m.file_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(m.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Form Dialog */}
      <Dialog open={showUploadForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Learning Material</DialogTitle></DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title <span className="text-destructive">*</span></label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Chapter 3 — Quadratic Equations" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief description..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Subject <span className="text-destructive">*</span></label>
                <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="e.g. Mathematics" required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Grade <span className="text-destructive">*</span></label>
                <Select value={formGrade} onValueChange={setFormGrade}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Published</label>
              <input type="checkbox" checked={formPublished} onChange={e => setFormPublished(e.target.checked)} className="h-4 w-4 rounded border-border" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">File <span className="text-destructive">*</span></label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background p-3 transition-colors hover:border-primary">
                {formFile ? (
                  <><CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /><span className="truncate text-sm">{formFile.name}</span></>
                ) : (
                  <><FileUp className="h-5 w-5 shrink-0 text-muted-foreground" /><span className="text-sm text-muted-foreground">PDF, DOCX, PPTX, Images, Videos — max 20 MB</span></>
                )}
                <input type="file" className="hidden" onChange={e => e.target.files?.[0] && setFormFile(e.target.files[0])} />
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : "Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewMaterial} onOpenChange={() => setPreviewMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>{previewMaterial?.title}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm mb-3">
            {previewMaterial?.description && <p className="text-muted-foreground">{previewMaterial.description}</p>}
            <div className="flex gap-2">
              {previewMaterial?.grade_target && <Badge variant="outline">Grade {previewMaterial.grade_target}</Badge>}
              {previewMaterial?.subject && <Badge variant="secondary">{previewMaterial.subject}</Badge>}
            </div>
          </div>
          <ScrollArea className="h-[50vh]">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {previewMaterial?.extracted_text || "No text extracted."}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminMaterials;
