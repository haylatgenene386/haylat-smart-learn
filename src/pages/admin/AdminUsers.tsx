import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Shield, ShieldCheck, GraduationCap, Building2,
  Trash2, Ban, RotateCcw, KeyRound, MoreHorizontal, Eye, EyeOff,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type UserWithRole = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  grade: number | null;
  role: string;
  branch_id: string | null;
  branch_name: string | null;
  account_status: string;
  is_deleted: boolean;
  is_suspended: boolean;
};

const roleIcons: Record<string, typeof Shield> = {
  super_admin: ShieldCheck,
  admin: Shield,
  instructor: GraduationCap,
  student: GraduationCap,
};

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  admin: "secondary",
  instructor: "secondary",
  student: "outline",
};

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "delete" | "suspend" | "restore" | "reset" | "unsuspend";
    user: UserWithRole;
  } | null>(null);
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: branchData } = await supabase.from("branches").select("id, name");

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) ?? []);
      const branchMap = new Map(branchData?.map((b) => [b.id, b.name]) ?? []);

      return (profiles ?? []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        grade: p.grade,
        role: (roleMap.get(p.user_id) as string) ?? "student",
        branch_id: p.branch_id,
        branch_name: p.branch_id ? branchMap.get(p.branch_id) ?? null : null,
        account_status: p.account_status,
        is_deleted: (p as any).is_deleted ?? false,
        is_suspended: (p as any).is_suspended ?? false,
      })) as UserWithRole[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as any })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateBranch = useMutation({
    mutationFn: async ({ userId, branchId }: { userId: string; branchId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ branch_id: branchId })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Branch updated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const softDelete = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), account_status: "deleted" } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User soft-deleted");
      setConfirmDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const restoreUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_deleted: false, deleted_at: null, account_status: "active" } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User restored");
      setConfirmDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const suspendUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: true, suspended_at: new Date().toISOString(), account_status: "suspended" } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User suspended");
      setConfirmDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unsuspendUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: false, suspended_at: null, account_status: "active" } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User unsuspended");
      setConfirmDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPermissions = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "student" as any })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Permissions reset to student");
      setConfirmDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.user_id.includes(search);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchBranch = filterBranch === "all" || (filterBranch === "none" ? !u.branch_id : u.branch_id === filterBranch);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && !u.is_deleted && !u.is_suspended) ||
      (filterStatus === "suspended" && u.is_suspended) ||
      (filterStatus === "deleted" && u.is_deleted);
    return matchSearch && matchRole && matchBranch && matchStatus;
  });

  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    const uid = confirmDialog.user.user_id;
    switch (confirmDialog.type) {
      case "delete": softDelete.mutate(uid); break;
      case "restore": restoreUser.mutate(uid); break;
      case "suspend": suspendUser.mutate(uid); break;
      case "unsuspend": unsuspendUser.mutate(uid); break;
      case "reset": resetPermissions.mutate(uid); break;
    }
  };

  const dialogConfig: Record<string, { title: string; description: string; variant: "default" | "destructive" }> = {
    delete: { title: "Soft Delete User", description: "This will mark the user as deleted. They won't be able to access the platform, but their data will be preserved. You can restore them later.", variant: "destructive" },
    suspend: { title: "Suspend User", description: "This will suspend the user's account. They won't be able to log in until unsuspended.", variant: "destructive" },
    restore: { title: "Restore User", description: "This will restore the user's account and allow them to access the platform again.", variant: "default" },
    unsuspend: { title: "Unsuspend User", description: "This will reactivate the user's account.", variant: "default" },
    reset: { title: "Reset Permissions", description: "This will reset the user's role back to 'student'. They will lose all elevated permissions.", variant: "destructive" },
  };

  const getStatusBadge = (u: UserWithRole) => {
    if (u.is_deleted) return <Badge variant="destructive" className="text-xs">Deleted</Badge>;
    if (u.is_suspended) return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Suspended</Badge>;
    if (u.account_status === "pending") return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    return <Badge variant="outline" className="text-xs text-green-700 border-green-300 dark:text-green-400">Active</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">User Management</h2>
            <p className="text-sm text-muted-foreground">{users.length} total users · {users.filter(u => u.is_deleted).length} deleted · {users.filter(u => u.is_suspended).length} suspended</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Filter branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="none">No Branch</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User list */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No users found</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((u) => {
                const Icon = roleIcons[u.role] ?? GraduationCap;
                return (
                  <div key={u.user_id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${u.is_deleted ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${u.is_suspended ? "bg-orange-100 dark:bg-orange-900/30" : u.is_deleted ? "bg-destructive/10" : "bg-primary/10"}`}>
                        <Icon className={`h-4 w-4 ${u.is_suspended ? "text-orange-600" : u.is_deleted ? "text-destructive" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.grade ? `Grade ${u.grade}` : "No grade"} · Joined {new Date(u.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(u)}

                      {/* Branch badge / selector */}
                      {isSuperAdmin && !u.is_deleted ? (
                        <Select
                          value={u.branch_id ?? "none"}
                          onValueChange={(val) => updateBranch.mutate({ userId: u.user_id, branchId: val === "none" ? null : val })}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <Building2 className="mr-1 h-3 w-3" /><SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Branch</SelectItem>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="mr-1 h-3 w-3" />{u.branch_name || "No Branch"}
                        </Badge>
                      )}

                      <Badge variant={roleBadgeVariant[u.role] ?? "outline"} className="capitalize">
                        {u.role.replace("_", " ")}
                      </Badge>

                      {isSuperAdmin && !u.is_deleted && (
                        <Select value={u.role} onValueChange={(val) => updateRole.mutate({ userId: u.user_id, newRole: val })}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="instructor">Instructor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {/* Actions menu - Super Admin only */}
                      {isSuperAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {u.is_deleted ? (
                              <DropdownMenuItem onClick={() => setConfirmDialog({ type: "restore", user: u })}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Restore User
                              </DropdownMenuItem>
                            ) : (
                              <>
                                {u.is_suspended ? (
                                  <DropdownMenuItem onClick={() => setConfirmDialog({ type: "unsuspend", user: u })}>
                                    <Eye className="mr-2 h-4 w-4" /> Unsuspend
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setConfirmDialog({ type: "suspend", user: u })}>
                                    <Ban className="mr-2 h-4 w-4" /> Suspend Account
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setConfirmDialog({ type: "reset", user: u })}>
                                  <KeyRound className="mr-2 h-4 w-4" /> Reset Permissions
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setConfirmDialog({ type: "delete", user: u })}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Soft Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog && dialogConfig[confirmDialog.type]?.variant === "destructive" && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              {confirmDialog && dialogConfig[confirmDialog.type]?.title}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog && dialogConfig[confirmDialog.type]?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium">{confirmDialog?.user.full_name || "Unnamed"}</p>
            <p className="text-xs text-muted-foreground capitalize">{confirmDialog?.user.role.replace("_", " ")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              variant={confirmDialog && dialogConfig[confirmDialog.type]?.variant === "destructive" ? "destructive" : "default"}
              onClick={handleConfirmAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
