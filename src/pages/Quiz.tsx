import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Brain, Loader2, Lock, History } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import QuizAIAssistant from "@/components/QuizAIAssistant";

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
}

const Quiz = () => {
  const { user, isAdmin } = useAuth();
  const { grade } = useProfile();
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["platform-settings-quiz"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("quiz_password").limit(1).single();
      return data;
    },
  });

  const quizPassword = settings?.quiz_password;
  const needsPassword = !!quizPassword;

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["quiz-questions", grade],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("id, question_text, question_type, options, correct_answer, explanation")
        .eq("is_active", true)
        .eq("question_type", "mcq");
      // Filter by student's grade unless admin
      if (!isAdmin && grade) {
        query = query.eq("grade", grade);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      })) as QuizQuestion[];
    },
  });

  const saveResultMutation = useMutation({
    mutationFn: async ({ score, total }: { score: number; total: number }) => {
      if (!user) return;
      const { error } = await supabase.from("quiz_results").insert({
        user_id: user.id,
        score,
        total,
        topic: "Mixed Quiz",
        answers: answers as any,
      });
      if (error) throw error;
    },
    onError: () => toast.error("Failed to save results"),
  });

  const question = questions[current];
  const score = answers.filter((a, i) => a === Number(questions[i]?.correct_answer)).length;

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    setAnswers([...answers, idx]);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      setFinished(true);
      saveResultMutation.mutate({ score: answers.filter((a, i) => a === Number(questions[i]?.correct_answer)).length + (selected === Number(question?.correct_answer) ? 0 : 0), total: questions.length });
    }
  };

  const reset = () => {
    setStarted(false);
    setCurrent(0);
    setSelected(null);
    setShowResult(false);
    setAnswers([]);
    setFinished(false);
    setPasswordVerified(false);
    setPasswordInput("");
    setPasswordError(false);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === quizPassword) {
      setPasswordVerified(true);
      setPasswordError(false);
      setStarted(true);
    } else {
      setPasswordError(true);
    }
  };

  const handleStart = () => {
    if (needsPassword && !passwordVerified) return;
    setStarted(true);
  };

  // Calculate final score properly
  const finalScore = finished
    ? answers.filter((a, i) => a === Number(questions[i]?.correct_answer)).length
    : score;

  if (!started) {
    return (
      <Layout>
        <div className="container flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-gradient">
            <Brain className="h-10 w-10 text-gold-foreground" />
          </div>
          <h1 className="mb-3 font-display text-3xl font-bold">Quiz</h1>
          <Link to="/quiz-history" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <History className="h-4 w-4" /> View My Results
          </Link>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <p className="mb-8 max-w-md text-muted-foreground">
              No questions available yet. Check back later!
            </p>
          ) : needsPassword && !passwordVerified ? (
            <>
              <p className="mb-4 max-w-md text-muted-foreground">
                This quiz requires an access password.
              </p>
              <div className="flex w-full max-w-xs flex-col items-center gap-3">
                <div className="relative w-full">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                    placeholder="Enter quiz password"
                    className={`pl-10 ${passwordError ? "border-destructive" : ""}`}
                  />
                </div>
                {passwordError && <p className="text-sm text-destructive">Incorrect password. Try again.</p>}
                <Button variant="hero" size="lg" onClick={handlePasswordSubmit} className="w-full gap-2">
                  Access Quiz <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-8 max-w-md text-muted-foreground">
                Test your knowledge with {questions.length} questions and get instant feedback.
              </p>
              <Button variant="hero" size="lg" onClick={handleStart} className="gap-2">
                Start Quiz <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </Layout>
    );
  }

  if (finished) {
    const pct = Math.round((finalScore / questions.length) * 100);
    return (
      <Layout>
        <div className="container flex flex-col items-center justify-center py-20 text-center">
          <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full font-display text-3xl font-bold text-primary-foreground ${pct >= 70 ? "bg-hero-gradient" : "bg-accent"}`}>
            {pct}%
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold">Quiz Complete!</h1>
          <p className="mb-2 text-lg text-muted-foreground">
            You scored {finalScore} out of {questions.length}
          </p>
          <p className="mb-8 text-sm text-muted-foreground">
            {pct >= 80 ? "Excellent work! 🎉" : pct >= 60 ? "Good effort! Keep practicing." : "Keep studying — you'll improve!"}
          </p>
          <div className="flex gap-3">
            <Button variant="hero" onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" /> Try Again</Button>
            <Button variant="outline" onClick={() => window.history.back()}>Back to Lessons</Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!question) return null;
  const correctIdx = Number(question.correct_answer);

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        {/* Progress */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Question {current + 1} of {questions.length}
          </span>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i < current ? (answers[i] === Number(questions[i]?.correct_answer) ? "bg-primary" : "bg-accent") :
                  i === current ? "bg-secondary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-6 font-display text-xl font-semibold">{question.question_text}</h2>
          <div className="space-y-3">
            {question.options.map((opt, i) => {
              let optClass = "border-border hover:border-primary/30 hover:bg-muted/50 cursor-pointer";
              if (showResult && i === correctIdx) optClass = "border-primary bg-primary/10";
              else if (showResult && i === selected) optClass = "border-accent bg-accent/10";

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={showResult}
                  className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all ${optClass}`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold font-display ${
                    showResult && i === correctIdx ? "border-primary bg-primary text-primary-foreground" :
                    showResult && i === selected ? "border-accent bg-accent text-accent-foreground" :
                    "border-border text-muted-foreground"
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm font-medium">{opt}</span>
                  {showResult && i === correctIdx && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
                  {showResult && i === selected && i !== correctIdx && <XCircle className="ml-auto h-5 w-5 text-accent" />}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="mt-6 rounded-lg bg-muted/50 p-4 animate-fade-up">
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explanation</p>
              <p className="text-sm">{question.explanation || "No explanation provided."}</p>
              <Button variant="hero" size="sm" className="mt-4 gap-1" onClick={handleNext}>
                {current < questions.length - 1 ? "Next Question" : "See Results"} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* AI Quiz Assistant */}
        <QuizAIAssistant questionText={question.question_text} questionTopic={question.explanation ?? undefined} />
      </div>
    </Layout>
  );
};

export default Quiz;
