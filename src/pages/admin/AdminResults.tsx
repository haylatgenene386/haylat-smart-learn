import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Printer, TrendingUp, TrendingDown, Users, BarChart3, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import StudentDetailDialog from "@/components/StudentDetailDialog";
import { printStudentReport } from "@/components/StudentReportPrint";

interface UnifiedResult {
  id: string;
  studentName: string;
  studentId: string;
  courseName: string;
  title: string;
  type: "Exam" | "Quiz";
  score: number;
  totalMark: number;
  percentage: number;
  date: string;
}

const AdminResults = () => {
  const { isSuperAdmin } = useAuth();
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<{ name: string; id: string } | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["courses-list-results"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data ?? [];
    },
  });

  // Fetch profiles separately to join client-side
  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, student_id");
      return data ?? [];
    },
  });

  const { data: examResults, isLoading: loadingExams } = useQuery({
    queryKey: ["all-exam-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_attempts")
        .select("id, student_id, score, total_marks, percentage, submitted_at, status, exams(title, course_id, courses(title))")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["all-lessons-for-results"],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("id, title, course_id, courses(title)");
      return data ?? [];
    },
  });

  const { data: quizResults, isLoading: loadingQuizzes } = useQuery({
    queryKey: ["all-quiz-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_results")
        .select("id, user_id, score, total, topic, grade, created_at, lesson_id")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const unified: UnifiedResult[] = useMemo(() => {
    const results: UnifiedResult[] = [];
    
    // Create lookup maps for client-side joins
    const profileMap = new Map(profiles?.map(p => [p.user_id, { name: p.full_name, studentId: (p as any).student_id }]) ?? []);
    const lessonMap = new Map(lessons?.map(l => [l.id, { title: l.title, courseName: (l as any).courses?.title }]) ?? []);

    examResults?.forEach((e: any) => {
      const profile = profileMap.get(e.student_id);
      results.push({
        id: e.id,
        studentName: profile?.name ?? "Unknown",
        studentId: profile?.studentId ?? e.student_id,
        courseName: e.exams?.courses?.title ?? "—",
        title: e.exams?.title ?? "Unknown Exam",
        type: "Exam",
        score: e.score ?? 0,
        totalMark: e.total_marks ?? 0,
        percentage: e.percentage ?? 0,
        date: e.submitted_at ?? "",
      });
    });

    quizResults?.forEach((q: any) => {
      const pct = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
      const lessonInfo = lessonMap.get(q.lesson_id);
      const profile = profileMap.get(q.user_id);
      results.push({
        id: q.id,
        studentName: profile?.name ?? "Unknown",
        studentId: profile?.studentId ?? q.user_id,
        courseName: lessonInfo?.courseName ?? q.topic ?? "—",
        title: lessonInfo?.title ?? q.topic ?? "Quiz",
        type: "Quiz",
        score: q.score,
        totalMark: q.total,
        percentage: pct,
        date: q.created_at ?? "",
      });
    });

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return results;
  }, [examResults, quizResults, profiles, lessons]);

  const filtered = useMemo(() => {
    return unified.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (courseFilter !== "all" && !r.courseName.toLowerCase().includes(
        courses?.find(c => c.id === courseFilter)?.title.toLowerCase() ?? ""
      )) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.studentName.toLowerCase().includes(s) && !r.studentId.toLowerCase().includes(s)) return false;
      }
      if (dateFrom && r.date && new Date(r.date) < new Date(dateFrom)) return false;
      if (dateTo && r.date && new Date(r.date) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [unified, typeFilter, courseFilter, search, dateFrom, dateTo, courses]);

  const stats = useMemo(() => {
    if (!filtered.length) return { avg: 0, highest: 0, lowest: 0, total: 0, uniqueStudents: 0 };
    const pcts = filtered.map(r => r.percentage);
    const uniqueStudents = new Set(filtered.map(r => r.studentId)).size;
    return {
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      highest: Math.max(...pcts),
      lowest: Math.min(...pcts),
      total: filtered.length,
      uniqueStudents,
    };
  }, [filtered]);

  const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2, 160 60% 45%))",
    "hsl(var(--chart-3, 30 80% 55%))",
    "hsl(var(--chart-4, 280 65% 60%))",
    "hsl(var(--chart-5, 340 75% 55%))",
    "hsl(var(--muted-foreground))",
  ];

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "0-20%", count: 0 },
      { range: "21-40%", count: 0 },
      { range: "41-60%", count: 0 },
      { range: "61-80%", count: 0 },
      { range: "81-100%", count: 0 },
    ];
    filtered.forEach((r) => {
      if (r.percentage <= 20) buckets[0].count++;
      else if (r.percentage <= 40) buckets[1].count++;
      else if (r.percentage <= 60) buckets[2].count++;
      else if (r.percentage <= 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [filtered]);

  const trendData = useMemo(() => {
    if (!filtered.length) return [];
    const byDate: Record<string, { sum: number; count: number }> = {};
    filtered.forEach((r) => {
      if (!r.date) return;
      const key = format(new Date(r.date), "MMM dd");
      if (!byDate[key]) byDate[key] = { sum: 0, count: 0 };
      byDate[key].sum += r.percentage;
      byDate[key].count++;
    });
    return Object.entries(byDate)
      .map(([date, v]) => ({ date, avg: Math.round(v.sum / v.count) }))
      .slice(-14);
  }, [filtered]);

  const passFailData = useMemo(() => {
    const pass = filtered.filter((r) => r.percentage >= 50).length;
    const fail = filtered.length - pass;
    return [
      { name: "Pass", value: pass },
      { name: "Fail", value: fail },
    ];
  }, [filtered]);

  const exportExcel = () => {
    const header = "Student Name\tStudent ID\tCourse\tQuiz/Exam\tType\tScore\tTotal Mark\tPercentage\tDate\n";
    const rows = filtered.map(r =>
      `${r.studentName}\t${r.studentId}\t${r.courseName}\t${r.title}\t${r.type}\t${r.score}\t${r.totalMark}\t${r.percentage}%\t${r.date ? format(new Date(r.date), "yyyy-MM-dd HH:mm") : ""}`
    ).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-results.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const isLoading = loadingExams || loadingQuizzes;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Student Results</h2>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin ? "All results across all courses" : "Results for your managed courses"}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <Download className="h-4 w-4 mr-1" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 print:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold">{stats.avg}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Highest Score</p>
              <p className="text-2xl font-bold">{stats.highest}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lowest Score</p>
              <p className="text-2xl font-bold">{stats.lowest}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="text-2xl font-bold">{stats.uniqueStudents}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      {filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3 mb-6 print:grid-cols-3">
          {/* Score Distribution */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Performance Trend */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="avg" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name="Avg %" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Pass/Fail Pie */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Pass / Fail Ratio</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={passFailData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {passFailData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i === 0 ? 1 : 4]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 print:hidden">
        <Input placeholder="Search student name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Exam">Exams</SelectItem>
            <SelectItem value="Quiz">Quizzes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" placeholder="To" />
      </div>

      <p className="text-sm text-muted-foreground mb-2">{filtered.length} results found</p>

      {/* Results Table */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Quiz/Exam</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Quiz/Exam</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="print:hidden">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No results found</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <button
                    onClick={() => setSelectedStudent({ name: r.studentName, id: r.studentId })}
                    className="font-medium text-primary hover:underline text-left"
                  >
                    {r.studentName}
                  </button>
                </TableCell>
                <TableCell className="text-sm font-mono font-medium">{r.studentId}</TableCell>
                <TableCell>{r.courseName}</TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>
                  <Badge variant={r.type === "Exam" ? "default" : "secondary"}>{r.type === "Quiz" ? "Mid/Quiz" : "Exam"}</Badge>
                </TableCell>
                <TableCell>{r.score}/{r.totalMark}</TableCell>
                <TableCell>
                  <span className={r.percentage >= 50 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {r.percentage}%
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.date ? format(new Date(r.date), "MMM dd, yyyy HH:mm") : "—"}
                </TableCell>
                <TableCell className="print:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const studentResults = unified.filter(res => res.studentId === r.studentId);
                      printStudentReport({
                        studentName: r.studentName,
                        studentId: r.studentId,
                        results: studentResults,
                      });
                    }}
                    title="Print student report"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Student Detail Dialog */}
      {selectedStudent && (
        <StudentDetailDialog
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          studentName={selectedStudent.name}
          studentId={selectedStudent.id}
          results={unified
            .filter(r => r.studentId === selectedStudent.id)
            .map(r => ({
              id: r.id,
              courseName: r.courseName,
              title: r.title,
              type: r.type,
              score: r.score,
              totalMark: r.totalMark,
              percentage: r.percentage,
              date: r.date,
            }))}
        />
      )}
    </AdminLayout>
  );
};

export default AdminResults;
