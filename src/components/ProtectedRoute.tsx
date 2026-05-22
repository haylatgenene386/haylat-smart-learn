import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: React.ReactNode;
  requiredRole?: "admin" | "super_admin" | "instructor";
}

const ADMIN_ROLES = ["admin", "super_admin", "global_super_admin", "branch_super_admin", "branch_admin"];
const SUPER_ADMIN_ROLES = ["super_admin", "global_super_admin"];

const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole === "super_admin" && !SUPER_ADMIN_ROLES.includes(role ?? "")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === "admin" && !ADMIN_ROLES.includes(role ?? "") && role !== "instructor") {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === "instructor" && role !== "instructor" && !ADMIN_ROLES.includes(role ?? "")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
