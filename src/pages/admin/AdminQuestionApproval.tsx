import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Eye, Loader2, MessageSquare, BookOpen, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type QuestionWithDetails = {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string | null;
  approval_status: string | null;
  decline_reason: string | null;
  created_at: string;
  options: any;
  correct_answer: string;
  explanation: string | null;
  submitted_by: string | null;
  course_id: string | null;
  submitter_name?: string;
  course_name?: string;
};

type GroupedQuestions = {
  course_id: string | null;
  course_name: string;
  submitter_name: string;
  submitted_by: string | null;
  questions: QuestionWithDetails[];
};

const AdminQuestionApproval = () => {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithDetails | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["questions-for-approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .in("approval_status", ["pending", "revision"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const submitterIds = data.filter(q => q.submitted_by).map(q => q.submitted_by!);
      const courseIds = data.filter(q => q.course_id).map(q => q.course_id!);

      const [profilesRes, coursesRes] = await Promise.all([
        submitterIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", submitterIds)
          : { data: [] },
        courseIds.length > 0
          ? supabase.from("courses").select("id, title").in("id", courseIds)
          : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data ?? []).map(p => [p.user_id, p.full_name]));
      const courseMap = new Map((coursesRes.data ?? []).map(c => [c.id, c.title]));

      return data.map(q => ({
        ...q,
        submitter_name: q.submitted_by ? profileMap.get(q.submitted_by) || "Unknown" : "System",
        course_name: q.course_id ? courseMap.get(q.course_id) || "Unknown Course" : "No Course",
      })) as QuestionWithDetails[];
    },
  });

  const { data: approvedQuestions = [] } = useQuery({
    queryKey: ["approved-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("approval_status", "approved")
        .not("submitted_by", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const submitterIds = data.filter(q => q.submitted_by).map(q => q.submitted_by!);
      const courseIds = data.filter(q => q.course_id).map(q => q.course_id!);
      const [profilesRes, coursesRes] = await Promise.all([
        submitterIds.length > 0 ? supabase.from("profiles").select("user_id, full_name").in("user_id", submitterIds) : { data: [] },
        courseIds.length > 0 ? supabase.from("courses").select("id, title").in("id", courseIds) : { data: [] },
      ]);
      const profileMap = new Map((profilesRes.data ?? []).map(p => [p.user_id, p.full_name]));
      const courseMap = new Map((coursesRes.data ?? []).map(c => [c.id, c.title]));

      return data.map(q => ({
        ...q,
        submitter_name: q.submitted_by ? profileMap.get(q.submitted_by) || "Unknown" : "System",
        course_name: q.course_id ? courseMap.get(q.course_id) || "Unknown Course" : "No Course",
      })) as QuestionWithDetails[];
    },
  });

  const { data: declinedQuestions = [] } = useQuery({
    queryKey: ["declined-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("approval_status", "declined")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const submitterIds = data.filter(q => q.submitted_by).map(q => q.submitted_by!);
      const courseIds = data.filter(q => q.course_id).map(q => q.course_id!);
      const [profilesRes, coursesRes] = await Promise.all([
        submitterIds.length > 0 ? supabase.from("profiles").select("user_id, full_name").in("user_id", submitterIds) : { data: [] },
        courseIds.length > 0 ? supabase.from("courses").select("id, title").in("id", courseIds) : { data: [] },
      ]);
      const profileMap = new Map((profilesRes.data ?? []).map(p => [p.user_id, p.full_name]));
      const courseMap = new Map((coursesRes.data ?? []).map(c => [c.id, c.title]));

      return data.map(q => ({
        ...q,
        submitter_name: q.submitted_by ? profileMap.get(q.submitted_by) || "Unknown" : "System",
        course_name: q.course_id ? courseMap.get(q.course_id) || "Unknown Course" : "No Course",
      })) as QuestionWithDetails[];
    },
  });

  // Group questions by instructor + course
  const groupQuestions = (qs: QuestionWithDetails[]): GroupedQuestions[] => {
    const map = new Map<string, GroupedQuestions>();
    for (const q of qs) {
      const key = `${q.submitted_by || "system"}_${q.course_id || "none"}`;
      if (!map.has(key)) {
        map.set(key, {
          course_id: q.course_id,
          course_name: q.course_name || "No Course",
          submitter_name: q.submitter_name || "System",
          submitted_by: q.submitted_by,
          questions: [],
        });
      }
      map.get(key)!.questions.push(q);
    }
    return Array.from(map.values());
  };

  const pendingGroups = useMemo(() => groupQuestions(questions), [questions]);
  const approvedGroups = useMemo(() => groupQuestions(approvedQuestions), [approvedQuestions]);
  const declinedGroups = useMemo(() => groupQuestions(declinedQuestions), [declinedQuestions]);

  const approveMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from("questions")
        .update({ approval_status: "approved", decline_reason: null, is_active: true })
        .eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions-for-approval"] });
      queryClient.invalidateQueries({ queryKey: ["approved-questions"] });
      toast.success("Question approved — ready to add to exams");
      setViewOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const declineMutation = useMutation({
    mutationFn: async ({ questionId, reason }: { questionId: string; reason: string }) => {
      const { error } = await supabase
        .from("questions")
        .update({ approval_status: "declined", decline_reason: reason })
        .eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions-for-approval"] });
      queryClient.invalidateQueries({ queryKey: ["declined-questions"] });
      toast.success("Question declined and returned to instructor");
      setDeclineOpen(false);
      setViewOpen(false);
      setDeclineReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const returnForRevisionMutation = useMutation({
    mutationFn: async ({ questionId, reason }: { questionId: string; reason: string }) => {
      const { error } = await supabase
        .from("questions")
        .update({ approval_status: "revision", decline_reason: reason })
        .eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions-for-approval"] });
      toast.success("Question returned for revision");
      setDeclineOpen(false);
      setViewOpen(false);
      setDeclineReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const QuestionCard = ({ q, showActions = true }: { q: QuestionWithDetails; showActions?: boolean }) => (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant={q.approval_status === "revision" ? "outline" : "secondary"}>
            {q.approval_status === "pending" && <Clock className="mr-1 h-3 w-3" />}
            {q.approval_status}
          </Badge>
          <Badge variant="outline">{q.difficulty}</Badge>
          <Badge variant="outline">{q.question_type}</Badge>
        </div>
        <p className="line-clamp-2 text-sm">{q.question_text}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(q.created_at).toLocaleDateString()}
        </p>
        {q.decline_reason && (
          <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-700">
            <MessageSquare className="mr-1 inline h-3 w-3" />
            {q.decline_reason}
          </div>
        )}
      </div>
      {showActions && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setSelectedQuestion(q); setViewOpen(true); }}>
            <Eye className="h-4 w-4" />
          </Button>
          {isSuperAdmin && (
            <>
              <Button size="sm" variant="default" onClick={() => approveMutation.mutate(q.id)} disabled={approveMutation.isPending}>
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setSelectedQuestion(q); setDeclineOpen(true); }}>
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const GroupedSection = ({ groups, showActions = true }: { groups: GroupedQuestions[]; showActions?: boolean }) => (
    <div className="space-y-6">
      {groups.map((group, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-base">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Questions from Instructor <span className="font-bold text-primary">{group.submitter_name}</span></span>
              </div>
              <span className="text-muted-foreground">·</span>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-primary">{group.course_name}</span>
              </div>
              <Badge variant="secondary" className="ml-auto">{group.questions.length} questions</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.questions.map((q) => (
              <QuestionCard key={q.id} q={q} showActions={showActions} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Question Approval</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve questions submitted by instructors
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({questions.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No questions awaiting approval
                </CardContent>
              </Card>
            ) : (
              <GroupedSection groups={pendingGroups} showActions={true} />
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No approved questions from instructors yet
                </CardContent>
              </Card>
            ) : (
              <GroupedSection groups={approvedGroups} showActions={false} />
            )}
          </TabsContent>

          <TabsContent value="declined" className="space-y-4">
            {declinedGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No declined questions
                </CardContent>
              </Card>
            ) : (
              <GroupedSection groups={declinedGroups} showActions={false} />
            )}
          </TabsContent>
        </Tabs>

        {/* View Question Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Question</DialogTitle>
            </DialogHeader>
            {selectedQuestion && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {selectedQuestion.submitter_name}</span>
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {selectedQuestion.course_name}</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Question</Label>
                  <p className="mt-1">{selectedQuestion.question_text}</p>
                </div>
                {selectedQuestion.options && Array.isArray(selectedQuestion.options) && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Options</Label>
                    <ul className="mt-1 space-y-1">
                      {(selectedQuestion.options as string[]).map((opt, i) => (
                        <li key={i} className={`rounded px-2 py-1 text-sm ${opt === selectedQuestion.correct_answer ? "bg-green-100 font-medium text-green-800" : "bg-muted"}`}>
                          {String.fromCharCode(65 + i)}. {opt}
                          {opt === selectedQuestion.correct_answer && " ✓"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedQuestion.explanation && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Explanation</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedQuestion.explanation}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Badge variant="outline">{selectedQuestion.difficulty}</Badge>
                  <Badge variant="outline">{selectedQuestion.question_type}</Badge>
                </div>
              </div>
            )}
            {isSuperAdmin && selectedQuestion && (
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setDeclineOpen(true)}>Return for Revision</Button>
                <Button onClick={() => approveMutation.mutate(selectedQuestion.id)} disabled={approveMutation.isPending}>
                  {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Decline Dialog */}
        <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return for Revision</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason / Feedback</Label>
                <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Explain what needs to be fixed..." rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (selectedQuestion) {
                    returnForRevisionMutation.mutate({ questionId: selectedQuestion.id, reason: declineReason });
                  }
                }}
                disabled={returnForRevisionMutation.isPending || !declineReason}
              >
                {returnForRevisionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Return for Revision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminQuestionApproval;
