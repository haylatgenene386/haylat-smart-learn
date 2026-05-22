import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BookOpen, FileUp, Sparkles, FolderOpen } from "lucide-react";

interface AssignedCourse {
  id: string;
  course_id: string;
  course_title: string;
  course_description: string | null;
  is_published: boolean;
  assigned_at: string;
  material_count: number;
  question_count: number;
}

const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<AssignedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAssignments = async () => {
      setLoading(true);
      // Get instructor's course assignments
      const { data: assignments } = await supabase
        .from("instructor_courses")
        .select("id, course_id, assigned_at")
        .eq("instructor_id", user.id);

      if (!assignments || assignments.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      const courseIds = assignments.map((a) => a.course_id);

      // Fetch course details
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title, description, is_published")
        .in("id", courseIds);

      // Fetch material counts
      const { data: materials } = await supabase
        .from("materials")
        .select("id, course_id")
        .in("course_id", courseIds);

      // Fetch question counts
      const { data: questions } = await supabase
        .from("questions")
        .select("id, lesson_id")
        .eq("submitted_by", user.id);

      const result: AssignedCourse[] = assignments.map((a) => {
        const course = coursesData?.find((c) => c.id === a.course_id);
        return {
          id: a.id,
          course_id: a.course_id,
          course_title: course?.title ?? "Unknown Course",
          course_description: course?.description ?? null,
          is_published: course?.is_published ?? false,
          assigned_at: a.assigned_at,
          material_count: materials?.filter((m) => m.course_id === a.course_id).length ?? 0,
          question_count: questions?.length ?? 0,
        };
      });

      setCourses(result);
      setLoading(false);
    };
    fetchAssignments();
  }, [user]);

  const stats = [
    { label: "Assigned Courses", value: courses.length, icon: BookOpen, color: "text-primary" },
    { label: "Total Materials", value: courses.reduce((s, c) => s + c.material_count, 0), icon: FileUp, color: "text-accent-foreground" },
    { label: "Questions Created", value: courses.reduce((s, c) => s + c.question_count, 0), icon: Sparkles, color: "text-muted-foreground" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Instructor Dashboard</h2>
          <p className="text-muted-foreground">Manage your assigned courses, materials, and AI questions.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? "—" : s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Courses */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Your Courses</h3>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">No courses assigned yet.</p>
                <p className="text-sm text-muted-foreground/70">
                  Once a Super Admin assigns you to a course, it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Card key={course.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base leading-tight">{course.course_title}</CardTitle>
                      <Badge variant={course.is_published ? "default" : "secondary"}>
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    {course.course_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{course.course_description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileUp className="h-3.5 w-3.5" /> {course.material_count} materials
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/instructor/courses/${course.course_id}/materials`)}
                      >
                        <FileUp className="mr-1.5 h-3.5 w-3.5" /> Materials
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate("/admin/ai-questions")}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Questions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default InstructorDashboard;
