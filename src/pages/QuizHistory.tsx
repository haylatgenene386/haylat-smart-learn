import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";

const QuizHistory = () => {
  const { user } = useAuth();

  const { data: results, isLoading } = useQuery({
    queryKey: ["my-quiz-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const avgPct = results && results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) / results.length)
    : 0;

  return (
    <Layout>
      <div className="container py-8">
        <Link to="/quiz" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Quiz
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">My Quiz Results</h1>
            <p className="text-muted-foreground">{results?.length ?? 0} quizzes taken · Average: {avgPct}%</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : !results?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No quiz results yet</TableCell></TableRow>
              ) : results.map((r, idx) => {
                const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                const pass = pct >= 60;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{r.topic || "Mixed Quiz"}</TableCell>
                    <TableCell>{r.score}/{r.total}</TableCell>
                    <TableCell>{pct}%</TableCell>
                    <TableCell><Badge variant={pass ? "default" : "destructive"}>{pass ? "Pass" : "Fail"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.created_at), "MMM dd, yyyy · h:mm a")}
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

export default QuizHistory;
