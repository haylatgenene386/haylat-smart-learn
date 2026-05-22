import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileQuestion, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface ExamForm {
  title: string;
  course_id: string;
  description: string;
  total_marks: number;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  randomize_questions: boolean;
  show_result_immediately: boolean;
  allow_retake: boolean;
  max_retakes: number;
  retake_wait_hours: number;
  prevent_backtracking: boolean;
  pass_percentage: number;
  access_password: string;
  grade_target: string;
}

const emptyForm: ExamForm = {
  title: "", course_id: "", description: "", total_marks: 100,
  duration_minutes: 60, start_time: "", end_time: "", is_active: false,
  randomize_questions: false, show_result_immediately: true,
  allow_retake: false, max_retakes: 1, retake_wait_hours: 0,
  prevent_backtracking: false, pass_percentage: 50,
  access_password: "", grade_target: "",
};

const AdminExams = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamForm>(emptyForm);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title");
      return data ?? [];
    },
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exams")
        .select("*, courses(title)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        course_id: form.course_id || null,
        access_password: form.access_password || null,
        grade_target: form.grade_target ? parseInt(form.grade_target) : null,
        created_by: user!.id,
      };
      if (editId) {
        const { created_by, ...updatePayload } = payload;
        const { error } = await supabase.from("exams").update(updatePayload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exams").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exams"] });
      toast.success(editId ? "Exam updated" : "Exam created");
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exams"] });
      toast.success("Exam deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("exams").update({ is_active: !current }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-exams"] });
    toast.success(!current ? "Exam activated" : "Exam deactivated");
  };

  const openEdit = (exam: any) => {
    setEditId(exam.id);
    setForm({
      title: exam.title,
      course_id: exam.course_id ?? "",
      description: exam.description ?? "",
      total_marks: exam.total_marks,
      duration_minutes: exam.duration_minutes,
      start_time: exam.start_time ? exam.start_time.slice(0, 16) : "",
      end_time: exam.end_time ? exam.end_time.slice(0, 16) : "",
      is_active: exam.is_active,
      randomize_questions: exam.randomize_questions,
      show_result_immediately: exam.show_result_immediately,
      allow_retake: exam.allow_retake,
      max_retakes: exam.max_retakes ?? 1,
      retake_wait_hours: exam.retake_wait_hours ?? 0,
      prevent_backtracking: exam.prevent_backtracking,
      pass_percentage: exam.pass_percentage,
      access_password: exam.access_password ?? "",
      grade_target: exam.grade_target ? String(exam.grade_target) : "",
    });
    setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Exam Management</h2>
          <p className="text-sm text-muted-foreground">Create and manage exams</p>
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
          <Link to="/admin/exam-results">
            <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" /> View Results</Button>
          </Link>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="h-4 w-4 mr-1" /> New Exam</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Exam" : "Create Exam"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Midterm Exam" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Course</Label>
                    <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {courses?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Grade Target</Label>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Pass Percentage</Label>
                    <Input type="number" value={form.pass_percentage} onChange={(e) => setForm({ ...form, pass_percentage: +e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Total Marks</Label>
                    <Input type="number" value={form.total_marks} onChange={(e) => setForm({ ...form, total_marks: +e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Date & Time</Label>
                    <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Date & Time</Label>
                    <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={form.randomize_questions} onCheckedChange={(v) => setForm({ ...form, randomize_questions: v })} />
                    <Label>Randomize Questions</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.show_result_immediately} onCheckedChange={(v) => setForm({ ...form, show_result_immediately: v })} />
                    <Label>Show Result Immediately</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.allow_retake} onCheckedChange={(v) => setForm({ ...form, allow_retake: v })} />
                    <Label>Allow Retake</Label>
                  </div>
                </div>
                {form.allow_retake && (
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4 bg-muted/30">
                    <div className="grid gap-2">
                      <Label>Max Retakes</Label>
                      <Input type="number" min={1} max={99} value={form.max_retakes} onChange={(e) => setForm({ ...form, max_retakes: +e.target.value })} />
                      <p className="text-xs text-muted-foreground">Number of times a student can retake</p>
                    </div>
                    <div className="grid gap-2">
                      <Label>Wait Period (hours)</Label>
                      <Input type="number" min={0} value={form.retake_wait_hours} onChange={(e) => setForm({ ...form, retake_wait_hours: +e.target.value })} />
                      <p className="text-xs text-muted-foreground">Hours to wait before retaking (0 = no wait)</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={form.prevent_backtracking} onCheckedChange={(v) => setForm({ ...form, prevent_backtracking: v })} />
                    <Label>Prevent Backtracking</Label>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Access Password (optional)</Label>
                  <Input
                    type="text"
                    value={form.access_password}
                    onChange={(e) => setForm({ ...form, access_password: e.target.value })}
                    placeholder="Leave empty for no password"
                  />
                  <p className="text-xs text-muted-foreground">Students must enter this password before starting the exam</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : exams?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No exams yet</TableCell></TableRow>
            ) : exams?.filter((exam: any) => gradeFilter === "all" || exam.grade_target === parseInt(gradeFilter)).map((exam: any) => (
              <TableRow key={exam.id}>
                <TableCell className="font-medium">{exam.title}</TableCell>
                <TableCell>{exam.courses?.title ?? "—"}</TableCell>
                <TableCell>{exam.grade_target ? <Badge variant="secondary">G{exam.grade_target}</Badge> : "All"}</TableCell>
                <TableCell>{exam.duration_minutes} min</TableCell>
                <TableCell>{exam.total_marks}</TableCell>
                <TableCell>
                  <Badge
                    variant={exam.is_active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleActive(exam.id, exam.is_active)}
                  >
                    {exam.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link to={`/admin/exams/${exam.id}/questions`}>
                      <Button variant="ghost" size="icon" title="Manage Questions">
                        <FileQuestion className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(exam)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(exam.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminExams;
