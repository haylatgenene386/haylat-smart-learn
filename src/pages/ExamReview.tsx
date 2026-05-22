import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, MinusCircle } from "lucide-react";

const ExamReview = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["review-attempt", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*, exams(title, pass_percentage)")
        .eq("id", attemptId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: answersData } = useQuery({
    queryKey: ["review-answers", attemptId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_answers")
        .select("*, exam_questions(question_text, correct_answer, option_a, option_b, option_c, option_d, question_type, marks)")
        .eq("attempt_id", attemptId!)
        .order("created_at");
      return data ?? [];
    },
    enabled: !!attemptId,
  });

  // Check access: student must own the attempt AND allow_review must be true
  const canView = attempt && user && (
    attempt.student_id === user.id && attempt.allow_review === true
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!canView) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h2 className="font-display text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Review access has not been granted for this exam attempt.</p>
          <Link to="/exam-history"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Results</Button></Link>
        </div>
      </Layout>
    );
  }

  const pass = (attempt.percentage ?? 0) >= (attempt.exams?.pass_percentage ?? 50);

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <Link to="/exam-history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Results
        </Link>

        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">{attempt.exams?.title} — Review</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={pass ? "default" : "destructive"}>{pass ? "Passed" : "Failed"}</Badge>
            <span className="text-sm text-muted-foreground">Score: {attempt.score}/{attempt.total_marks} ({attempt.percentage}%)</span>
          </div>
        </div>

        <div className="space-y-6">
          {answersData?.map((ans: any, i: number) => {
            const q = ans.exam_questions;
            if (!q) return null;
            const wasAnswered = ans.student_answer && ans.student_answer.trim() !== "";
            const isCorrect = ans.is_correct;

            return (
              <div key={ans.id} className={`rounded-xl border p-5 ${
                !wasAnswered ? "border-muted bg-muted/30" : isCorrect ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{q.marks} mark{q.marks !== 1 ? "s" : ""}</Badge>
                      {!wasAnswered ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <MinusCircle className="h-3 w-3" /> Not Answered
                        </Badge>
                      ) : isCorrect ? (
                        <Badge className="text-xs gap-1 bg-primary/80">
                          <CheckCircle className="h-3 w-3" /> Correct
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <XCircle className="h-3 w-3" /> Incorrect
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Options display for MCQ */}
                {q.question_type === "mcq" && (
                  <div className="space-y-2 ml-10">
                    {[
                      { key: "A", text: q.option_a },
                      { key: "B", text: q.option_b },
                      { key: "C", text: q.option_c },
                      { key: "D", text: q.option_d },
                    ].filter(o => o.text).map(opt => {
                      const isStudentAnswer = ans.student_answer?.trim().toUpperCase() === opt.key;
                      const isCorrectAnswer = q.correct_answer?.trim().toUpperCase() === opt.key;
                      return (
                        <div key={opt.key} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                          isCorrectAnswer ? "border-primary bg-primary/10 font-medium" :
                          isStudentAnswer ? "border-destructive bg-destructive/10" :
                          "border-border"
                        }`}>
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${
                            isCorrectAnswer ? "bg-primary text-primary-foreground" :
                            isStudentAnswer ? "bg-destructive text-destructive-foreground" :
                            "bg-muted text-muted-foreground"
                          }`}>{opt.key}</span>
                          <span>{opt.text}</span>
                          {isCorrectAnswer && <CheckCircle className="h-4 w-4 text-primary ml-auto" />}
                          {isStudentAnswer && !isCorrectAnswer && <XCircle className="h-4 w-4 text-destructive ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* True/False display */}
                {q.question_type === "true_false" && (
                  <div className="ml-10 space-y-1 text-sm">
                    <p>Your answer: <span className={`font-medium ${isCorrect ? "text-primary" : "text-destructive"}`}>{ans.student_answer || "—"}</span></p>
                    {!isCorrect && <p>Correct answer: <span className="font-medium text-primary">{q.correct_answer}</span></p>}
                  </div>
                )}

                {/* Short answer display */}
                {q.question_type === "short_answer" && (
                  <div className="ml-10 space-y-1 text-sm">
                    <p>Your answer: <span className={`font-medium ${isCorrect ? "text-primary" : "text-destructive"}`}>{ans.student_answer || "—"}</span></p>
                    {!isCorrect && <p>Correct answer: <span className="font-medium text-primary">{q.correct_answer}</span></p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default ExamReview;
