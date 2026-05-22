import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, ArrowLeft, Printer, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const AdminExamResults = () => {
  const { user } = useAuth();
  const [examFilter, setExamFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [retakeDialog, setRetakeDialog] = useState<{ examId: string; studentId: string; studentName: string } | null>(null);
  const [extraRetakes, setExtraRetakes] = useState(1);
  const [retakeReason, setRetakeReason] = useState("");
  const qc = useQueryClient();

  const { data: exams } = useQuery({
    queryKey: ["exams-list"],
    queryFn: async () => {
      const { data } = await supabase.from("exams").select("id, title").order("title");
      return data ?? [];
    },
  });

  const { data: attempts, isLoading } = useQuery({
    queryKey: ["exam-results", examFilter],
    queryFn: async () => {
      let query = supabase
        .from("exam_attempts")
        .select("*, exams(title, total_marks, pass_percentage, course_id, courses(title)), profiles:student_id(full_name)")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });
      if (examFilter !== "all") query = query.eq("exam_id", examFilter);
      const { data } = await query;
      return data ?? [];
    },
  });

  const filtered = attempts?.filter((a: any) => {
    if (!search) return true;
    const name = (a as any).profiles?.full_name ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  }) ?? [];

  const toggleReview = async (attemptId: string, current: boolean) => {
    const { error } = await supabase
      .from("exam_attempts")
      .update({ allow_review: !current } as any)
      .eq("id", attemptId);
    if (error) toast.error(error.message);
    else {
      toast.success(`Review ${!current ? "enabled" : "disabled"}`);
      qc.invalidateQueries({ queryKey: ["exam-results"] });
    }
  };

  const exportCSV = () => {
    const header = "Student,Exam,Score,Total,Percentage,Status,Date\n";
    const rows = filtered.map((a: any) => {
      const name = (a as any).profiles?.full_name ?? "Unknown";
      const pass = (a.percentage ?? 0) >= (a.exams?.pass_percentage ?? 50) ? "Pass" : "Fail";
      return `"${name}","${a.exams?.title}",${a.score},${a.total_marks},${a.percentage}%,${pass},${a.submitted_at ? format(new Date(a.submitted_at), "yyyy-MM-dd HH:mm") : ""}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exam-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const grantExtraRetake = async () => {
    if (!retakeDialog || !user) return;
    const { error } = await supabase.from("exam_retake_overrides").upsert({
      exam_id: retakeDialog.examId,
      student_id: retakeDialog.studentId,
      extra_retakes: extraRetakes,
      override_reason: retakeReason || null,
      granted_by: user.id,
    }, { onConflict: "exam_id,student_id" });
    if (error) toast.error(error.message);
    else toast.success(`Extra retake granted to ${retakeDialog.studentName}`);
    setRetakeDialog(null);
    setExtraRetakes(1);
    setRetakeReason("");
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link to="/admin/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Exams
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Exam Results</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} results</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Input placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={examFilter} onValueChange={setExamFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by exam" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams?.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>{ex.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Allow Review</TableHead>
              <TableHead className="text-center">Retake</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No results found</TableCell></TableRow>
            ) : filtered.map((a: any) => {
              const pass = (a.percentage ?? 0) >= (a.exams?.pass_percentage ?? 50);
              const reviewEnabled = (a as any).allow_review === true;
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{(a as any).profiles?.full_name ?? "Unknown"}</TableCell>
                  <TableCell>{a.exams?.title}</TableCell>
                  <TableCell>{a.exams?.courses?.title ?? "—"}</TableCell>
                  <TableCell>{a.score}/{a.total_marks}</TableCell>
                  <TableCell>{a.percentage}%</TableCell>
                  <TableCell>
                    <Badge variant={pass ? "default" : "destructive"}>{pass ? "Pass" : "Fail"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.submitted_at ? format(new Date(a.submitted_at), "MMM dd, yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={reviewEnabled}
                      onCheckedChange={() => toggleReview(a.id, reviewEnabled)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Grant extra retake"
                      onClick={() => setRetakeDialog({
                        examId: a.exam_id,
                        studentId: a.student_id,
                        studentName: (a as any).profiles?.full_name ?? "Student",
                      })}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!retakeDialog} onOpenChange={(v) => !v && setRetakeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Extra Retake</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Grant extra retake attempts to <strong>{retakeDialog?.studentName}</strong>
          </p>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Extra Retakes</Label>
              <Input type="number" min={1} max={10} value={extraRetakes} onChange={(e) => setExtraRetakes(+e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Reason (optional)</Label>
              <Input value={retakeReason} onChange={(e) => setRetakeReason(e.target.value)} placeholder="e.g. Technical issue during exam" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetakeDialog(null)}>Cancel</Button>
            <Button onClick={grantExtraRetake}>Grant Retake</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminExamResults;
