import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, ChevronLeft, ChevronRight, AlertTriangle, Flag } from "lucide-react";
import { Input } from "@/components/ui/input";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

const TakeExam = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percentage: number; pass: boolean } | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const warned = useRef(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showUnansweredDialog, setShowUnansweredDialog] = useState(false);
  const [unansweredIndices, setUnansweredIndices] = useState<number[]>([]);

  const { data: exam } = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const { data } = await supabase.from("exams").select("*").eq("id", examId!).single();
      return data;
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["exam-questions-take", examId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_questions")
        .select("*")
        .eq("exam_id", examId!)
        .order("sort_order");
      let qs = data ?? [];
      if (exam?.randomize_questions) {
        qs = [...qs].sort(() => Math.random() - 0.5);
      }
      return qs;
    },
    enabled: !!exam,
  });

  // Initialize attempt
  useEffect(() => {
    if (!user || !exam || !questions) return;
    
    if ((exam as any).access_password && !passwordVerified) {
      const checkExisting = async () => {
        const { data: existing } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("exam_id", examId!)
          .eq("student_id", user.id)
          .eq("status", "in_progress")
          .maybeSingle();
        if (existing) {
          setPasswordVerified(true);
        } else {
          setPasswordRequired(true);
        }
      };
      checkExisting();
      return;
    }

    const init = async () => {
      const { data: existing } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("exam_id", examId!)
        .eq("student_id", user.id)
        .eq("status", "in_progress")
        .maybeSingle();

      if (existing) {
        setAttemptId(existing.id);
        const { data: savedAnswers } = await supabase
          .from("exam_answers")
          .select("question_id, student_answer")
          .eq("attempt_id", existing.id);
        if (savedAnswers) {
          const map: Record<string, string> = {};
          savedAnswers.forEach((a: any) => { map[a.question_id] = a.student_answer ?? ""; });
          setAnswers(map);
        }
        const elapsed = (Date.now() - new Date(existing.started_at).getTime()) / 1000;
        const remaining = Math.max(0, exam.duration_minutes * 60 - elapsed);
        setTimeLeft(Math.floor(remaining));
      } else {
        const { data: submittedAttempt } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("exam_id", examId!)
          .eq("student_id", user.id)
          .eq("status", "submitted")
          .maybeSingle();
        if (submittedAttempt && !exam.allow_retake) {
          toast.error("You've already taken this exam");
          navigate("/exams");
          return;
        }
        const { data: newAttempt, error } = await supabase
          .from("exam_attempts")
          .insert({ exam_id: examId!, student_id: user.id, total_marks: exam.total_marks })
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setAttemptId(newAttempt.id);
        setTimeLeft(exam.duration_minutes * 60);
      }
    };
    init();
  }, [user, exam, questions, examId, navigate, passwordVerified]);

  const handlePasswordSubmit = () => {
    if (!exam) return;
    if (passwordInput === (exam as any).access_password) {
      setPasswordRequired(false);
      setPasswordVerified(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password. Please try again.");
    }
  };

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, submitted]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!attemptId || submitted) return;
    autoSaveTimer.current = setInterval(() => saveAnswers(), 10000);
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current); };
  }, [attemptId, answers, submitted]);

  // Prevent page refresh
  useEffect(() => {
    if (submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submitted]);

  const saveAnswers = async () => {
    if (!attemptId || !questions) return;
    for (const q of questions) {
      const ans = answers[q.id];
      if (ans === undefined) continue;
      await supabase
        .from("exam_answers")
        .upsert(
          { attempt_id: attemptId, question_id: q.id, student_answer: ans },
          { onConflict: "attempt_id,question_id" as any }
        );
    }
  };

  // Get unanswered question indices
  const getUnansweredIndices = useCallback(() => {
    if (!questions) return [];
    return questions
      .map((q: any, i: number) => (!answers[q.id] || answers[q.id].trim() === "") ? i : -1)
      .filter((i) => i !== -1);
  }, [questions, answers]);

  // Try to submit — check for unanswered first
  const trySubmit = useCallback(() => {
    const unanswered = getUnansweredIndices();
    if (unanswered.length > 0) {
      setUnansweredIndices(unanswered);
      setShowUnansweredDialog(true);
    } else {
      if (confirm("Are you sure you want to submit? You cannot change your answers after submission.")) {
        handleSubmit(false);
      }
    }
  }, [getUnansweredIndices]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (!attemptId || !questions || submitted) return;
    setSubmitted(true);
    setShowUnansweredDialog(false);

    const answerRows = questions.map((q: any) => {
      const studentAns = answers[q.id] ?? "";
      const isCorrect = q.question_type === "short_answer"
        ? studentAns.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
        : studentAns.trim().toUpperCase() === q.correct_answer.trim().toUpperCase();
      return {
        attempt_id: attemptId,
        question_id: q.id,
        student_answer: studentAns,
        is_correct: isCorrect,
        marks_awarded: isCorrect ? q.marks : 0,
      };
    });

    await supabase.from("exam_answers").delete().eq("attempt_id", attemptId);
    await supabase.from("exam_answers").insert(answerRows);

    const score = answerRows.reduce((s, a) => s + a.marks_awarded, 0);
    const totalMarks = questions.reduce((s: number, q: any) => s + q.marks, 0);
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 10000) / 100 : 0;
    const pass = percentage >= (exam?.pass_percentage ?? 50);

    await supabase.from("exam_attempts").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      score,
      total_marks: totalMarks,
      percentage,
      is_auto_submitted: auto,
    }).eq("id", attemptId);

    setResult({ score, total: totalMarks, percentage, pass });
    if (auto) toast.info("Time's up! Exam auto-submitted.");
    else toast.success("Exam submitted successfully!");
  }, [attemptId, questions, answers, submitted, exam]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!exam || !questions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Password gate
  if (passwordRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 shadow-card">
          <div className="flex flex-col items-center mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold">Enter Exam Password</h2>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              This exam requires a password to access. Please enter the password provided by your instructor.
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                placeholder="Enter exam password"
                autoFocus
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/exams")} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handlePasswordSubmit} disabled={!passwordInput} className="flex-1">
                Start Exam
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Result screen
  if (submitted && result) {
    if (!exam.show_result_immediately) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
            <h2 className="font-display text-2xl font-bold mb-4">Exam Submitted!</h2>
            <p className="text-muted-foreground mb-6">Your results will be available once reviewed by the instructor.</p>
            <Button onClick={() => navigate("/exams")}>Back to Exams</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${result.pass ? "bg-primary/10" : "bg-destructive/10"}`}>
            <span className={`font-display text-3xl font-bold ${result.pass ? "text-primary" : "text-destructive"}`}>
              {result.percentage}%
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold mb-1">{result.pass ? "Congratulations! 🎉" : "Better Luck Next Time"}</h2>
          <Badge variant={result.pass ? "default" : "destructive"} className="mb-4">
            {result.pass ? "PASSED" : "FAILED"}
          </Badge>
          <div className="space-y-2 text-sm text-muted-foreground mb-6">
            <p>Score: <span className="font-semibold text-foreground">{result.score}/{result.total}</span></p>
            <p>Exam: <span className="font-semibold text-foreground">{exam.title}</span></p>
          </div>
          <Button onClick={() => navigate("/exams")} className="w-full">Back to Exams</Button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const isWarning = timeLeft <= 120;
  const isUnanswered = (qId: string) => !answers[qId] || answers[qId].trim() === "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Timer bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-sm">
        <h2 className="font-display text-lg font-semibold truncate">{exam.title}</h2>
        <div className="flex items-center gap-3">
          {/* Unanswered count */}
          {questions && getUnansweredIndices().length > 0 && (
            <div className="flex items-center gap-1 text-sm text-destructive font-medium">
              <Flag className="h-3.5 w-3.5" />
              {getUnansweredIndices().length} unanswered
            </div>
          )}
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono font-bold ${isWarning ? "bg-destructive/10 text-destructive animate-pulse" : "bg-primary/10 text-primary"}`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Question nav sidebar */}
        <aside className="hidden md:flex w-20 flex-col items-center gap-1 border-r border-border bg-card p-3 overflow-y-auto">
          {questions.map((qItem: any, i: number) => {
            const unanswered = isUnanswered(qItem.id);
            return (
              <button
                key={i}
                onClick={() => !exam.prevent_backtracking || i >= currentQ ? setCurrentQ(i) : null}
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  i === currentQ
                    ? "bg-primary text-primary-foreground"
                    : answers[qItem.id]
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                } ${exam.prevent_backtracking && i < currentQ ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {i + 1}
                {/* Red flag for unanswered & visited (not current) */}
                {unanswered && i !== currentQ && i < currentQ + 1 === false && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
                )}
                {/* Show red dot for all unanswered that have been passed */}
                {unanswered && i < currentQ && i !== currentQ && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive border border-card" />
                )}
              </button>
            );
          })}
        </aside>

        {/* Main question */}
        <main className="flex-1 p-6 md:p-10 max-w-3xl mx-auto">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Question {currentQ + 1} of {questions.length}</span>
            <Badge variant="outline">{q.marks} {q.marks === 1 ? "mark" : "marks"}</Badge>
            {isUnanswered(q.id) && currentQ > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <Flag className="h-3 w-3" /> Unanswered
              </Badge>
            )}
          </div>

          <h3 className="font-display text-xl font-semibold mb-6">{q.question_text}</h3>

          {q.question_type === "mcq" && (
            <div className="space-y-3">
              {[
                { key: "A", text: q.option_a },
                { key: "B", text: q.option_b },
                { key: "C", text: q.option_c },
                { key: "D", text: q.option_d },
              ]
                .filter((o) => o.text)
                .map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt.key })}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      answers[q.id] === opt.key
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      answers[q.id] === opt.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>{opt.key}</span>
                    <span className="text-sm">{opt.text}</span>
                  </button>
                ))}
            </div>
          )}

          {q.question_type === "true_false" && (
            <div className="flex gap-4">
              {["True", "False"].map((v) => (
                <button
                  key={v}
                  onClick={() => setAnswers({ ...answers, [q.id]: v })}
                  className={`flex-1 rounded-xl border p-4 text-center font-medium transition-all ${
                    answers[q.id] === v
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {q.question_type === "short_answer" && (
            <Input
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder="Type your answer..."
              className="text-base"
            />
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQ(currentQ - 1)}
              disabled={currentQ === 0 || exam.prevent_backtracking}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>

            {currentQ < questions.length - 1 ? (
              <Button onClick={() => setCurrentQ(currentQ + 1)}>
                Save & Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button variant="hero" onClick={trySubmit}>
                Submit Exam
              </Button>
            )}
          </div>

          {/* Mobile question nav */}
          <div className="mt-6 flex flex-wrap gap-1.5 md:hidden">
            {questions.map((qItem: any, i: number) => {
              const unanswered = isUnanswered(qItem.id);
              return (
                <button
                  key={i}
                  onClick={() => !exam.prevent_backtracking || i >= currentQ ? setCurrentQ(i) : null}
                  className={`relative flex h-8 w-8 items-center justify-center rounded text-xs font-medium ${
                    i === currentQ
                      ? "bg-primary text-primary-foreground"
                      : answers[qItem.id]
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                  {unanswered && i < currentQ && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive border border-card" />
                  )}
                </button>
              );
            })}
          </div>
        </main>
      </div>

      {/* Unanswered Questions Warning Dialog */}
      <Dialog open={showUnansweredDialog} onOpenChange={setShowUnansweredDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Unanswered Questions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You have <span className="font-bold text-destructive">{unansweredIndices.length}</span> unanswered question{unansweredIndices.length > 1 ? "s" : ""}:
            </p>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {unansweredIndices.map((idx) => (
                <button
                  key={idx}
                  onClick={() => { setShowUnansweredDialog(false); setCurrentQ(idx); }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive font-bold text-sm hover:bg-destructive/20 transition-colors cursor-pointer border border-destructive/30"
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Click a question number to go back and answer it, or submit anyway.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowUnansweredDialog(false);
              if (unansweredIndices.length > 0) setCurrentQ(unansweredIndices[0]);
            }}>
              Go to Question {unansweredIndices[0] !== undefined ? unansweredIndices[0] + 1 : ""}
            </Button>
            <Button variant="destructive" onClick={() => handleSubmit(false)}>
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TakeExam;
