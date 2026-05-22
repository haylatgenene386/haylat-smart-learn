import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, FileText, Trophy, Lock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

const StudentExams = () => {
  const { user, isAdmin } = useAuth();
  const { grade } = useProfile();
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["platform-settings-quiz"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("quiz_password").limit(1).single();
      return data;
    },
  });

  const globalPassword = settings?.quiz_password;
  const needsGlobalPassword = !!globalPassword && !unlocked;

  const { data: exams, isLoading } = useQuery({
    queryKey: ["student-exams", grade],
    queryFn: async () => {
      let query = supabase
        .from("exams")
        .select("*, courses(title)")
        .eq("is_active", true);
      if (!isAdmin && grade) {
        query = query.or(`grade_target.eq.${grade},grade_target.is.null`);
      }
      const { data } = await query.order("start_time", { ascending: false });
      return data ?? [];
    },
    enabled: !needsGlobalPassword,
  });

  const { data: allAttempts } = useQuery({
    queryKey: ["my-all-attempts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("student_id", user.id);
      return data ?? [];
    },
    enabled: !!user && !needsGlobalPassword,
  });

  const { data: retakeOverrides } = useQuery({
    queryKey: ["my-retake-overrides", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("exam_retake_overrides")
        .select("*")
        .eq("student_id", user.id);
      return data ?? [];
    },
    enabled: !!user && !needsGlobalPassword,
  });

  const getAttempts = (examId: string) => allAttempts?.filter((a: any) => a.exam_id === examId) ?? [];
  const getLatestAttempt = (examId: string) => {
    const sorted = getAttempts(examId).sort((a: any, b: any) => new Date(b.submitted_at ?? b.started_at).getTime() - new Date(a.submitted_at ?? a.started_at).getTime());
    return sorted[0];
  };

  const canRetake = (exam: any) => {
    if (!exam.allow_retake) return { allowed: false, reason: "Retakes not allowed" };
    const attempts = getAttempts(exam.id);
    const submitted = attempts.filter((a: any) => a.status === "submitted");
    const override = retakeOverrides?.find((o: any) => o.exam_id === exam.id);
    const maxRetakes = (exam.max_retakes ?? 1) + (override?.extra_retakes ?? 0);
    if (submitted.length > maxRetakes) return { allowed: false, reason: `Max ${maxRetakes} retakes reached` };
    if (exam.retake_wait_hours > 0 && submitted.length > 0) {
      const lastSubmitted = submitted.sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
      const waitUntil = new Date(new Date(lastSubmitted.submitted_at).getTime() + exam.retake_wait_hours * 3600000);
      if (new Date() < waitUntil) {
        return { allowed: false, reason: `Wait until ${format(waitUntil, "MMM dd, HH:mm")}` };
      }
    }
    return { allowed: true, reason: "" };
  };

  const handlePasswordCheck = () => {
    if (passwordInput === globalPassword) {
      setUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (needsGlobalPassword) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-xl border border-border bg-card p-8 shadow-card text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Exam Access Protected</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the access password provided by your instructor to view exams.
              </p>
              <div className="space-y-4 text-left">
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordCheck()}
                    placeholder="Enter access password"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">Incorrect password. Please try again.</p>
                  )}
                </div>
                <Button onClick={handlePasswordCheck} disabled={!passwordInput} className="w-full">
                  <ShieldCheck className="h-4 w-4 mr-2" /> Unlock Exams
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Exams</h1>
            <p className="mt-1 text-muted-foreground">Take your scheduled exams</p>
          </div>
          <Link to="/exam-history">
            <Button variant="outline"><Trophy className="h-4 w-4 mr-1" /> My Results</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : exams?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No exams available right now</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exams?.map((exam: any) => {
              const attempts = getAttempts(exam.id);
              const latestAttempt = getLatestAttempt(exam.id);
              const hasSubmitted = attempts.some((a: any) => a.status === "submitted");
              const inProgress = latestAttempt?.status === "in_progress";
              const submittedCount = attempts.filter((a: any) => a.status === "submitted").length;
              const now = new Date();
              const started = !exam.start_time || new Date(exam.start_time) <= now;
              const ended = exam.end_time && new Date(exam.end_time) < now;
              const retakeCheck = canRetake(exam);
              const canTakeExam = started && !ended && (!hasSubmitted || (exam.allow_retake && retakeCheck.allowed));

              return (
                <div key={exam.id} className="rounded-xl border border-border bg-card p-6 shadow-card flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{exam.title}</h3>
                      {exam.access_password && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    {hasSubmitted && <Badge variant="default">Completed ({submittedCount}x)</Badge>}
                    {inProgress && <Badge variant="secondary">In Progress</Badge>}
                  </div>
                  {exam.courses?.title && (
                    <p className="text-sm text-muted-foreground mb-2">{exam.courses.title}</p>
                  )}
                  {exam.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{exam.description}</p>
                  )}
                  <div className="mt-auto space-y-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {exam.duration_minutes} min</span>
                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {exam.total_marks} marks</span>
                    </div>
                    {exam.start_time && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(exam.start_time), "MMM dd, yyyy HH:mm")}
                        {exam.end_time && ` — ${format(new Date(exam.end_time), "MMM dd, yyyy HH:mm")}`}
                      </p>
                    )}
                    {hasSubmitted && latestAttempt && latestAttempt.status === "submitted" && (
                      <p className="text-sm font-medium text-primary">
                        Last Score: {latestAttempt.score}/{latestAttempt.total_marks} ({latestAttempt.percentage}%)
                      </p>
                    )}
                    {hasSubmitted && !retakeCheck.allowed && exam.allow_retake && (
                      <p className="text-xs text-muted-foreground">{retakeCheck.reason}</p>
                    )}
                    <div className="pt-2">
                      {canTakeExam ? (
                        <Link to={`/exams/${exam.id}/take`}>
                          <Button variant="hero" size="sm" className="w-full">
                            {inProgress ? "Continue Exam" : hasSubmitted ? "Retake Exam" : "Start Exam"}
                          </Button>
                        </Link>
                      ) : ended ? (
                        <Button variant="outline" size="sm" disabled className="w-full">Exam Ended</Button>
                      ) : !started ? (
                        <Button variant="outline" size="sm" disabled className="w-full">Not Started Yet</Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled className="w-full">
                          {hasSubmitted && exam.allow_retake ? retakeCheck.reason : "Already Taken"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentExams;
