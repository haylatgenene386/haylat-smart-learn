import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, ArrowLeft, BookOpen, Loader2 } from "lucide-react";

interface QForm {
  question_text: string;
  question_type: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  marks: number;
}

const emptyQ: QForm = {
  question_text: "", question_type: "mcq",
  option_a: "", option_b: "", option_c: "", option_d: "",
  correct_answer: "", marks: 1,
};

const AdminExamQuestions = () => {
  const { examId } = useParams<{ examId: string }>();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<QForm>(emptyQ);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: exam } = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const { data } = await supabase.from("exams").select("*").eq("id", examId!).single();
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["exam-questions", examId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_questions")
        .select("*")
        .eq("exam_id", examId!)
        .order("sort_order");
      return data ?? [];
    },
  });

  // Fetch approved questions from the question bank for this exam's course
  const { data: approvedQuestions = [], isLoading: loadingApproved } = useQuery({
    queryKey: ["approved-questions-for-exam", exam?.course_id],
    enabled: importOpen && !!exam?.course_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .eq("course_id", exam!.course_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get submitter names
      const submitterIds = data.filter(q => q.submitted_by).map(q => q.submitted_by!);
      let profileMap = new Map<string, string>();
      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", submitterIds);
        profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.full_name ?? "Unknown"]));
      }

      return data.map(q => ({
        ...q,
        submitter_name: q.submitted_by ? profileMap.get(q.submitted_by) || "Unknown" : "System",
      }));
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const selected = approvedQuestions.filter(q => selectedIds.has(q.id));
      if (selected.length === 0) throw new Error("No questions selected");

      const currentCount = questions?.length ?? 0;
      const rows = selected.map((q, i) => ({
        exam_id: examId!,
        question_text: q.question_text,
        question_type: q.question_type === "mcq" ? "mcq" : "short_answer",
        correct_answer: q.correct_answer,
        marks: 1,
        sort_order: currentCount + i + 1,
        option_a: q.question_type === "mcq" && Array.isArray(q.options) ? (q.options as string[])[0] ?? null : null,
        option_b: q.question_type === "mcq" && Array.isArray(q.options) ? (q.options as string[])[1] ?? null : null,
        option_c: q.question_type === "mcq" && Array.isArray(q.options) ? (q.options as string[])[2] ?? null : null,
        option_d: q.question_type === "mcq" && Array.isArray(q.options) ? (q.options as string[])[3] ?? null : null,
      }));

      const { error } = await supabase.from("exam_questions").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
      toast.success(`${selectedIds.size} question(s) added to exam`);
      setImportOpen(false);
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, exam_id: examId!, sort_order: (questions?.length ?? 0) + 1 };
      if (editId) {
        const { exam_id, sort_order, ...update } = payload;
        const { error } = await supabase.from("exam_questions").update(update).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exam_questions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
      toast.success(editId ? "Question updated" : "Question added");
      setOpen(false);
      setEditId(null);
      setForm(emptyQ);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
      toast.success("Question deleted");
    },
  });

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) { toast.error("File must have a header row and at least one question"); return; }
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        exam_id: examId!,
        question_text: cols[0] ?? "",
        question_type: cols[1] ?? "mcq",
        option_a: cols[2] ?? "",
        option_b: cols[3] ?? "",
        option_c: cols[4] ?? "",
        option_d: cols[5] ?? "",
        correct_answer: cols[6] ?? "",
        marks: parseInt(cols[7]) || 1,
        sort_order: (questions?.length ?? 0) + 1,
      };
    }).filter((r) => r.question_text);
    const { error } = await supabase.from("exam_questions").insert(rows);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
    toast.success(`${rows.length} questions imported`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openEdit = (q: any) => {
    setEditId(q.id);
    setForm({
      question_text: q.question_text, question_type: q.question_type,
      option_a: q.option_a ?? "", option_b: q.option_b ?? "",
      option_c: q.option_c ?? "", option_d: q.option_d ?? "",
      correct_answer: q.correct_answer, marks: q.marks,
    });
    setOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === approvedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvedQuestions.map(q => q.id)));
    }
  };

  const typeLabel: Record<string, string> = { mcq: "MCQ", true_false: "True/False", short_answer: "Short Answer", written: "Written" };

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link to="/admin/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Exams
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Questions: {exam?.title}</h2>
            <p className="text-sm text-muted-foreground">{questions?.length ?? 0} questions · Total marks: {questions?.reduce((s, q: any) => s + q.marks, 0) ?? 0}</p>
          </div>
          <div className="flex gap-2">
            {exam?.course_id && (
              <Button variant="outline" size="sm" onClick={() => { setImportOpen(true); setSelectedIds(new Set()); }}>
                <BookOpen className="h-4 w-4 mr-1" /> Import Approved Questions
              </Button>
            )}
            <label>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Import CSV
              </Button>
            </label>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyQ); } }}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm"><Plus className="h-4 w-4 mr-1" /> Add Question</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editId ? "Edit Question" : "Add Question"}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Question *</Label>
                    <Textarea value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select value={form.question_type} onValueChange={(v) => setForm({ ...form, question_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">MCQ</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Marks</Label>
                      <Input type="number" value={form.marks} onChange={(e) => setForm({ ...form, marks: +e.target.value })} />
                    </div>
                  </div>
                  {form.question_type === "mcq" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1"><Label className="text-xs">Option A</Label><Input value={form.option_a} onChange={(e) => setForm({ ...form, option_a: e.target.value })} /></div>
                      <div className="grid gap-1"><Label className="text-xs">Option B</Label><Input value={form.option_b} onChange={(e) => setForm({ ...form, option_b: e.target.value })} /></div>
                      <div className="grid gap-1"><Label className="text-xs">Option C</Label><Input value={form.option_c} onChange={(e) => setForm({ ...form, option_c: e.target.value })} /></div>
                      <div className="grid gap-1"><Label className="text-xs">Option D</Label><Input value={form.option_d} onChange={(e) => setForm({ ...form, option_d: e.target.value })} /></div>
                    </div>
                  )}
                  {form.question_type === "true_false" && (
                    <div className="grid gap-2">
                      <Label>Correct Answer</Label>
                      <Select value={form.correct_answer} onValueChange={(v) => setForm({ ...form, correct_answer: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="True">True</SelectItem>
                          <SelectItem value="False">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(form.question_type === "mcq" || form.question_type === "short_answer") && (
                    <div className="grid gap-2">
                      <Label>Correct Answer *</Label>
                      <Input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} placeholder={form.question_type === "mcq" ? "e.g. A, B, C, or D" : "Expected answer"} />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={() => saveMutation.mutate()} disabled={!form.question_text || !form.correct_answer || saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main exam questions table */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Answer</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : questions?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No questions yet. Add manually or import approved questions.</TableCell></TableRow>
            ) : questions?.map((q: any, i: number) => (
              <TableRow key={q.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="max-w-xs truncate">{q.question_text}</TableCell>
                <TableCell><Badge variant="outline">{typeLabel[q.question_type] ?? q.question_type}</Badge></TableCell>
                <TableCell>{q.marks}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{q.correct_answer}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Import Approved Questions Dialog */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) setSelectedIds(new Set()); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Approved Questions</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select approved questions from the question bank to add to this exam.
            </p>
          </DialogHeader>

          {loadingApproved ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : approvedQuestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No approved questions available for this course yet.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === approvedQuestions.length && approvedQuestions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Select All ({approvedQuestions.length})
                  </span>
                </div>
                <Badge variant="secondary">{selectedIds.size} selected</Badge>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {approvedQuestions.map((q: any) => (
                  <div
                    key={q.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedIds.has(q.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleSelect(q.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(q.id)}
                      onCheckedChange={() => toggleSelect(q.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-snug">{q.question_text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{typeLabel[q.question_type] ?? q.question_type}</Badge>
                        <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                        <span className="text-xs text-muted-foreground">by {q.submitter_name}</span>
                      </div>
                      {q.question_type === "mcq" && Array.isArray(q.options) && (
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          {(q.options as string[]).map((opt: string, i: number) => (
                            <span key={i} className={`text-xs rounded px-1.5 py-0.5 ${opt === q.correct_answer ? "bg-green-100 text-green-800 font-medium" : "bg-muted"}`}>
                              {String.fromCharCode(65 + i)}. {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={selectedIds.size === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
              ) : (
                `Add ${selectedIds.size} Question${selectedIds.size !== 1 ? "s" : ""} to Exam`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminExamQuestions;
