import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Eye } from "lucide-react";

const ExamHistory = () => {
  const { user } = useAuth();

  const { data: attempts, isLoading } = useQuery({
    queryKey: ["my-exam-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("exam_attempts")
        .select("*, exams(title, pass_percentage, courses(title))")
        .eq("student_id", user.id)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const avgScore = attempts && attempts.length > 0
    ? Math.round(attempts.reduce((s: number, a: any) => s + (a.percentage ?? 0), 0) / attempts.length)
    : 0;

  return (
    <Layout>
      <div className="container py-8">
        <Link to="/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Exams
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">My Exam Results</h1>
            <p className="text-muted-foreground">{attempts?.length ?? 0} exams taken · Average: {avgScore}%</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : !attempts?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No exam results yet</TableCell></TableRow>
              ) : attempts.map((a: any) => {
                const pass = (a.percentage ?? 0) >= (a.exams?.pass_percentage ?? 50);
                const canReview = (a as any).allow_review === true;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.exams?.title}</TableCell>
                    <TableCell>{a.exams?.courses?.title ?? "—"}</TableCell>
                    <TableCell>{a.score}/{a.total_marks}</TableCell>
                    <TableCell>{a.percentage}%</TableCell>
                    <TableCell><Badge variant={pass ? "default" : "destructive"}>{pass ? "Pass" : "Fail"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.submitted_at ? format(new Date(a.submitted_at), "MMM dd, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {canReview ? (
                        <Link to={`/exams/review/${a.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3.5 w-3.5 mr-1" /> Review
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not available</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default ExamHistory;
