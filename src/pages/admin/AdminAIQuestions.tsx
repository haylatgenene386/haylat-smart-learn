import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Brain, Sparkles, Check, Pencil, Trash2, FileText, ArrowRight, Loader2, Download, X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";

interface GeneratedQ {
  question_type: string;
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  explanation?: string;
  difficulty?: string;
  approved?: boolean;
}

const AdminAIQuestions = () => {
  const { user, isInstructor } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [numMcq, setNumMcq] = useState(5);
  const [numTf, setNumTf] = useState(3);
  const [numShort, setNumShort] = useState(2);
  const [numEssay, setNumEssay] = useState(0);
  const [difficultyMix, setDifficultyMix] = useState("balanced");
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQ[]>([]);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GeneratedQ | null>(null);

  // Convert to exam state
  const [showConvert, setShowConvert] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examDesc, setExamDesc] = useState("");
  const [examDuration, setExamDuration] = useState(60);
  const [examPass, setExamPass] = useState(50);
  const [creatingExam, setCreatingExam] = useState(false);

  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ["materials-for-ai"],
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("id, title, extracted_text, status, file_type, course_id, chapter_id, courses(title), chapters(title)")
        .eq("status", "ready")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-for-ai"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title");
      return data ?? [];
    },
  });

  const toggleMaterial = (id: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    const selectedMats = materials.filter((m: any) => selectedMaterials.includes(m.id));
    if (selectedMats.length === 0) {
      toast.error("Please select at least one material");
      return;
    }

    // Combine extracted text from all selected materials
    const combinedText = selectedMats
      .map((m: any) => m.extracted_text || "")
      .filter(Boolean)
      .join("\n\n--- Next Material ---\n\n");

    if (combinedText.length < 50) {
      toast.error("Selected materials have insufficient extracted text");
      return;
    }

    setGenerating(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-from-material`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            material_text: combinedText,
            num_mcq: numMcq,
            num_tf: numTf,
            num_short: numShort,
            num_essay: numEssay,
            difficulty_mix: difficultyMix,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Request failed (${resp.status})`);
      }

      const data = await resp.json();
      setQuestions((data.questions ?? []).map((q: GeneratedQ) => ({ ...q, approved: false })));
      toast.success(`Generated ${data.questions?.length ?? 0} questions from ${selectedMats.length} material(s)!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToBank = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Determine course_id from selected materials
      const selectedMats = materials.filter((m: any) => selectedMaterials.includes(m.id));
      const courseId = selectedMats.length > 0 ? (selectedMats[0] as any).course_id : null;

      const rows = questions.map((q) => ({
        question_text: q.question_text,
        question_type: (q.question_type === "mcq" || q.question_type === "true_false") ? "mcq" : "written",
        correct_answer: q.correct_answer,
        options: q.question_type === "mcq"
          ? [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)
          : q.question_type === "true_false"
          ? ["True", "False"]
          : null,
        explanation: q.explanation ?? null,
        difficulty: q.difficulty ?? "medium",
        is_active: !isInstructor,
        created_by: user.id,
        approval_status: isInstructor ? "draft" : "approved",
        submitted_by: isInstructor ? user.id : null,
        course_id: courseId,
      }));
      const { error } = await supabase.from("questions").insert(rows as any);
      if (error) throw error;
      toast.success(isInstructor ? "Questions saved to your question bank" : t("ai_questions.questions_saved"));
      if (isInstructor) navigate("/instructor/questions");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExam = async () => {
    if (!user || !examTitle) return;
    setCreatingExam(true);
    try {
      const totalMarks = questions.reduce((s, q) => s + (q.question_type === "essay" ? 5 : q.question_type === "short_answer" ? 3 : 1), 0);
      const { data: exam, error: examErr } = await supabase
        .from("exams")
        .insert({
          title: examTitle,
          description: examDesc,
          duration_minutes: examDuration,
          pass_percentage: examPass,
          total_marks: totalMarks,
          created_by: user.id,
          is_active: false,
          show_result_immediately: true,
        })
        .select()
        .single();
      if (examErr) throw examErr;

      const examQuestions = questions.map((q, i) => ({
        exam_id: exam.id,
        question_text: q.question_text,
        question_type: q.question_type === "true_false" ? "true_false" : q.question_type === "essay" ? "short_answer" : q.question_type,
        option_a: q.option_a ?? null,
        option_b: q.option_b ?? null,
        option_c: q.option_c ?? null,
        option_d: q.option_d ?? null,
        correct_answer: q.correct_answer,
        marks: q.question_type === "essay" ? 5 : q.question_type === "short_answer" ? 3 : 1,
        sort_order: i + 1,
      }));
      const { error: qErr } = await supabase.from("exam_questions").insert(examQuestions);
      if (qErr) throw qErr;

      toast.success(t("ai_questions.exam_created"));
      setShowConvert(false);
      navigate(`/admin/exams/${exam.id}/questions`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingExam(false);
    }
  };

  const toggleApprove = (idx: number) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, approved: !q.approved } : q));
  };

  const deleteQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const openEdit = (idx: number) => {
    setEditIdx(idx);
    setEditForm({ ...questions[idx] });
  };

  const saveEdit = () => {
    if (editIdx === null || !editForm) return;
    setQuestions((prev) => prev.map((q, i) => i === editIdx ? editForm : q));
    setEditIdx(null);
    setEditForm(null);
  };

  const typeLabel: Record<string, string> = {
    mcq: "MCQ", true_false: "True/False", short_answer: "Short Answer", essay: "Essay",
  };

  const typeBadgeColor: Record<string, string> = {
    mcq: "bg-primary/10 text-primary",
    true_false: "bg-secondary/20 text-secondary-foreground",
    short_answer: "bg-accent/10 text-accent-foreground",
    essay: "bg-muted text-muted-foreground",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> {t("ai_questions.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("ai_questions.subtitle")}</p>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("ai_questions.question_config")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>{t("ai_questions.select_material")} ({selectedMaterials.length} selected)</Label>
                {selectedMaterials.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMaterials([])} className="h-6 px-2 text-xs">
                    <X className="h-3 w-3 mr-1" /> Clear all
                  </Button>
                )}
              </div>
              {loadingMaterials ? (
                <p className="text-sm text-muted-foreground">Loading materials...</p>
              ) : materials.length === 0 ? (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>{t("ai_questions.no_materials")}</p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin/materials")}>
                    Go to Materials to Upload
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md max-h-[250px] overflow-y-auto">
                  {materials.map((m: any) => (
                    <div
                      key={m.id}
                      className={`flex items-start gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedMaterials.includes(m.id) ? "bg-primary/5" : ""
                      }`}
                      onClick={() => toggleMaterial(m.id)}
                    >
                      <Checkbox
                        checked={selectedMaterials.includes(m.id)}
                        onCheckedChange={() => toggleMaterial(m.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-sm truncate">{m.title}</span>
                          {m.file_type && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                              {m.file_type.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(m as any).courses?.title ?? "No Course"}
                          {(m as any).chapters?.title ? ` → ${(m as any).chapters.title}` : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {m.extracted_text?.length ?? 0} characters
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedMaterials.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total: {materials
                    .filter((m: any) => selectedMaterials.includes(m.id))
                    .reduce((sum: number, m: any) => sum + (m.extracted_text?.length ?? 0), 0)
                    .toLocaleString()} characters from {selectedMaterials.length} material(s)
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">{t("ai_questions.num_mcq")}</Label>
                <Input type="number" min={0} max={30} value={numMcq} onChange={(e) => setNumMcq(+e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">{t("ai_questions.num_tf")}</Label>
                <Input type="number" min={0} max={20} value={numTf} onChange={(e) => setNumTf(+e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">{t("ai_questions.num_short")}</Label>
                <Input type="number" min={0} max={15} value={numShort} onChange={(e) => setNumShort(+e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">{t("ai_questions.num_essay")}</Label>
                <Input type="number" min={0} max={10} value={numEssay} onChange={(e) => setNumEssay(+e.target.value)} />
              </div>
              <div className="grid gap-1 col-span-2 md:col-span-5">
                <Label className="text-xs">Difficulty Mix</Label>
                <Select value={difficultyMix} onValueChange={setDifficultyMix}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">
                      <span className="flex items-center gap-2">Balanced — <span className="text-muted-foreground text-xs">25% Hard, 25% Medium, 50% Easy</span></span>
                    </SelectItem>
                    <SelectItem value="hard_heavy">
                      <span className="flex items-center gap-2">Hard Heavy — <span className="text-muted-foreground text-xs">50% Hard, 25% Medium, 25% Easy</span></span>
                    </SelectItem>
                    <SelectItem value="hard_medium">
                      <span className="flex items-center gap-2">Hard + Medium — <span className="text-muted-foreground text-xs">50% Hard, 50% Medium</span></span>
                    </SelectItem>
                    <SelectItem value="hard_easy">
                      <span className="flex items-center gap-2">Hard + Easy — <span className="text-muted-foreground text-xs">50% Hard, 50% Easy</span></span>
                    </SelectItem>
                    <SelectItem value="medium_heavy">
                      <span className="flex items-center gap-2">Medium Heavy — <span className="text-muted-foreground text-xs">25% Hard, 75% Medium</span></span>
                    </SelectItem>
                    <SelectItem value="easy_only">
                      <span className="flex items-center gap-2">Easy Only — <span className="text-muted-foreground text-xs">100% Easy</span></span>
                    </SelectItem>
                    <SelectItem value="medium_only">
                      <span className="flex items-center gap-2">Medium Only — <span className="text-muted-foreground text-xs">100% Medium</span></span>
                    </SelectItem>
                    <SelectItem value="hard_only">
                      <span className="flex items-center gap-2">Hard Only — <span className="text-muted-foreground text-xs">100% Hard</span></span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="hero"
              onClick={handleGenerate}
              disabled={selectedMaterials.length === 0 || generating || (numMcq + numTf + numShort + numEssay === 0)}
              className="gap-2"
            >
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("ai_questions.generating")}</> : <><Sparkles className="h-4 w-4" /> {t("ai_questions.generate")} from {selectedMaterials.length} material(s)</>}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Questions */}
        {questions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("ai_questions.generated_questions")} ({questions.length})</CardTitle>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" onClick={handleSaveToBank} disabled={saving}>
                     <Download className="h-4 w-4 mr-1" /> {saving ? t("ai_questions.saving") : isInstructor ? "Save to My Questions" : t("ai_questions.save_to_bank")}
                   </Button>
                   {!isInstructor && (
                     <Button variant="hero" size="sm" onClick={() => setShowConvert(true)} className="gap-1">
                       <ArrowRight className="h-4 w-4" /> {t("ai_questions.convert_to_exam")}
                     </Button>
                   )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={typeBadgeColor[q.question_type] || ""}>
                          {typeLabel[q.question_type] ?? q.question_type}
                        </Badge>
                        {q.difficulty && (
                          <Badge variant="outline" className="text-xs capitalize">{q.difficulty}</Badge>
                        )}
                        {q.approved && (
                          <Badge className="bg-primary/10 text-primary"><Check className="h-3 w-3 mr-1" />{t("ai_questions.approved")}</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{idx + 1}. {q.question_text}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => toggleApprove(idx)} title={t("ai_questions.approve")}>
                        <Check className={`h-4 w-4 ${q.approved ? "text-primary" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(idx)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteQuestion(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  {q.question_type === "mcq" && (
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground pl-4">
                      <span>A: {q.option_a}</span>
                      <span>B: {q.option_b}</span>
                      <span>C: {q.option_c}</span>
                      <span>D: {q.option_d}</span>
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground pl-4">
                    <span><strong>{t("ai_questions.correct_answer")}:</strong> {q.correct_answer}</span>
                    {q.explanation && <span><strong>{t("ai_questions.explanation")}:</strong> {q.explanation}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {questions.length === 0 && !generating && (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t("ai_questions.no_questions")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editIdx !== null} onOpenChange={(v) => { if (!v) { setEditIdx(null); setEditForm(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("ai_questions.edit")}</DialogTitle></DialogHeader>
          {editForm && (
            <div className="grid gap-3 py-2">
              <div className="grid gap-1">
                <Label className="text-xs">{t("exams.question")} *</Label>
                <Textarea value={editForm.question_text} onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })} />
              </div>
              {editForm.question_type === "mcq" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1"><Label className="text-xs">A</Label><Input value={editForm.option_a ?? ""} onChange={(e) => setEditForm({ ...editForm, option_a: e.target.value })} /></div>
                  <div className="grid gap-1"><Label className="text-xs">B</Label><Input value={editForm.option_b ?? ""} onChange={(e) => setEditForm({ ...editForm, option_b: e.target.value })} /></div>
                  <div className="grid gap-1"><Label className="text-xs">C</Label><Input value={editForm.option_c ?? ""} onChange={(e) => setEditForm({ ...editForm, option_c: e.target.value })} /></div>
                  <div className="grid gap-1"><Label className="text-xs">D</Label><Input value={editForm.option_d ?? ""} onChange={(e) => setEditForm({ ...editForm, option_d: e.target.value })} /></div>
                </div>
              )}
              <div className="grid gap-1">
                <Label className="text-xs">{t("ai_questions.correct_answer")} *</Label>
                <Input value={editForm.correct_answer} onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">{t("ai_questions.explanation")}</Label>
                <Textarea value={editForm.explanation ?? ""} onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveEdit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Exam Dialog */}
      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("ai_questions.convert_to_exam")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("ai_questions.convert_prompt")}</p>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>{t("ai_questions.exam_title")} *</Label>
              <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>{t("ai_questions.exam_description")}</Label>
              <Textarea value={examDesc} onChange={(e) => setExamDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>{t("ai_questions.duration")}</Label>
                <Input type="number" value={examDuration} onChange={(e) => setExamDuration(+e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>{t("ai_questions.passing_score")}</Label>
                <Input type="number" value={examPass} onChange={(e) => setExamPass(+e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvert(false)}>{t("common.cancel")}</Button>
            <Button variant="hero" onClick={handleCreateExam} disabled={!examTitle || creatingExam}>
              {creatingExam ? t("ai_questions.creating_exam") : t("ai_questions.create_exam")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAIQuestions;
