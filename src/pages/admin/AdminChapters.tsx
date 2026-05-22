import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowLeft, ChevronRight, GripVertical } from "lucide-react";
import { toast } from "sonner";

const AdminChapters = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });

  const { data: course } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      return data;
    },
  });

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ["admin-chapters", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chapters")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order");
      return data ?? [];
    },
  });

  const saveChapter = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        course_id: courseId!,
        sort_order: editId ? undefined : chapters.length,
      };
      if (editId) {
        const { error } = await supabase.from("chapters").update({ title: payload.title, description: payload.description }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chapters").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-chapters", courseId] });
      toast.success(editId ? "Chapter updated" : "Chapter created");
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteChapter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-chapters", courseId] });
      toast.success("Chapter deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => { setEditId(null); setForm({ title: "", description: "" }); };

  const openEdit = (ch: any) => {
    setEditId(ch.id);
    setForm({ title: ch.title, description: ch.description ?? "" });
    setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/courses">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold">Chapters</h2>
            <p className="text-sm text-muted-foreground">{course?.title ?? "Course"}</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Chapter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Chapter" : "New Chapter"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Title</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter 1: Functions" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <Button onClick={() => saveChapter.mutate()} disabled={!form.title || saveChapter.isPending} className="w-full">
                  {saveChapter.isPending ? "Saving..." : editId ? "Update" : "Create Chapter"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : chapters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No chapters yet. Add your first chapter!
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((ch, i) => (
              <div key={ch.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Chapter {i + 1}: {ch.title}</p>
                  {ch.description && <p className="text-sm text-muted-foreground">{ch.description}</p>}
                </div>
                <Link to={`/admin/courses/${courseId}/chapters/${ch.id}/lessons`}>
                  <Button variant="outline" size="sm" className="gap-1">Lessons <ChevronRight className="h-3 w-3" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => openEdit(ch)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteChapter.mutate(ch.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminChapters;
