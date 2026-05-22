import Layout from "@/components/Layout";
import { BarChart3, BookOpen, Brain, Target, TrendingUp, Clock, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const stats = [
  { label: "Lessons Completed", value: "24", icon: BookOpen, change: "+3 this week" },
  { label: "Quiz Accuracy", value: "78%", icon: Target, change: "+5% improvement" },
  { label: "AI Sessions", value: "12", icon: Brain, change: "3 today" },
  { label: "Study Hours", value: "18h", icon: Clock, change: "2.5h avg/day" },
];

const topics = [
  { name: "Biology", progress: 85, grade: "A" },
  { name: "Chemistry", progress: 62, grade: "B" },
  { name: "Physics", progress: 45, grade: "C+" },
  { name: "English", progress: 30, grade: "C" },
  { name: "History", progress: 70, grade: "B+" },
];

const recentActivity = [
  { action: "Completed Quiz", topic: "Cell Biology", score: "8/10", time: "2h ago" },
  { action: "AI Tutor Session", topic: "Chemical Reactions", score: "", time: "5h ago" },
  { action: "Completed Lesson", topic: "Newton's Laws", score: "", time: "1d ago" },
  { action: "Completed Quiz", topic: "Ethiopian History", score: "7/10", time: "2d ago" },
];

const Dashboard = () => {
  const { user, isInstructor, isAdmin } = useAuth();
  const { grade, profile } = useProfile();
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? user?.user_metadata?.full_name ?? null);
    }
  }, [profile, user]);

  const roleLabel = isAdmin ? "Admin" : isInstructor ? "Instructor" : "Student";
  const displayName = fullName || "there";

  return (
  <Layout>
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Welcome back, {roleLabel} {displayName} 👋</h1>
        <p className="mt-1 text-muted-foreground">
          {grade && !isAdmin ? `Grade ${grade} — ` : ""}Here's your learning progress this week
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold">{s.value}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-primary">
              <TrendingUp className="h-3 w-3" /> {s.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Topic Mastery */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-5 font-display text-lg font-semibold">Topic Mastery</h2>
          <div className="space-y-4">
            {topics.map((t) => (
              <div key={t.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground">{t.progress}%</span>
                </div>
                <Progress value={t.progress} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-5 font-display text-lg font-semibold">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.topic}</p>
                </div>
                <div className="text-right">
                  {a.score && <p className="text-sm font-semibold text-primary">{a.score}</p>}
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/lessons"><Button variant="hero" className="gap-2"><BookOpen className="h-4 w-4" /> Continue Lesson</Button></Link>
        <Link to="/quiz"><Button variant="gold" className="gap-2"><Target className="h-4 w-4" /> Take a Quiz</Button></Link>
        <Link to="/ai-tutor"><Button variant="outline" className="gap-2"><Brain className="h-4 w-4" /> Ask AI Tutor</Button></Link>
        <Link to="/exams"><Button variant="outline" className="gap-2"><ClipboardList className="h-4 w-4" /> Take Exam</Button></Link>
      </div>
    </div>
  </Layout>
  );
};

export default Dashboard;
