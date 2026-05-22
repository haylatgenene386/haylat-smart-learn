import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Trash2, Database, Filter } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const AdminQuestionBank = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  const { data: courses } = useQuery({
    queryKey: ["courses-for-qbank"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title");
      return data || [];
    },
  });

  const { data: questions, isLoading, refetch } = useQuery({
    queryKey: ["question-bank", courseFilter, typeFilter, difficultyFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("*, courses(title)")
        .order("created_at", { ascending: false });

      if (courseFilter !== "all") query = query.eq("course_id", courseFilter);
      if (typeFilter !== "all") query = query.eq("question_type", typeFilter);
      if (difficultyFilter !== "all") query = query.eq("difficulty", difficultyFilter);
      if (search) query = query.ilike("question_text", `%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete question");
    } else {
      toast.success("Question deleted");
      refetch();
    }
  };

  const difficultyColor = (d: string | null) => {
    if (d === "easy") return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (d === "hard") return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Question Bank</h2>
          <Badge variant="secondary" className="ml-2">{questions?.length ?? 0} questions</Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger><SelectValue placeholder="All Courses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="written">Short Answer / Essay</SelectItem>
                </SelectContent>
              </Select>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger><SelectValue placeholder="All Difficulties" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
            ) : !questions?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Database className="mb-2 h-10 w-10" />
                <p>No questions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Question</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell className="max-w-xs truncate font-medium">
                        {q.question_text}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {q.courses?.title || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {q.question_type === "true_false" ? "T/F" : q.question_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${difficultyColor(q.difficulty)}`}>
                          {q.difficulty || "medium"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={q.is_active ? "default" : "secondary"} className="text-xs">
                          {q.approval_status || "approved"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setSelectedQuestion(q)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Question Detail</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Question</p>
                <p className="mt-1">{selectedQuestion.question_text}</p>
              </div>
              {selectedQuestion.question_type === "mcq" && (
                <div className="grid grid-cols-2 gap-2">
                  {["A", "B", "C", "D"].map((opt) => {
                    const val = selectedQuestion[`option_${opt.toLowerCase()}`];
                    if (!val) return null;
                    const isCorrect = selectedQuestion.correct_answer === opt;
                    return (
                      <div key={opt} className={`rounded-lg border p-2 text-sm ${isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}`}>
                        <span className="font-medium">{opt}.</span> {val}
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedQuestion.question_type !== "mcq" && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Correct Answer</p>
                  <p className="mt-1 text-sm">{selectedQuestion.correct_answer}</p>
                </div>
              )}
              {selectedQuestion.explanation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Explanation</p>
                  <p className="mt-1 text-sm">{selectedQuestion.explanation}</p>
                </div>
              )}
              <div className="flex gap-3 text-sm text-muted-foreground">
                <span>Type: <strong className="capitalize">{selectedQuestion.question_type}</strong></span>
                <span>Difficulty: <strong className="capitalize">{selectedQuestion.difficulty || "medium"}</strong></span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminQuestionBank;
