import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, CheckCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface QuestionForm {
  question_text: string;
  question_type: "mcq" | "written";
  options: string[];
  correct_answer: string;
  explanation: string;
  grade: number | null;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  lesson_id: string | null;
  is_active: boolean;
}

const emptyForm: QuestionForm = {
  question_text: "",
  question_type: "mcq",
  options: ["", "", "", ""],
  correct_answer: "",
  explanation: "",
  grade: null,
  topic: "",
  difficulty: "medium",
  lesson_id: null,
  is_active: true,
};

const AdminQuizzes = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [tab, setTab] = useState<"questions" | "results">("questions");
  const [quizPassword, setQuizPassword] = useState("");
  const [addMode, setAddMode] = useState<"create" | "approved">("create");
  const [selectedApproved, setSelectedApproved] = useState<string[]>([]);

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").limit(1).single();
      return data;
    },
  });

  // Sync password from settings
  useState(() => {
    if (settings?.quiz_password) setQuizPassword(settings.quiz_password);
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!settings?.id) return;
      const { error } = await supabase
        .from("platform_settings")
        .update({ quiz_password: password || null })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Quiz password updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["admin-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ["admin-quiz-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_results")
        .select("*, lessons(title)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["admin-lessons-list"],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("id, title").order("title");
      return data ?? [];
    },
  });

  // Fetch approved questions from instructor submissions (not already in active quiz pool)
  const { data: approvedQuestions = [] } = useQuery({
    queryKey: ["approved-questions-for-import"],
    queryFn: async () => {
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("approval_status", "approved")
        .eq("is_active", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const importApprovedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("questions")
        .update({ is_active: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      queryClient.invalidateQueries({ queryKey: ["approved-questions-for-import"] });
      toast.success("Approved questions imported to quiz pool");
      setSelectedApproved([]);
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (f: QuestionForm) => {
      const payload = {
        question_text: f.question_text,
        question_type: f.question_type,
        options: f.question_type === "mcq" ? f.options.filter(Boolean) : [],
        correct_answer: f.correct_answer,
        explanation: f.explanation || null,
        grade: f.grade,
        topic: f.topic || null,
        difficulty: f.difficulty,
        lesson_id: f.lesson_id || null,
        is_active: f.is_active,
        created_by: user?.id,
      };
      if (editId) {
        const { error } = await supabase.from("questions").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("questions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success(editId ? "Question updated" : "Question created");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success("Question deleted");
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setAddMode("create");
    setSelectedApproved([]);
  };

  const openEdit = (q: any) => {
    setEditId(q.id);
    const opts = Array.isArray(q.options) ? q.options : [];
    while (opts.length < 4) opts.push("");
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      options: opts,
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
      grade: q.grade,
      topic: q.topic || "",
      difficulty: q.difficulty || "medium",
      lesson_id: q.lesson_id,
      is_active: q.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question_text || !form.correct_answer) {
      toast.error("Question text and correct answer are required");
      return;
    }
    saveMutation.mutate(form);
  };

  const avgScore = results.length
    ? Math.round(results.reduce((a: number, r: any) => a + (r.score / r.total) * 100, 0) / results.length)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Quiz Management</h2>
            <p className="text-sm text-muted-foreground">
              {questions.length} questions · {results.length} attempts · Avg: {avgScore}%
            </p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => { setForm(emptyForm); setEditId(null); }}>
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Question" : "Add Question"}</DialogTitle>
              </DialogHeader>

              {/* Mode toggle - only show when creating new */}
              {!editId && (
                <div className="flex gap-2 rounded-lg border border-border p-1 bg-muted">
                  <button
                    type="button"
                    onClick={() => setAddMode("create")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${addMode === "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Sparkles className="h-4 w-4" /> Create New
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("approved")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${addMode === "approved" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <CheckCircle className="h-4 w-4" /> Import Approved
                  </button>
                </div>
              )}

              {/* Import Approved Mode */}
              {!editId && addMode === "approved" ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select approved questions to add to the active quiz pool.
                  </p>
                  {approvedQuestions.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      No approved inactive questions available to import.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {approvedQuestions.map((q: any) => (
                        <label
                          key={q.id}
                          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${selectedApproved.includes(q.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                        >
                          <Checkbox
                            checked={selectedApproved.includes(q.id)}
                            onCheckedChange={(checked) => {
                              setSelectedApproved(prev =>
                                checked ? [...prev, q.id] : prev.filter(id => id !== q.id)
                              );
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{q.question_text}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-xs">{q.question_type === "mcq" ? "MCQ" : "Written"}</Badge>
                              <Badge variant="secondary" className="text-xs">{q.difficulty}</Badge>
                              {q.topic && <span className="text-xs text-muted-foreground">{q.topic}</span>}
                              {q.grade && <span className="text-xs text-muted-foreground">Grade {q.grade}</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-muted-foreground">{selectedApproved.length} selected</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                      <Button
                        disabled={selectedApproved.length === 0 || importApprovedMutation.isPending}
                        onClick={() => importApprovedMutation.mutate(selectedApproved)}
                      >
                        {importApprovedMutation.isPending ? "Importing..." : `Import ${selectedApproved.length} Question${selectedApproved.length !== 1 ? "s" : ""}`}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Question Text *</Label>
                  <Textarea
                    value={form.question_text}
                    onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                    placeholder="Enter your question..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.question_type} onValueChange={(v: "mcq" | "written") => setForm({ ...form, question_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="written">Written Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v: "easy" | "medium" | "hard") => setForm({ ...form, difficulty: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.question_type === "mcq" && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...form.options];
                            newOpts[i] = e.target.value;
                            setForm({ ...form, options: newOpts });
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Correct Answer *</Label>
                  {form.question_type === "mcq" ? (
                    <Select value={form.correct_answer} onValueChange={(v) => setForm({ ...form, correct_answer: v })}>
                      <SelectTrigger><SelectValue placeholder="Select correct option" /></SelectTrigger>
                      <SelectContent>
                        {form.options.filter(Boolean).map((opt, i) => (
                          <SelectItem key={i} value={String(i)}>{String.fromCharCode(65 + i)}: {opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={form.correct_answer}
                      onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
                      placeholder="Expected answer..."
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Explanation</Label>
                  <Textarea
                    value={form.explanation}
                    onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                    placeholder="Explain the correct answer..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Input
                      type="number"
                      value={form.grade ?? ""}
                      onChange={(e) => setForm({ ...form, grade: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Topic</Label>
                    <Input
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      placeholder="e.g. Algebra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lesson</Label>
                    <Select value={form.lesson_id ?? "none"} onValueChange={(v) => setForm({ ...form, lesson_id: v === "none" ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {lessons.map((l: any) => (
                          <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Quiz Password */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <Label className="text-sm font-medium">Quiz Access Password</Label>
          <p className="mb-2 text-xs text-muted-foreground">Students must enter this password to start a quiz. Leave empty to disable.</p>
          <div className="flex gap-2">
            <Input
              value={quizPassword ?? settings?.quiz_password ?? ""}
              onChange={(e) => setQuizPassword(e.target.value)}
              placeholder="No password set"
              className="max-w-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => updatePasswordMutation.mutate(quizPassword)}
              disabled={updatePasswordMutation.isPending}
            >
              {updatePasswordMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("questions")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "questions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Questions ({questions.length})
          </button>
          <button
            onClick={() => setTab("results")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "results" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Results ({results.length})
          </button>
        </div>

        {tab === "questions" ? (
          <div className="rounded-xl border border-border bg-card shadow-card">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : questions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No questions yet. Click "Add Question" to create one.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {questions.map((q: any) => (
                  <div key={q.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{q.question_text}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{q.question_type === "mcq" ? "MCQ" : "Written"}</Badge>
                        <Badge variant={q.difficulty === "easy" ? "secondary" : q.difficulty === "hard" ? "destructive" : "default"}>
                          {q.difficulty}
                        </Badge>
                        {q.topic && <span className="text-xs text-muted-foreground">{q.topic}</span>}
                        {q.grade && <span className="text-xs text-muted-foreground">Grade {q.grade}</span>}
                        {!q.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(q.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-card">
            {results.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No quiz attempts yet</div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((r: any) => (
                  <div key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.topic || r.lessons?.title || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={r.score / r.total >= 0.7 ? "default" : "destructive"}>
                        {r.score}/{r.total} ({Math.round((r.score / r.total) * 100)}%)
                      </Badge>
                      {r.grade && <span className="text-xs text-muted-foreground">Grade {r.grade}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminQuizzes;
