import { useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Award, BookOpen, Printer } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { printStudentReport } from "./StudentReportPrint";

interface StudentResult {
  id: string;
  courseName: string;
  title: string;
  type: "Exam" | "Quiz";
  score: number;
  totalMark: number;
  percentage: number;
  date: string;
}

interface StudentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentId: string;
  results: StudentResult[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

const StudentDetailDialog = ({
  open,
  onOpenChange,
  studentName,
  studentId,
  results,
}: StudentDetailDialogProps) => {
  const stats = useMemo(() => {
    if (!results.length) return { avg: 0, highest: 0, lowest: 0, total: 0, exams: 0, quizzes: 0 };
    const pcts = results.map(r => r.percentage);
    return {
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      highest: Math.max(...pcts),
      lowest: Math.min(...pcts),
      total: results.length,
      exams: results.filter(r => r.type === "Exam").length,
      quizzes: results.filter(r => r.type === "Quiz").length,
    };
  }, [results]);

  const performanceTrend = useMemo(() => {
    return results
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-15)
      .map(r => ({
        date: r.date ? format(new Date(r.date), "MMM dd") : "",
        percentage: r.percentage,
        title: r.title.slice(0, 20),
      }));
  }, [results]);

  const coursePerformance = useMemo(() => {
    const byCourse: Record<string, { sum: number; count: number }> = {};
    results.forEach(r => {
      if (!byCourse[r.courseName]) byCourse[r.courseName] = { sum: 0, count: 0 };
      byCourse[r.courseName].sum += r.percentage;
      byCourse[r.courseName].count++;
    });
    return Object.entries(byCourse).map(([course, v]) => ({
      course: course.length > 15 ? course.slice(0, 15) + "..." : course,
      avg: Math.round(v.sum / v.count),
    }));
  }, [results]);

  const typeDistribution = useMemo(() => [
    { name: "Exams", value: stats.exams },
    { name: "Quizzes", value: stats.quizzes },
  ], [stats]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <span className="text-lg font-bold text-primary">
                  {studentName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold">{studentName}</p>
                <p className="text-xs text-muted-foreground font-mono">{studentId}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => printStudentReport({ studentName, studentId, results })}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:grid-cols-4 mt-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-xl font-bold">{stats.avg}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Best</p>
                <p className="text-xl font-bold">{stats.highest}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Lowest</p>
                <p className="text-xl font-bold">{stats.lowest}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Attempts</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        {results.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            {/* Performance Trend */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Performance Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => [`${value}%`, "Score"]}
                  />
                  <Line type="monotone" dataKey="percentage" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Course Performance */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Average by Course</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={coursePerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="course" type="category" tick={{ fontSize: 10 }} width={80} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="avg" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Type Distribution Pie */}
        {results.length > 0 && (
          <Card className="p-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Exam vs Quiz Distribution</h3>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {typeDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Recent Results Table */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-3">Recent Results</h3>
          <div className="rounded-lg border border-border max-h-[250px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-sm">{r.courseName}</TableCell>
                    <TableCell>
                      <Badge variant={r.type === "Exam" ? "default" : "secondary"} className="text-xs">
                        {r.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={r.percentage >= 50 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {r.score}/{r.totalMark} ({r.percentage}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.date ? format(new Date(r.date), "MMM dd, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailDialog;
