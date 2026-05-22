import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileQuestion, Send, Trash2, CheckCircle, Clock, XCircle, AlertTriangle, Loader2, MessageSquare,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: "Draft", icon: FileQuestion, color: "bg-muted text-muted-foreground" },
  pending: { label: "Pending Review", icon: Clock, color: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  declined: { label: "Declined", icon: XCircle, color: "bg-red-100 text-red-800" },
  revision: { label: "Needs Revision", icon: AlertTriangle, color: "bg-orange-100 text-orange-800" },
};

const InstructorQuestions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["instructor-questions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("submitted_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("questions")
        .update({ approval_status: "pending", is_active: false })
        .in("id", ids)
        .eq("submitted_by", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-questions"] });
      setSelected([]);
      toast.success("Questions submitted for approval!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("questions")
        .delete()
        .in("id", ids)
        .eq("submitted_by", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-questions"] });
      setSelected([]);
      toast.success("Questions deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const selectAllInTab = (status: string) => {
    const ids = questions.filter((q) => q.approval_status === status).map((q) => q.id);
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const draftQuestions = questions.filter((q) => q.approval_status === "draft");
  const pendingQuestions = questions.filter((q) => q.approval_status === "pending");
  const approvedQuestions = questions.filter((q) => q.approval_status === "approved");
  const declinedQuestions = questions.filter((q) => ["declined", "revision"].includes(q.approval_status ?? ""));

  const draftSelected = selected.filter((id) => draftQuestions.some((q) => q.id === id));

  const QuestionRow = ({ q }: { q: any }) => {
    const sc = statusConfig[q.approval_status] ?? statusConfig.draft;
    const Icon = sc.icon;
    return (
      <div className="flex items-start gap-3 rounded-lg border p-4">
        {(q.approval_status === "draft" || q.approval_status === "revision") && (
          <Checkbox
            checked={selected.includes(q.id)}
            onCheckedChange={() => toggleSelect(q.id)}
            className="mt-1"
          />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${sc.color} text-xs gap-1`}>
              <Icon className="h-3 w-3" /> {sc.label}
            </Badge>
            <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
            {q.difficulty && <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>}
          </div>
          <p className="text-sm line-clamp-2">{q.question_text}</p>
          {q.options && Array.isArray(q.options) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(q.options as string[]).map((opt: string, i: number) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-0.5 rounded ${
                    opt === q.correct_answer ? "bg-green-100 text-green-800 font-medium" : "bg-muted"
                  }`}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </span>
              ))}
            </div>
          )}
          {q.decline_reason && (
            <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-700">
              <MessageSquare className="mr-1 inline h-3 w-3" />
              Feedback: {q.decline_reason}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Created {new Date(q.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  };

  const TabContent = ({ items, status }: { items: any[]; status: string }) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No questions here yet
          </CardContent>
        </Card>
      ) : (
        <>
          {(status === "draft" || status === "revision") && items.length > 0 && (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => selectAllInTab(status)}>
                Select All ({items.length})
              </Button>
              {draftSelected.length > 0 && status === "draft" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => submitMutation.mutate(draftSelected)}
                    disabled={submitMutation.isPending}
                    className="gap-1"
                  >
                    {submitMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Submit {draftSelected.length} for Approval
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(draftSelected)}
                    disabled={deleteMutation.isPending}
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Delete {draftSelected.length}
                  </Button>
                </>
              )}
              {status === "revision" && selected.filter((id) => items.some((q) => q.id === id)).length > 0 && (
                <Button
                  size="sm"
                  onClick={() => submitMutation.mutate(selected.filter((id) => items.some((q) => q.id === id)))}
                  disabled={submitMutation.isPending}
                  className="gap-1"
                >
                  {submitMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Resubmit for Approval
                </Button>
              )}
            </div>
          )}
          <div className="space-y-2">
            {items.map((q) => <QuestionRow key={q.id} q={q} />)}
          </div>
        </>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Questions</h2>
          <p className="text-muted-foreground">
            View generated questions and submit them for Super Admin approval.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <Tabs defaultValue="draft">
            <TabsList>
              <TabsTrigger value="draft">Draft ({draftQuestions.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingQuestions.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedQuestions.length})</TabsTrigger>
              <TabsTrigger value="declined">Returned ({declinedQuestions.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="draft"><TabContent items={draftQuestions} status="draft" /></TabsContent>
            <TabsContent value="pending"><TabContent items={pendingQuestions} status="pending" /></TabsContent>
            <TabsContent value="approved"><TabContent items={approvedQuestions} status="approved" /></TabsContent>
            <TabsContent value="declined"><TabContent items={declinedQuestions} status="revision" /></TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default InstructorQuestions;
