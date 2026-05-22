import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  User, Camera, Save, Lock, BookOpen, Trophy, Clock, GraduationCap, Briefcase, Shield,
  Activity, ClipboardList, Bell, TrendingUp, CheckCircle, XCircle, AlertCircle,
} from "lucide-react";

interface RecentActivityItem {
  action: string;
  detail: string;
  time: string;
  icon: "quiz" | "exam" | "lesson";
}

interface ExamResultItem {
  title: string;
  score: number | null;
  percentage: number | null;
  status: string;
  date: string;
  passed: boolean;
}

interface TopicMastery {
  name: string;
  progress: number;
  quizzes: number;
}

const Profile = () => {
  const { user, role, isAdmin, isInstructor } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    gender: "",
    date_of_birth: "",
  });

  // Stats
  const [stats, setStats] = useState({ quizCount: 0, examCount: 0, avgScore: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [examResults, setExamResults] = useState<ExamResultItem[]>([]);
  const [topicMastery, setTopicMastery] = useState<TopicMastery[]>([]);
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, pendingApprovals: 0, activeExams: 0, totalCourses: 0 });
  const [instructorStats, setInstructorStats] = useState({ totalQuestions: 0, totalMaterials: 0, assignedCourses: 0 });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone_number: (profile as any).phone_number || "",
        gender: (profile as any).gender || "",
        date_of_birth: (profile as any).date_of_birth || "",
      });
    }
  }, [profile]);

  // Fetch all dashboard data
  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      // Common: quiz & exam stats
      const [quizRes, examRes] = await Promise.all([
        supabase.from("quiz_results").select("score, total, topic, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("exam_attempts").select("exam_id, percentage, score, total_marks, status, created_at").eq("student_id", user.id).order("created_at", { ascending: false }),
      ]);

      const quizData = quizRes.data || [];
      const examData = examRes.data || [];
      const quizCount = quizData.length;
      const examCount = examData.filter(e => e.status === "completed").length;
      const allScores = [
        ...quizData.map((q) => (q.total > 0 ? (q.score / q.total) * 100 : 0)),
        ...examData.filter(e => e.status === "completed").map((e) => Number(e.percentage) || 0),
      ];
      const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
      setStats({ quizCount, examCount, avgScore });

      // Recent Activity
      const activities: RecentActivityItem[] = [];
      quizData.slice(0, 5).forEach(q => {
        activities.push({
          action: "Completed Quiz",
          detail: q.topic || "General",
          time: formatTimeAgo(q.created_at),
          icon: "quiz",
        });
      });
      examData.slice(0, 5).forEach(e => {
        activities.push({
          action: e.status === "completed" ? "Completed Exam" : "Started Exam",
          detail: `Score: ${e.score ?? "—"}/${e.total_marks ?? "—"}`,
          time: formatTimeAgo(e.created_at),
          icon: "exam",
        });
      });
      activities.sort((a, b) => 0); // already sorted by time from queries
      setRecentActivity(activities.slice(0, 8));

      // Exam Results
      if (examData.length > 0) {
        // Fetch exam titles
        const examIds = [...new Set(examData.map(e => e.exam_id))];
        const { data: exams } = await supabase.from("exams").select("id, title, pass_percentage").in("id", examIds);
        const examMap = new Map((exams || []).map(e => [e.id, e]));

        setExamResults(examData.filter(e => e.status === "completed").slice(0, 5).map(e => {
          const exam = examMap.get(e.exam_id);
          return {
            title: exam?.title || "Exam",
            score: e.score,
            percentage: Number(e.percentage) || 0,
            status: e.status,
            date: new Date(e.created_at).toLocaleDateString(),
            passed: (Number(e.percentage) || 0) >= (exam?.pass_percentage || 50),
          };
        }));
      }

      // Topic Mastery from quiz results
      const topicMap = new Map<string, { totalScore: number; totalPossible: number; count: number }>();
      quizData.forEach(q => {
        const topic = q.topic || "General";
        const existing = topicMap.get(topic) || { totalScore: 0, totalPossible: 0, count: 0 };
        existing.totalScore += q.score;
        existing.totalPossible += q.total;
        existing.count += 1;
        topicMap.set(topic, existing);
      });
      setTopicMastery(
        Array.from(topicMap.entries())
          .map(([name, data]) => ({
            name,
            progress: data.totalPossible > 0 ? Math.round((data.totalScore / data.totalPossible) * 100) : 0,
            quizzes: data.count,
          }))
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 6)
      );

      // Admin-specific stats
      if (isAdmin) {
        const [usersRes, pendingRes, examsActiveRes, coursesRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "pending"),
          supabase.from("exams").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("courses").select("id", { count: "exact", head: true }),
        ]);
        setAdminStats({
          totalUsers: usersRes.count || 0,
          pendingApprovals: pendingRes.count || 0,
          activeExams: examsActiveRes.count || 0,
          totalCourses: coursesRes.count || 0,
        });
      }

      // Instructor-specific stats
      if (isInstructor) {
        const [questionsRes, materialsRes, coursesRes] = await Promise.all([
          supabase.from("questions").select("id", { count: "exact", head: true }).eq("submitted_by", user.id),
          supabase.from("materials").select("id", { count: "exact", head: true }).eq("uploaded_by", user.id),
          supabase.from("instructor_courses").select("id", { count: "exact", head: true }).eq("instructor_id", user.id),
        ]);
        setInstructorStats({
          totalQuestions: questionsRes.count || 0,
          totalMaterials: materialsRes.count || 0,
          assignedCourses: coursesRes.count || 0,
        });
      }
    };

    fetchDashboardData();
  }, [user, isAdmin, isInstructor]);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone_number: form.phone_number,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      setEditing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("platform-assets")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("platform-assets").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl } as any).eq("user_id", user.id);
    toast({ title: "Photo updated" });
    setUploading(false);
    window.location.reload();
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent", description: "Check your inbox for the reset link." });
    }
  };

  if (profileLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const statusColor: Record<string, string> = {
    approved: "bg-green-500/10 text-green-600",
    pending: "bg-yellow-500/10 text-yellow-600",
    blocked: "bg-destructive/10 text-destructive",
  };

  const initials = (form.full_name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const activityIcon = (type: string) => {
    switch (type) {
      case "quiz": return <BookOpen className="h-4 w-4 text-primary" />;
      case "exam": return <ClipboardList className="h-4 w-4 text-accent-foreground" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="container max-w-5xl py-8 space-y-6">
        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className="h-24 bg-hero-gradient" />
          <CardContent className="relative pt-0 pb-6 px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={(profile as any)?.avatar_url} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">{form.full_name || "Unnamed User"}</h1>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize">{role || "student"}</Badge>
                  <Badge className={statusColor[(profile as any)?.account_status || "pending"] || statusColor.pending}>
                    {(profile as any)?.account_status || "pending"}
                  </Badge>
                  {profile?.grade && <Badge variant="outline">Grade {profile.grade}</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                {!editing ? (
                  <Button onClick={() => setEditing(true)} size="sm">
                    <User className="h-4 w-4 mr-1" /> Edit Profile
                  </Button>
                ) : (
                  <Button onClick={handleSave} size="sm" disabled={saving}>
                    <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleChangePassword}>
                  <Lock className="h-4 w-4 mr-1" /> Change Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isAdmin ? (
            <>
              <StatCard icon={<User className="h-4 w-4 text-primary" />} label="Total Users" value={adminStats.totalUsers} />
              <StatCard icon={<AlertCircle className="h-4 w-4 text-yellow-500" />} label="Pending Approvals" value={adminStats.pendingApprovals} />
              <StatCard icon={<ClipboardList className="h-4 w-4 text-primary" />} label="Active Exams" value={adminStats.activeExams} />
              <StatCard icon={<BookOpen className="h-4 w-4 text-primary" />} label="Total Courses" value={adminStats.totalCourses} />
            </>
          ) : isInstructor ? (
            <>
              <StatCard icon={<BookOpen className="h-4 w-4 text-primary" />} label="Assigned Courses" value={instructorStats.assignedCourses} />
              <StatCard icon={<ClipboardList className="h-4 w-4 text-primary" />} label="Questions Created" value={instructorStats.totalQuestions} />
              <StatCard icon={<Briefcase className="h-4 w-4 text-primary" />} label="Materials Uploaded" value={instructorStats.totalMaterials} />
              <StatCard icon={<Trophy className="h-4 w-4 text-primary" />} label="Avg Score" value={`${stats.avgScore}%`} />
            </>
          ) : (
            <>
              <StatCard icon={<BookOpen className="h-4 w-4 text-primary" />} label="Quizzes Taken" value={stats.quizCount} />
              <StatCard icon={<ClipboardList className="h-4 w-4 text-primary" />} label="Exams Completed" value={stats.examCount} />
              <StatCard icon={<Trophy className="h-4 w-4 text-primary" />} label="Avg Score" value={`${stats.avgScore}%`} />
              <StatCard icon={<TrendingUp className="h-4 w-4 text-primary" />} label="Topics Studied" value={topicMastery.length} />
            </>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column: Info + Dashboard Widgets */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      disabled={!editing}
                      placeholder="+251 9XX XXX XXX"
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={form.gender}
                      onValueChange={(v) => setForm({ ...form, gender: v })}
                      disabled={!editing}
                    >
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role-specific section */}
            {role === "student" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" /> Academic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Grade Level</Label>
                      <Input value={profile?.grade ? `Grade ${profile.grade}` : "N/A"} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Student ID</Label>
                      <Input value={(profile as any)?.student_id || "Pending"} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Branch / Campus</Label>
                      <Input value={profile?.branch_id || "Not assigned"} disabled className="bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isInstructor && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" /> Instructor Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Manage your teaching assignments and materials from the{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/instructor")}>
                      Instructor Dashboard
                    </Button>.
                  </p>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Admin Tools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Manage users, branches, and platform settings from the{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/admin")}>
                      Admin Dashboard
                    </Button>.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Topic Mastery / Progress Overview */}
            {topicMastery.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Topic Mastery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topicMastery.map((t) => (
                    <div key={t.name}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted-foreground">{t.progress}% · {t.quizzes} quiz{t.quizzes !== 1 ? "zes" : ""}</span>
                      </div>
                      <Progress value={t.progress} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Exam Results */}
            {examResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" /> Recent Exam Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {examResults.map((e, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          {e.passed ? (
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{e.title}</p>
                            <p className="text-xs text-muted-foreground">{e.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{e.percentage}%</p>
                          <p className="text-xs text-muted-foreground">{e.score}/{Math.round((e.score || 0) / ((e.percentage || 1) / 100))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          {activityIcon(a.icon)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">{a.action}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                          <p className="text-xs text-muted-foreground">{a.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(profile as any)?.account_status === "pending" && (
                    <div className="flex items-start gap-3 rounded-lg bg-yellow-500/10 p-3">
                      <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-700">Account Pending</p>
                        <p className="text-xs text-yellow-600">Your account is awaiting admin approval.</p>
                      </div>
                    </div>
                  )}
                  {stats.avgScore > 0 && stats.avgScore < 50 && (
                    <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3">
                      <TrendingUp className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Score Alert</p>
                        <p className="text-xs text-muted-foreground">Your average score is below 50%. Consider revisiting lessons and retaking quizzes.</p>
                      </div>
                    </div>
                  )}
                  {stats.avgScore >= 80 && (
                    <div className="flex items-start gap-3 rounded-lg bg-green-500/10 p-3">
                      <Trophy className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Great Performance!</p>
                        <p className="text-xs text-muted-foreground">You're averaging {stats.avgScore}% — keep it up!</p>
                      </div>
                    </div>
                  )}
                  {isAdmin && adminStats.pendingApprovals > 0 && (
                    <div className="flex items-start gap-3 rounded-lg bg-primary/10 p-3">
                      <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{adminStats.pendingApprovals} Pending Approval{adminStats.pendingApprovals > 1 ? "s" : ""}</p>
                        <p className="text-xs text-muted-foreground">Students are waiting for account approval.</p>
                      </div>
                    </div>
                  )}
                  {(profile as any)?.account_status === "approved" && stats.avgScore >= 50 && stats.avgScore < 80 && !isAdmin && (
                    <p className="text-sm text-muted-foreground">No new notifications.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="capitalize">{role || "student"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{(profile as any)?.account_status || "pending"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default Profile;
