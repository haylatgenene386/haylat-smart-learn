import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBranch } from "@/hooks/useBranch";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Users, BookOpen, Settings, Brain, FileQuestion,
  GraduationCap, ChevronLeft, ChevronRight, LogOut, Menu, X, FileUp, ClipboardList, Sparkles, BarChart3, Trophy, UserCheck, CheckSquare, MessageCircle, Building2, UserPlus, Info, Mail,
} from "lucide-react";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, role, isInstructor, isSuperAdmin, isAdmin } = useAuth();
  const { currentBranch, branches, switchBranch, isGlobalRole } = useBranch();
  const { t } = useLanguage();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-approvals-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("account_status", "pending");
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Define nav items with role-based visibility
  const allNavItems = [
    { to: "/admin", label: t("admin.dashboard"), icon: LayoutDashboard, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"] },
    { to: "/instructor", label: "My Courses", icon: LayoutDashboard, roles: ["instructor"] },
    { to: "/admin/branches", label: "Branches", icon: Building2, roles: ["super_admin", "global_super_admin"] },
    { to: "/admin/approvals", label: "Approvals", icon: UserPlus, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"], badge: pendingCount },
    { to: "/admin/users", label: t("admin.users"), icon: Users, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"] },
    { to: "/admin/instructors", label: "Instructors", icon: UserCheck, roles: ["super_admin", "global_super_admin"] },
    { to: "/admin/courses", label: t("admin.courses"), icon: BookOpen, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"] },
    { to: "/admin/materials", label: t("admin.materials"), icon: FileUp, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin", "instructor"] },
    { to: "/admin/exams", label: t("admin.exams"), icon: ClipboardList, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"] },
    { to: "/admin/results", label: t("admin.results") || "Results", icon: BarChart3, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"] },
    { to: "/admin/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"] },
    { to: "/admin/question-bank", label: "Question Bank", icon: FileQuestion, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"] },
    { to: "/admin/ai-questions", label: t("admin.ai_questions"), icon: Sparkles, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin", "instructor"] },
    { to: "/instructor/questions", label: "My Questions", icon: FileQuestion, roles: ["instructor"] },
    { to: "/admin/question-approval", label: "Question Approval", icon: CheckSquare, roles: ["super_admin", "global_super_admin"] },
    { to: "/admin/ai", label: t("admin.ai_control"), icon: Brain, roles: ["admin", "super_admin", "global_super_admin"] },
    { to: "/admin/quizzes", label: t("admin.quizzes"), icon: FileQuestion, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"] },
    { to: "/admin/settings", label: t("admin.settings"), icon: Settings, roles: ["super_admin", "global_super_admin"] },
    { to: "/admin/about-us", label: "About Us", icon: Info, roles: ["super_admin", "global_super_admin"] },
    { to: "/admin/email-logs", label: "Email Logs", icon: Mail, roles: ["super_admin", "global_super_admin"] },
    { to: "/messages", label: "Messages", icon: MessageCircle, roles: ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin", "instructor"] },
  ];

  const navItems = allNavItems.filter(item => role && item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        mobile ? "fixed inset-y-0 left-0 z-50 w-64" : collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <GraduationCap className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {(!collapsed || mobile) && (
          <span className="font-display text-sm font-bold">Haylat_EdTech</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => mobile && setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(!collapsed || mobile) && (
                <span className="flex-1">{item.label}</span>
              )}
              {(!collapsed || mobile) && (item as any).badge > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]">
                  {(item as any).badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {(!collapsed || mobile) && (
          <div className="mb-2 rounded-lg bg-sidebar-accent/30 px-3 py-2">
            <p className="truncate text-xs font-medium">{user?.email}</p>
            <p className="text-xs capitalize text-sidebar-foreground/60">{role?.replace("_", " ")}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || mobile) && <span>{t("admin.sign_out")}</span>}
        </button>
      </div>

      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden md:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold">
            {navItems.find((n) => n.to === location.pathname)?.label ?? "Admin"}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            {isGlobalRole && branches.length > 0 && (
              <Select
                value={currentBranch?.id ?? "all"}
                onValueChange={switchBranch}
              >
                <SelectTrigger className="w-[200px] h-9">
                  <Building2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {currentBranch && !isGlobalRole && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {currentBranch.name}
              </span>
            )}
            <Link to="/dashboard">
              <Button variant="outline" size="sm">{t("admin.student_view")}</Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
