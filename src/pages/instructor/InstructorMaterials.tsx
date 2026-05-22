import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseFile, isAcceptedFile, ACCEPT_STRING, type ParsedFile } from "@/lib/file-parser";
import {
  Upload, FileText, Trash2, Eye, Loader2, FileUp, X, CheckCircle2, AlertCircle, ArrowLeft,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const InstructorMaterials = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<any>(null);

  // Fetch course info
  const { data: course } = useQuery({
    queryKey: ["instructor-course", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title")
        .eq("id", courseId!)
        .single();
      return data;
    },
    enabled: !!courseId,
  });

  // Fetch materials for this course
  const { data: materials, isLoading } = useQuery({
    queryKey: ["instructor-materials", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("course_id", courseId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !courseId) throw new Error("Missing context");
      setParsing(true);
      let parsed: ParsedFile;
      try {
        parsed = await parseFile(file);
      } finally {
        setParsing(false);
      }

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("platform-assets")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("platform-assets")
        .getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from("materials").insert({
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        extracted_text: parsed.text.slice(0, 50000),
        summary: parsed.text.slice(0, 500),
        status: "ready",
        uploaded_by: user.id,
        course_id: courseId,
      });
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-materials", courseId] });
      toast({ title: "Material uploaded successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-materials", courseId] });
      toast({ title: "Material deleted" });
    },
  });

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((f) => {
        if (isAcceptedFile(f)) uploadMutation.mutate(f);
        else toast({ title: "Unsupported file type", variant: "destructive" });
      });
    },
    [uploadMutation, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/instructor")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {course?.title ?? "Course"} — Materials
            </h2>
            <p className="text-muted-foreground">Upload and manage materials for this course.</p>
          </div>
        </div>

        {/* Upload Area */}
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
              }`}
            >
              {parsing || uploadMutation.isPending ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Drop files here or click to upload</p>
                <p className="text-sm text-muted-foreground">PDF, DOCX, TXT, or images</p>
              </div>
              <label>
                <Input
                  type="file"
                  className="hidden"
                  accept={ACCEPT_STRING}
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Materials List */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : !materials?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10">
              <FileUp className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No materials uploaded yet for this course.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {materials.map((m) => (
              <Card key={m.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{m.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={m.status === "ready" ? "default" : "secondary"} className="text-[10px]">
                      {m.status === "ready" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertCircle className="mr-1 h-3 w-3" />}
                      {m.status}
                    </Badge>
                    {m.file_size && <span>{(m.file_size / 1024).toFixed(0)} KB</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setPreviewMaterial(m)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewMaterial} onOpenChange={() => setPreviewMaterial(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{previewMaterial?.title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="whitespace-pre-wrap text-sm">
                {previewMaterial?.extracted_text || previewMaterial?.summary || "No content extracted."}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default InstructorMaterials;
