import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowLeft, GripVertical } from "lucide-react";
import { toast } from "sonner";

const AdminLessons = () => {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", summary: "", content: "", video_url: "",
    is_published: true, ai_questions_enabled: false,
  });

  const { data: chapter } = useQuery({
    queryKey: ["admin-chapter", chapterId],
    queryFn: async () => {
      const { data } = await supabase.from("chapters").select("*").eq("id", chapterId!).single();
      return data;
    },
  });

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["admin-lessons", chapterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("chapter_id", chapterId!)
        .order("sort_order");
      return data ?? [];
    },
  });

  const saveLesson = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title,
        summary: form.summary || null,
        content: form.content || null,
        video_url: form.video_url || null,
        is_published: form.is_published,
        ai_questions_enabled: form.ai_questions_enabled,
        course_id: courseId,
        chapter_id: chapterId,
        chapter_title: chapter?.title ?? "",
        chapter: 1,
        grade: 12,
        lesson_number: editId ? undefined : lessons.length + 1,
        sort_order: editId ? undefined : lessons.length,
      };
      if (editId) {
        delete payload.lesson_number;
        delete payload.sort_order;
        delete payload.course_id;
        delete payload.chapter_id;
        const { error } = await supabase.from("lessons").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", chapterId] });
      toast.success(editId ? "Lesson updated" : "Lesson created");
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", chapterId] });
      toast.success("Lesson deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditId(null);
    setForm({ title: "", summary: "", content: "", video_url: "", is_published: true, ai_questions_enabled: false });
  };

  const openEdit = (l: any) => {
    setEditId(l.id);
    setForm({
      title: l.title,
      summary: l.summary ?? "",
      content: l.content ?? "",
      video_url: l.video_url ?? "",
      is_published: l.is_published ?? true,
      ai_questions_enabled: l.ai_questions_enabled ?? false,
    });
    setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to={`/admin/courses/${courseId}/chapters`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold">Lessons</h2>
            <p className="text-sm text-muted-foreground">{chapter?.title ?? "Chapter"}</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Lesson</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Lesson" : "New Lesson"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Title</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Summary</label>
                  <Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Content</label>
                  <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Video URL</label>
                  <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                    <span className="text-sm">Published</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.ai_questions_enabled} onCheckedChange={(v) => setForm({ ...form, ai_questions_enabled: v })} />
                    <span className="text-sm">AI Questions</span>
                  </div>
                </div>
                <Button onClick={() => saveLesson.mutate()} disabled={!form.title || saveLesson.isPending} className="w-full">
                  {saveLesson.isPending ? "Saving..." : editId ? "Update" : "Create Lesson"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No lessons yet. Add your first lesson!
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((l, i) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Lesson {i + 1}: {l.title}</p>
                    <Badge variant={l.is_published ? "default" : "outline"} className="text-xs">
                      {l.is_published ? "Published" : "Draft"}
                    </Badge>
                    {l.ai_questions_enabled && <Badge variant="secondary" className="text-xs">AI</Badge>}
                  </div>
                  {l.summary && <p className="text-sm text-muted-foreground">{l.summary}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteLesson.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLessons;
