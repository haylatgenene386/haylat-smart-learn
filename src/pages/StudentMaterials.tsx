import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Eye, Search, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const StudentMaterials = () => {
  const { user } = useAuth();
  const [searchQ, setSearchQ] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [previewMaterial, setPreviewMaterial] = useState<any>(null);

  // Get student grade from profile
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("grade").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const studentGrade = profile?.grade;

  // Fetch published materials for student's grade
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["student-materials", studentGrade],
    queryFn: async () => {
      if (!studentGrade) return [];
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("grade_target", studentGrade)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentGrade,
  });

  const subjects = [...new Set(materials.map((m: any) => m.subject).filter(Boolean))];

  const filtered = materials.filter((m: any) => {
    if (filterSubject !== "all" && m.subject !== filterSubject) return false;
    if (searchQ && !m.title?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const recentMaterials = materials.slice(0, 5);

  if (!studentGrade) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card><CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Your grade level is not set. Please update your profile.</p>
          </CardContent></Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Learning Materials</h1>
          <p className="text-sm text-muted-foreground">Grade {studentGrade} study resources</p>
        </div>

        {/* Recently added */}
        {recentMaterials.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Recently Added</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentMaterials.map((m: any) => (
                <Card key={m.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setPreviewMaterial(m)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{m.subject} · {m.file_type?.toUpperCase()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search materials..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Materials list */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No materials available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {m.subject && <Badge variant="secondary" className="text-xs">{m.subject}</Badge>}
                      <span className="uppercase">{m.file_type}</span>
                      {m.file_size > 0 && <><span>·</span><span>{formatSize(m.file_size)}</span></>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setPreviewMaterial(m)} title="Preview">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {m.file_url && (
                      <Button variant="ghost" size="icon" asChild title="Download">
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewMaterial} onOpenChange={() => setPreviewMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>{previewMaterial?.title}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm mb-3">
            {previewMaterial?.description && <p className="text-muted-foreground">{previewMaterial.description}</p>}
            <div className="flex gap-2">
              {previewMaterial?.subject && <Badge variant="secondary">{previewMaterial.subject}</Badge>}
              {previewMaterial?.file_url && (
                <Button size="sm" variant="outline" className="gap-1" asChild>
                  <a href={previewMaterial.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="h-[50vh]">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {previewMaterial?.extracted_text || "No text preview available. Please download the file."}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default StudentMaterials;
