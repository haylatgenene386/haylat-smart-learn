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
import { useQuery } from "@tanstack/react-query";
import { Download, Trophy, Medal, Award, Monitor, Printer } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface StudentRanking {
  rank: number;
  studentId: string;
  studentName: string;
  totalScore: number;
  totalPossible: number;
  percentage: number;
  examCount: number;
  quizCount: number;
  courseCount: number;
}

const AdminLeaderboard = () => {
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [topCount, setTopCount] = useState(10);
  const [billboardOpen, setBillboardOpen] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["courses-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, student_id");
      return data ?? [];
    },
  });

  const { data: examResults } = useQuery({
    queryKey: ["exam-results-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_attempts")
        .select("student_id, score, total_marks, percentage, exams(course_id)")
        .eq("status", "submitted");
      return data ?? [];
    },
  });

  const { data: quizResults } = useQuery({
    queryKey: ["quiz-results-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_results")
        .select("user_id, score, total, lesson_id, lessons(course_id)");
      return data ?? [];
    },
  });

  const rankings: StudentRanking[] = useMemo(() => {
    const studentStats: Record<string, {
      studentId: string;
      studentName: string;
      totalScore: number;
      totalPossible: number;
      examCount: number;
      quizCount: number;
      courses: Set<string>;
    }> = {};

    const profileMap = new Map(profiles?.map(p => [p.user_id, { name: p.full_name, studentId: (p as any).student_id }]) ?? []);

    // Process exam results
    examResults?.forEach((e: any) => {
      const courseId = e.exams?.course_id;
      if (courseFilter !== "all" && courseId !== courseFilter) return;
      if (typeFilter === "Quiz") return;

      const userId = e.student_id;
      if (!studentStats[userId]) {
        const profile = profileMap.get(userId);
        studentStats[userId] = {
          studentId: profile?.studentId ?? userId,
          studentName: profile?.name ?? "Unknown",
          totalScore: 0,
          totalPossible: 0,
          examCount: 0,
          quizCount: 0,
          courses: new Set(),
        };
      }
      studentStats[userId].totalScore += e.score ?? 0;
      studentStats[userId].totalPossible += e.total_marks ?? 0;
      studentStats[userId].examCount++;
      if (courseId) studentStats[userId].courses.add(courseId);
    });

    // Process quiz results
    quizResults?.forEach((q: any) => {
      const courseId = (q as any).lessons?.course_id;
      if (courseFilter !== "all" && courseId !== courseFilter) return;
      if (typeFilter === "Exam") return;

      const userId = q.user_id;
      if (!studentStats[userId]) {
        const profile = profileMap.get(userId);
        studentStats[userId] = {
          studentId: profile?.studentId ?? userId,
          studentName: profile?.name ?? "Unknown",
          totalScore: 0,
          totalPossible: 0,
          examCount: 0,
          quizCount: 0,
          courses: new Set(),
        };
      }
      studentStats[userId].totalScore += q.score ?? 0;
      studentStats[userId].totalPossible += q.total ?? 0;
      studentStats[userId].quizCount++;
      if (courseId) studentStats[userId].courses.add(courseId);
    });

    // Convert to array and calculate percentages
    let results = Object.values(studentStats)
      .filter(s => s.totalPossible > 0)
      .map(s => ({
        ...s,
        percentage: Math.round((s.totalScore / s.totalPossible) * 100),
        courseCount: s.courses.size,
      }))
      .sort((a, b) => b.percentage - a.percentage || b.totalScore - a.totalScore);

    // Apply search filter
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(r => 
        r.studentName.toLowerCase().includes(s) || 
        r.studentId.toLowerCase().includes(s)
      );
    }

    // Add ranks
    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [examResults, quizResults, profiles, courseFilter, typeFilter, search]);

  const topStudents = rankings.slice(0, topCount);

  const exportExcel = () => {
    const header = "Rank\tStudent ID\tStudent Name\tTotal Score\tMax Possible\tPercentage\tExams\tQuizzes\tCourses\n";
    const rows = rankings.map(r =>
      `${r.rank}\t${r.studentId}\t${r.studentName}\t${r.totalScore}\t${r.totalPossible}\t${r.percentage}%\t${r.examCount}\t${r.quizCount}\t${r.courseCount}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-leaderboard.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  const printBillboard = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Top Scorers Billboard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%); min-height: 100vh; padding: 40px; color: white; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 36px; font-weight: bold; color: #fbbf24; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
          .title { font-size: 48px; font-weight: bold; margin-top: 10px; text-transform: uppercase; letter-spacing: 4px; }
          .subtitle { font-size: 18px; color: #c4b5fd; margin-top: 10px; }
          .podium { display: flex; justify-content: center; align-items: flex-end; gap: 20px; margin-bottom: 50px; }
          .podium-item { text-align: center; padding: 20px; border-radius: 12px; }
          .podium-item.gold { background: linear-gradient(135deg, #fbbf24, #f59e0b); order: 2; min-height: 200px; }
          .podium-item.silver { background: linear-gradient(135deg, #9ca3af, #6b7280); order: 1; min-height: 160px; }
          .podium-item.bronze { background: linear-gradient(135deg, #d97706, #b45309); order: 3; min-height: 140px; }
          .podium-rank { font-size: 48px; font-weight: bold; }
          .podium-name { font-size: 20px; font-weight: 600; margin: 10px 0; }
          .podium-score { font-size: 28px; font-weight: bold; }
          .podium-id { font-size: 12px; opacity: 0.8; }
          .list { max-width: 800px; margin: 0 auto; }
          .list-item { display: flex; align-items: center; padding: 15px 20px; background: rgba(255,255,255,0.1); border-radius: 10px; margin-bottom: 10px; }
          .list-rank { width: 50px; font-size: 24px; font-weight: bold; color: #fbbf24; }
          .list-info { flex: 1; }
          .list-name { font-size: 18px; font-weight: 600; }
          .list-id { font-size: 12px; color: #c4b5fd; }
          .list-score { font-size: 24px; font-weight: bold; color: #34d399; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏆 Haylat_EdTech</div>
          <div class="title">Top Scorers</div>
          <div class="subtitle">${courseFilter !== "all" ? courses?.find(c => c.id === courseFilter)?.title : "All Courses"} • ${typeFilter === "all" ? "Exams & Quizzes" : typeFilter + "s"}</div>
        </div>

        ${topStudents.length >= 3 ? `
          <div class="podium">
            <div class="podium-item silver">
              <div class="podium-rank">🥈</div>
              <div class="podium-name">${topStudents[1]?.studentName}</div>
              <div class="podium-id">${topStudents[1]?.studentId}</div>
              <div class="podium-score">${topStudents[1]?.percentage}%</div>
            </div>
            <div class="podium-item gold">
              <div class="podium-rank">🥇</div>
              <div class="podium-name">${topStudents[0]?.studentName}</div>
              <div class="podium-id">${topStudents[0]?.studentId}</div>
              <div class="podium-score">${topStudents[0]?.percentage}%</div>
            </div>
            <div class="podium-item bronze">
              <div class="podium-rank">🥉</div>
              <div class="podium-name">${topStudents[2]?.studentName}</div>
              <div class="podium-id">${topStudents[2]?.studentId}</div>
              <div class="podium-score">${topStudents[2]?.percentage}%</div>
            </div>
          </div>
        ` : ''}

        <div class="list">
          ${topStudents.slice(3).map(s => `
            <div class="list-item">
              <div class="list-rank">#${s.rank}</div>
              <div class="list-info">
                <div class="list-name">${s.studentName}</div>
                <div class="list-id">${s.studentId}</div>
              </div>
              <div class="list-score">${s.percentage}%</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-mono">#{rank}</span>;
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Student Leaderboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Unique students ranked by overall performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setBillboardOpen(true)}>
              <Monitor className="h-4 w-4 mr-1" /> Billboard View
            </Button>
            <Button variant="outline" onClick={printBillboard}>
              <Printer className="h-4 w-4 mr-1" /> Print Billboard
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <Download className="h-4 w-4 mr-1" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">{rankings.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Medal className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold">
                {rankings.length ? Math.round(rankings.reduce((a, b) => a + b.percentage, 0) / rankings.length) : 0}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Top Performer</p>
              <p className="text-lg font-bold truncate">{rankings[0]?.studentName ?? "—"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input 
          placeholder="Search student name or ID..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="max-w-xs" 
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Exam">Exams Only</SelectItem>
            <SelectItem value="Quiz">Quizzes Only</SelectItem>
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
        <Select value={topCount.toString()} onValueChange={(v) => setTopCount(parseInt(v))}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Top 5</SelectItem>
            <SelectItem value="10">Top 10</SelectItem>
            <SelectItem value="20">Top 20</SelectItem>
            <SelectItem value="50">Top 50</SelectItem>
            <SelectItem value="100">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{rankings.length} unique students found</p>

      {/* Rankings Table */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Total Score</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Exams</TableHead>
              <TableHead>Quizzes</TableHead>
              <TableHead>Courses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            ) : rankings.slice(0, topCount).map((r) => (
              <TableRow key={r.studentId} className={r.rank <= 3 ? "bg-primary/5" : ""}>
                <TableCell className="font-medium">
                  <div className="flex items-center justify-center w-8 h-8">
                    {getRankIcon(r.rank)}
                  </div>
                </TableCell>
                <TableCell className="font-mono font-medium">{r.studentId}</TableCell>
                <TableCell className="font-medium">{r.studentName}</TableCell>
                <TableCell>{r.totalScore}/{r.totalPossible}</TableCell>
                <TableCell>
                  <Badge variant={r.percentage >= 80 ? "default" : r.percentage >= 50 ? "secondary" : "destructive"}>
                    {r.percentage}%
                  </Badge>
                </TableCell>
                <TableCell>{r.examCount}</TableCell>
                <TableCell>{r.quizCount}</TableCell>
                <TableCell>{r.courseCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Billboard Dialog */}
      <Dialog open={billboardOpen} onOpenChange={setBillboardOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 text-white p-8 min-h-[600px]">
            <div className="text-center mb-8">
              <div className="text-3xl font-bold text-yellow-400 mb-2">🏆 Haylat_EdTech</div>
              <h2 className="text-4xl font-bold uppercase tracking-wider">Top Scorers</h2>
              <p className="text-indigo-300 mt-2">
                {courseFilter !== "all" ? courses?.find(c => c.id === courseFilter)?.title : "All Courses"}
              </p>
            </div>

            {topStudents.length >= 3 && (
              <div className="flex justify-center items-end gap-4 mb-8">
                {/* Silver */}
                <div className="text-center p-6 rounded-xl bg-gradient-to-b from-gray-400 to-gray-500 min-h-[160px] w-[180px]">
                  <div className="text-4xl mb-2">🥈</div>
                  <div className="font-bold text-lg">{topStudents[1]?.studentName}</div>
                  <div className="text-xs opacity-80">{topStudents[1]?.studentId}</div>
                  <div className="text-2xl font-bold mt-2">{topStudents[1]?.percentage}%</div>
                </div>
                {/* Gold */}
                <div className="text-center p-6 rounded-xl bg-gradient-to-b from-yellow-400 to-yellow-600 min-h-[200px] w-[200px]">
                  <div className="text-5xl mb-2">🥇</div>
                  <div className="font-bold text-xl">{topStudents[0]?.studentName}</div>
                  <div className="text-xs opacity-80">{topStudents[0]?.studentId}</div>
                  <div className="text-3xl font-bold mt-2">{topStudents[0]?.percentage}%</div>
                </div>
                {/* Bronze */}
                <div className="text-center p-6 rounded-xl bg-gradient-to-b from-amber-600 to-amber-700 min-h-[140px] w-[180px]">
                  <div className="text-4xl mb-2">🥉</div>
                  <div className="font-bold text-lg">{topStudents[2]?.studentName}</div>
                  <div className="text-xs opacity-80">{topStudents[2]?.studentId}</div>
                  <div className="text-2xl font-bold mt-2">{topStudents[2]?.percentage}%</div>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {topStudents.slice(3, 10).map(s => (
                <div key={s.studentId} className="flex items-center p-3 bg-white/10 rounded-lg">
                  <span className="w-12 text-xl font-bold text-yellow-400">#{s.rank}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{s.studentName}</div>
                    <div className="text-xs text-indigo-300">{s.studentId}</div>
                  </div>
                  <span className="text-2xl font-bold text-green-400">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminLeaderboard;
