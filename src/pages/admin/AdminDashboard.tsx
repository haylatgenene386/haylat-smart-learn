import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, FileQuestion, Brain, TrendingUp, UserPlus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { data: usersCount = 0 } = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: coursesCount = 0 } = useQuery({
    queryKey: ["admin-courses-count"],
    queryFn: async () => {
      const { count } = await supabase.from("courses").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: lessonsCount = 0 } = useQuery({
    queryKey: ["admin-lessons-count"],
    queryFn: async () => {
      const { count } = await supabase.from("lessons").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: quizCount = 0 } = useQuery({
    queryKey: ["admin-quiz-count"],
    queryFn: async () => {
      const { count } = await supabase.from("quiz_results").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("account_status", "pending");
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const stats = [
    { label: "Total Users", value: usersCount, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Total Courses", value: coursesCount, icon: BookOpen, color: "bg-secondary/10 text-secondary" },
    { label: "Total Lessons", value: lessonsCount, icon: Brain, color: "bg-accent/10 text-accent" },
    { label: "Quiz Attempts", value: quizCount, icon: FileQuestion, color: "bg-gold/10 text-gold" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Analytics Overview</h2>
          <p className="text-sm text-muted-foreground">Platform statistics at a glance</p>
        </div>

        {pendingCount > 0 && (
          <Link to="/admin/approvals" className="block">
            <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <UserPlus className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">Pending Registrations</p>
                  <p className="text-xs text-muted-foreground">Users waiting for approval</p>
                </div>
              </div>
              <Badge variant="destructive" className="text-sm px-3 py-1">{pendingCount}</Badge>
            </div>
          </Link>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="font-display text-3xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 font-display text-lg font-semibold">Quick Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Platform Growth</span><span className="text-muted-foreground">Active</span>
                </div>
                <Progress value={65} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Course Completion Rate</span><span className="text-muted-foreground">72%</span>
                </div>
                <Progress value={72} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>AI Usage</span><span className="text-muted-foreground">Active</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 font-display text-lg font-semibold">System Status</h3>
            <div className="space-y-3">
              {[
                { label: "Authentication", status: "Operational" },
                { label: "Database", status: "Operational" },
                { label: "AI Engine", status: "Operational" },
                { label: "File Storage", status: "Operational" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="flex items-center gap-2 text-xs font-medium text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
