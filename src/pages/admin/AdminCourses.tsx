import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AdminCourses = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", price: "0", is_published: false, grade_target: "" });
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        price: parseFloat(form.price) || 0,
        is_published: form.is_published,
        grade_target: form.grade_target ? parseInt(form.grade_target) : null,
      };
      if (editId) {
        const { error } = await supabase.from("courses").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(editId ? "Course updated" : "Course created");
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditId(null);
    setForm({ title: "", description: "", price: "0", is_published: false, grade_target: "" });
  };

  const openEdit = (course: any) => {
    setEditId(course.id);
    setForm({
      title: course.title,
      description: course.description ?? "",
      price: String(course.price ?? 0),
      is_published: course.is_published ?? false,
      grade_target: course.grade_target ? String(course.grade_target) : "",
    });
    setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Course Management</h2>
            <p className="text-sm text-muted-foreground">{courses.length} courses</p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="9">Grade 9</SelectItem>
                <SelectItem value="10">Grade 10</SelectItem>
                <SelectItem value="11">Grade 11</SelectItem>
                <SelectItem value="12">Grade 12</SelectItem>
              </SelectContent>
            </Select>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Course</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Course" : "New Course"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Title</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Grade 12 Mathematics" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Grade Target</label>
                  <Select value={form.grade_target} onValueChange={(v) => setForm({ ...form, grade_target: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="All grades" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All grades</SelectItem>
                      <SelectItem value="9">Grade 9</SelectItem>
                      <SelectItem value="10">Grade 10</SelectItem>
                      <SelectItem value="11">Grade 11</SelectItem>
                      <SelectItem value="12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Price (0 = free)</label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                  <span className="text-sm">Published</span>
                </div>
                <Button onClick={() => saveCourse.mutate()} disabled={!form.title || saveCourse.isPending} className="w-full">
                  {saveCourse.isPending ? "Saving..." : editId ? "Update Course" : "Create Course"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No courses yet. Create your first course!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses
              .filter((c) => gradeFilter === "all" || c.grade_target === parseInt(gradeFilter))
              .map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold">{c.title}</h3>
                  <div className="flex gap-1 shrink-0">
                    {c.grade_target && (
                      <Badge variant="secondary">G{c.grade_target}</Badge>
                    )}
                    <Badge variant={c.is_published ? "default" : "outline"}>
                      {c.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{c.description || "No description"}</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  Price: {Number(c.price) === 0 ? "Free" : `${c.price} ETB`}
                </p>
                <div className="flex gap-2">
                  <Link to={`/admin/courses/${c.id}/chapters`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      Chapters <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteCourse.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCourses;
